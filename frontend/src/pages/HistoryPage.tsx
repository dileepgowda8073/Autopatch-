import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/common/GlassCard'
import { SeverityBadge } from '@/components/common/SeverityBadge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useProjectStore } from '@/store/projectStore'
import { getHistory } from '@/api/projects'
import { HistoryEntry, DecisionType } from '@/types'
import { MOCK_HISTORY } from '@/mock/data'

export default function HistoryPage() {
  const currentProject = useProjectStore((s) => s.currentProject)
  const history = useProjectStore((s) => s.history)
  const setHistory = useProjectStore((s) => s.setHistory)

  useEffect(() => {
    async function loadLiveHistory() {
      try {
        const projectId = currentProject?.id || 'latest'
        const entries = await getHistory(projectId)
        if (entries && Array.isArray(entries)) {
          setHistory(entries)
        }
      } catch (err) {
        console.warn('Could not load live history:', err)
      }
    }
    loadLiveHistory()
  }, [currentProject?.id, setHistory])

  const [filter, setFilter] = useState<DecisionType | 'all'>('all')

  const filteredHistory = history.filter(
    (item) => filter === 'all' || item.decision === filter
  )

  const decisionBadgeStyles: Record<DecisionType, string> = {
    accept: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    reject: 'bg-red-500/10 text-red-400 border-red-500/30',
    needs_review: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
    rollback: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient-cyan-violet font-mono uppercase tracking-wide">
            Persistent Change History
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-1">
            Immutable SQLite audit trail: findings, diffs, test evidence, decisions, and timestamps
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-glass bg-white/[0.02] border border-white/[0.06] text-xs font-mono">
          {(['all', 'accept', 'reject', 'needs_review', 'rollback'] as const).map((dec) => (
            <button
              key={dec}
              onClick={() => setFilter(dec)}
              className={`px-2.5 py-1 rounded transition-colors uppercase text-[11px] cursor-pointer ${
                filter === dec
                  ? 'bg-cyan/20 text-cyan font-bold border border-cyan/40'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {dec}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline items */}
      {filteredHistory.length === 0 ? (
        <GlassCard className="p-12 text-center text-text-muted" glowColor="none">
          No audit history entries found matching this decision filter.
        </GlassCard>
      ) : (
        <div className="relative border-l border-white/[0.08] ml-4 pl-6 space-y-6">
          {filteredHistory.map((entry: HistoryEntry, idx: number) => (
            <div key={`${entry.patch_id}-${idx}`} className="relative group">
              {/* Timeline Node Orb */}
              <div className="absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full bg-cyan border-2 border-[#05060A] shadow-[0_0_8px_#00F5FF]" />

              <GlassCard className="p-5 space-y-3" glowColor="cyan">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={entry.severity} />
                    <span
                      className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono uppercase font-bold tracking-wider ${
                        decisionBadgeStyles[entry.decision]
                      }`}
                    >
                      {entry.decision}
                    </span>
                    <span className="text-xs font-mono text-text-muted">
                      Attempt {entry.attempt}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-text-muted">
                    {new Date(entry.decided_at).toLocaleString()}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white font-mono">
                  {entry.finding_title}
                </h3>

                {/* Evidence phase tags */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.04]">
                  <span className="text-xs font-mono text-text-muted">Validation Evidence:</span>
                  <StatusBadge status={entry.overall_test_status} size="sm" />

                  <div className="flex gap-1.5 ml-auto">
                    {entry.phases.map((ph) => (
                      <span
                        key={ph.phase}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          ph.status === 'verified'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {ph.phase}: {ph.status}
                      </span>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
