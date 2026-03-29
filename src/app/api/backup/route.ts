import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getDatabase, logAuditEvent } from '@/lib/db'
import { config, ensureDirExists } from '@/lib/config'
import { join, dirname } from 'path'
import { readdirSync, statSync, unlinkSync } from 'fs'
import { heavyLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { runOpenClaw } from '@/lib/command'

const BACKUP_DIR = join(dirname(config.dbPath), 'backups')
const MAX_BACKUPS = 10

/**
 * GET /api/backup - List existing backups (admin only)
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'admin')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  ensureDirExists(BACKUP_DIR)

  try {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db') || f.endsWith('.tar.gz'))
      .map(f => {
        const stat = statSync(join(BACKUP_DIR, f))
        return {
          name: f,
          size: stat.size,
          created_at: Math.floor(stat.mtimeMs / 1000),
        }
      })
      .sort((a, b) => b.created_at - a.created_at)

    return NextResponse.json({ backups: files, dir: BACKUP_DIR })
  } catch {
    return NextResponse.json({ backups: [], dir: BACKUP_DIR })
  }
}

/**
 * POST /api/backup - Create a new backup (admin only)
 */
export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'admin')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = heavyLimiter(request)
  if (rateCheck) return rateCheck

  const target = request.nextUrl.searchParams.get('target')

  // Full system backup — OpenClaw + MC + all services
  if (target === 'gateway') {
    ensureDirExists(BACKUP_DIR)
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    try {
      const { execSync } = await import('child_process')
      const { homedir } = await import('os')
      const scriptPath = join(homedir(), 'full-backup.sh')
      const stdout = execSync(`bash "${scriptPath}" "${BACKUP_DIR}"`, {
        encoding: 'utf8',
        timeout: 300000, // 5 min max
        env: {
          ...process.env,
          HOME: homedir(),
          PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
        },
      }).trim()

      logAuditEvent({
        action: 'full.backup',
        actor: auth.user.username,
        actor_id: auth.user.id,
        detail: { output: stdout },
        ip_address: ipAddress,
      })

      return NextResponse.json({ success: true, output: stdout })
    } catch (error: any) {
      const out = (error.stdout || '') + (error.stderr || '') || error.message
      logger.error({ err: error }, 'Full backup failed')
      return NextResponse.json({ error: `Backup failed: ${out.slice(0, 200)}` }, { status: 500 })
    }
  }

  // Google Drive backup: create archive then upload via gog CLI
  if (target === 'drive') {
    ensureDirExists(BACKUP_DIR)
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    try {
      // Step 1: Create full backup first
      const { execSync: execSyncDrive } = await import('child_process')
      const { homedir: getHome } = await import('os')
      const home = getHome()
      let archivePath = ''
      try {
        const scriptPath = join(home, 'full-backup.sh')
        execSyncDrive(`bash "${scriptPath}" "${BACKUP_DIR}"`, {
          encoding: 'utf8',
          timeout: 300000,
          env: { ...process.env, HOME: home, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}` },
        })
        archivePath = execSyncDrive(`ls -t "${BACKUP_DIR}"/full-backup-*.tar.gz 2>/dev/null | head -1`, { encoding: 'utf8' }).trim()
      } catch (err: any) {
        // Fallback: find newest archive
        archivePath = execSyncDrive(`ls -t "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | head -1`, { encoding: 'utf8' }).trim()
        if (!archivePath) {
          return NextResponse.json({ error: `Backup creation failed: ${err.message}` }, { status: 500 })
        }
      }

      if (!archivePath) {
        return NextResponse.json({ error: 'No backup archive found to upload' }, { status: 500 })
      }

      // Step 2: Upload to Google Drive via gog CLI
      const gogBin = '/opt/homebrew/bin/gog'
      const driveFolderId = '15EAnqa_wI34VeweXw-Dh7HXt30NC1qlY' // "OpenClaw Backups" folder
      const uploadOutput = execSyncDrive(
        `"${gogBin}" drive upload "${archivePath}" --parent ${driveFolderId} --account bellaclaw@gmail.com --json 2>&1`,
        {
          encoding: 'utf8',
          timeout: 120000,
          env: {
            ...process.env,
            PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
          },
        }
      ).trim()

      const filename = archivePath.split('/').pop() || 'backup'

      // Rotate: keep max 7 backups on Drive, delete oldest
      try {
        const listOut = execSyncDrive(
          `"${gogBin}" drive ls --parent ${driveFolderId} --json 2>&1`,
          { encoding: 'utf8', timeout: 15000, env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}` } }
        )
        const listData = JSON.parse(listOut)
        const files = (listData.files || listData || [])
          .filter((f: any) => f.name?.includes('backup'))
          .sort((a: any, b: any) => (a.createdTime || a.name || '').localeCompare(b.createdTime || b.name || ''))
        
        const MAX_DRIVE_BACKUPS = 7
        if (files.length > MAX_DRIVE_BACKUPS) {
          const toDelete = files.slice(0, files.length - MAX_DRIVE_BACKUPS)
          for (const old of toDelete) {
            try {
              execSyncDrive(
                `"${gogBin}" drive delete "${old.id}" --force 2>&1`,
                { encoding: 'utf8', timeout: 10000, env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}` } }
              )
            } catch { /* best effort */ }
          }
        }
      } catch { /* rotation is best-effort */ }

      // Also rotate local backups — keep max 7
      try {
        const localFiles = readdirSync(BACKUP_DIR)
          .filter(f => f.endsWith('.tar.gz'))
          .map(f => ({ name: f, mtime: statSync(join(BACKUP_DIR, f)).mtimeMs }))
          .sort((a, b) => a.mtime - b.mtime)
        if (localFiles.length > 7) {
          for (const old of localFiles.slice(0, localFiles.length - 7)) {
            try { unlinkSync(join(BACKUP_DIR, old.name)) } catch { /* best effort */ }
          }
        }
      } catch { /* best effort */ }

      logAuditEvent({
        action: 'openclaw.backup.drive',
        actor: auth.user.username,
        actor_id: auth.user.id,
        detail: { filename, uploadOutput },
        ip_address: ipAddress,
      })

      return NextResponse.json({ success: true, message: `Backup "${filename}" uploaded to Google Drive`, filename, output: uploadOutput })
    } catch (error: any) {
      logger.error({ err: error }, 'Google Drive backup failed')
      return NextResponse.json({ error: `Drive backup failed: ${error.message}` }, { status: 500 })
    }
  }

  // Default: MC SQLite backup
  ensureDirExists(BACKUP_DIR)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const backupPath = join(BACKUP_DIR, `mc-backup-${timestamp}.db`)

  try {
    const db = getDatabase()
    await db.backup(backupPath)

    const stat = statSync(backupPath)

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    logAuditEvent({
      action: 'backup_create',
      actor: auth.user.username,
      actor_id: auth.user.id,
      detail: { path: backupPath, size: stat.size },
      ip_address: ipAddress,
    })

    // Prune old backups beyond MAX_BACKUPS
    pruneOldBackups()

    return NextResponse.json({
      success: true,
      backup: {
        name: `mc-backup-${timestamp}.db`,
        size: stat.size,
        created_at: Math.floor(stat.mtimeMs / 1000),
      },
    })
  } catch (error: any) {
    logger.error({ err: error }, 'Backup failed')
    return NextResponse.json({ error: `Backup failed: ${error.message}` }, { status: 500 })
  }
}

/**
 * DELETE /api/backup?name=<filename> - Delete a specific backup (admin only)
 */
export async function DELETE(request: NextRequest) {
  const auth = requireRole(request, 'admin')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Request body required' }, { status: 400 }) }
  const name = body.name

  if (!name || !name.endsWith('.db') || name.includes('/') || name.includes('..')) {
    return NextResponse.json({ error: 'Invalid backup name' }, { status: 400 })
  }

  try {
    const fullPath = join(BACKUP_DIR, name)
    unlinkSync(fullPath)

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    logAuditEvent({
      action: 'backup_delete',
      actor: auth.user.username,
      actor_id: auth.user.id,
      detail: { name },
      ip_address: ipAddress,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
  }
}

function pruneOldBackups() {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('mc-backup-') && f.endsWith('.db'))
      .map(f => ({ name: f, mtime: statSync(join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)

    for (const file of files.slice(MAX_BACKUPS)) {
      unlinkSync(join(BACKUP_DIR, file.name))
    }
  } catch {
    // Best-effort pruning
  }
}
