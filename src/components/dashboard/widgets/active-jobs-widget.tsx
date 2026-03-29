'use client'

import { useMissionControl } from '@/store'

function elapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem}s`
}

const STATUS_STYLES = {
  running: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  completed: 'bg-green-500/15 text-green-400 border-green-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const STATUS_DOT = {
  running: 'bg-blue-400 animate-pulse',
  pending: 'bg-amber-400',
  completed: 'bg-green-400',
  failed: 'bg-red-400',
}

export function ActiveJobsWidget() {
  const { spawnRequests } = useMissionControl()
  const now = Date.now()

  // Show active (running/pending) + last 5 recent ones
  const active = spawnRequests.filter(r => r.status === 'running' || r.status === 'pending')
  const recent = spawnRequests
    .filter(r => r.status === 'completed' || r.status === 'failed')
    .slice(0, 5)

  const all = [...active, ...recent]

  if (all.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Active Jobs</h3>
          <span className="text-xs text-muted-foreground">0 running</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground/40 text-sm">
          No active jobs
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Active Jobs</h3>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {active.length} running
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {all.map(job => {
          const runtime = job.completedAt
            ? elapsed(job.completedAt - job.createdAt)
            : elapsed(now - job.createdAt)
          const style = STATUS_STYLES[job.status] || STATUS_STYLES.pending
          const dot = STATUS_DOT[job.status] || STATUS_DOT.pending

          return (
            <div key={job.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 border border-border/50">
              <div className="flex-shrink-0 mt-1">
                <span className={`w-2 h-2 rounded-full block ${dot}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground truncate max-w-[200px]" title={job.label || job.task}>
                    {job.label || job.task.slice(0, 50) + (job.task.length > 50 ? '…' : '')}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${style}`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground font-mono">{job.model?.split('/').pop() || 'unknown'}</span>
                  <span className="text-[10px] text-muted-foreground/50">·</span>
                  <span className="text-[10px] text-muted-foreground/70">{runtime}</span>
                </div>
                {job.status === 'failed' && job.error && (
                  <p className="text-[10px] text-red-400 mt-0.5 truncate">{job.error.slice(0, 80)}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
