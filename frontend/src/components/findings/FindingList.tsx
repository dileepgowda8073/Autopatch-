import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Finding, Severity, SourceTool, SEVERITY_ORDER } from '@/types'
import { FindingCard } from './FindingCard'
import { SkeletonLoader } from '../common/SkeletonLoader'

export interface FindingListProps {
  findings: Finding[]
  isLoading?: boolean
  selectedId?: string | null
  onSelectFinding: (finding: Finding) => void
}

export const FindingList: React.FC<FindingListProps> = ({
  findings,
  isLoading = false,
  selectedId = null,
  onSelectFinding,
}) => {
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All')
  const [sourceFilter, setSourceFilter] = useState<SourceTool | 'All'>('All')

  const filteredFindings = useMemo(() => {
    return findings
      .filter((f) => severityFilter === 'All' || f.severity === severityFilter)
      .filter((f) => sourceFilter === 'All' || f.source === sourceFilter)
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  }, [findings, severityFilter, sourceFilter])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="finding" />
        <SkeletonLoader variant="finding" />
        <SkeletonLoader variant="finding" />
      </div>
    )
  }

  const severities: (Severity | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low']
  const sources: (SourceTool | 'All')[] = ['All', 'ruff', 'bandit', 'pytest', 'llm']

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-glass bg-white/[0.02] border border-white/[0.06]">
        {/* Severity filter pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-text-muted mr-1">Severity:</span>
          {severities.map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`
                px-2.5 py-1 rounded-full transition-all cursor-pointer
                ${
                  severityFilter === sev
                    ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-[0_0_10px_rgba(0,245,255,0.2)]'
                    : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
                }
              `}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-text-muted mr-1">Signal:</span>
          {sources.map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`
                px-2.5 py-1 rounded-full transition-all cursor-pointer uppercase text-[10px]
                ${
                  sourceFilter === src
                    ? 'bg-violet/20 text-violet-300 border border-violet/40 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                    : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
                }
              `}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Findings items */}
      {filteredFindings.length === 0 ? (
        <div className="p-12 text-center border border-white/[0.06] rounded-glass bg-white/[0.01]">
          <div className="text-3xl mb-2">🎉</div>
          <p className="text-text-primary font-medium text-sm">No findings matched your criteria</p>
          <p className="text-text-muted text-xs font-mono mt-1">
            Try resetting the severity or signal filters.
          </p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filteredFindings.map((finding, idx) => (
              <motion.div
                key={finding.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
              >
                <FindingCard
                  finding={finding}
                  isSelected={finding.id === selectedId}
                  onClick={() => onSelectFinding(finding)}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
