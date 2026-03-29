'use client'

import { useState } from 'react'
import { StatRow, formatBytes, type DashboardData } from '../widget-primitives'

export function MaintenanceWidget({ data }: { data: DashboardData }) {
  const { dbStats } = data
  const [localRunning, setLocalRunning] = useState(false)
  const [driveRunning, setDriveRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const runBackup = async (target: 'gateway' | 'drive') => {
    const setter = target === 'drive' ? setDriveRunning : setLocalRunning
    setter(true)
    setStatus(null)
    setProgress(0)

    // Simulate progress — drive uploads are large so pulse between 80-95 while waiting
    const steps = target === 'drive' ? [5, 15, 30, 45, 60, 75, 80] : [10, 25, 45, 65, 80, 90]
    let pulseDir = 1
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = steps.find(s => s > prev)
        if (next) return next
        // Pulse between 80-95 to show it's still working
        if (prev >= 95) pulseDir = -1
        if (prev <= 80) pulseDir = 1
        return prev + pulseDir
      })
    }, target === 'drive' ? 3000 : 800)

    try {
      const res = await fetch(`/api/backup?target=${target}`, { method: 'POST' })
      const d = await res.json()
      clearInterval(interval)
      setProgress(100)
      if (res.ok) {
        setStatus({ ok: true, msg: target === 'drive' ? 'Uploaded to Drive ✓' : d.output?.slice(0, 60) || 'Backup created ✓' })
      } else {
        setStatus({ ok: false, msg: d.error?.slice(0, 80) || 'Failed' })
      }
    } catch {
      clearInterval(interval)
      setStatus({ ok: false, msg: 'Network error' })
    }
    setTimeout(() => { setter(false); setProgress(0) }, 1500)
    setTimeout(() => setStatus(null), 5000)
  }

  return (
    <div className="panel">
      <div className="panel-header"><h3 className="text-sm font-semibold">Maintenance + Backup</h3></div>
      <div className="panel-body space-y-3">
        {dbStats?.backup ? (
          <>
            <StatRow label="Latest backup" value={dbStats.backup.age_hours < 1 ? '<1h ago' : `${dbStats.backup.age_hours}h ago`} alert={dbStats.backup.age_hours > 24} />
            <StatRow label="Backup size" value={formatBytes(dbStats.backup.size)} />
          </>
        ) : (
          <StatRow label="Latest backup" value="None" alert />
        )}
        <StatRow label="Active pipelines" value={dbStats?.pipelines.active ?? 0} />
        <StatRow label="Pipeline runs (24h)" value={dbStats?.pipelines.recentDay ?? 0} />

        {/* Backup buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => runBackup('gateway')}
            disabled={localRunning || driveRunning}
            className="flex-1 relative overflow-hidden py-1.5 text-[11px] font-medium rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 disabled:cursor-not-allowed transition-colors"
          >
            {localRunning && (
              <div
                className="absolute inset-y-0 left-0 bg-blue-500/20 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            )}
            <span className="relative z-10">
              {localRunning ? `${progress}% Backing up...` : '💾 Local Backup'}
            </span>
          </button>
          <button
            onClick={() => runBackup('drive')}
            disabled={driveRunning || localRunning}
            className="flex-1 relative overflow-hidden py-1.5 text-[11px] font-medium rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 disabled:cursor-not-allowed transition-colors"
          >
            {driveRunning && (
              <div
                className="absolute inset-y-0 left-0 bg-green-500/20 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            )}
            <span className="relative z-10">
              {driveRunning ? (progress >= 80 ? `Uploading 733MB...` : `${progress}% Creating...`) : '☁️ Drive Backup'}
            </span>
          </button>
        </div>
        {status && (
          <p className={`text-[10px] ${status.ok ? 'text-green-400' : 'text-red-400'}`}>{status.msg}</p>
        )}
      </div>
    </div>
  )
}
