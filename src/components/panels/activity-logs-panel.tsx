'use client'

import { useState } from 'react'
import { ActivityFeedPanel } from './activity-feed-panel'
import { LogViewerPanel } from './log-viewer-panel'

export function ActivityLogsPanel() {
  const [tab, setTab] = useState<'activity' | 'logs'>('activity')

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border px-4 pt-3 flex-shrink-0">
        <button
          onClick={() => setTab('activity')}
          className={`px-4 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
            tab === 'activity'
              ? 'bg-card text-foreground border border-border border-b-card -mb-px'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
            tab === 'logs'
              ? 'bg-card text-foreground border border-border border-b-card -mb-px'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Logs
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 min-h-0">
        {tab === 'activity' ? <ActivityFeedPanel /> : <LogViewerPanel />}
      </div>
    </div>
  )
}
