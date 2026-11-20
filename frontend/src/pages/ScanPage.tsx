import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PipelineRail3D from '@/3d/PipelineRail3D'
import { GlassCard } from '@/components/common/GlassCard'
import { NeonButton } from '@/components/common/NeonButton'
import { usePipelineStore } from '@/store/pipelineStore'
import { useProjectStore } from '@/store/projectStore'
import { useSSE } from '@/hooks/useSSE'
import { getFindings } from '@/api/projects'

export default function ScanPage() {
  const currentScan = useProjectStore((s) => s.currentScan)
  const findings = useProjectStore((s) => s.findings)
  const { status, logs, detectorProgress } = usePipelineStore()

  // Subscribe to SSE stream
  useSSE(currentScan?.job_id || 'job-001')

  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const scanId = currentScan?.id || (currentScan as any)?.scan_id

  // Fetch actual findings from the backend API when scan is active/complete
  useEffect(() => {
    if (scanId) {
      getFindings(scanId)
        .then((data) => {
          if (data && data.findings) {
            useProjectStore.getState().setFindings(data.findings)
          }
        })
        .catch(console.error)
    }
  }, [scanId, status])

  const detectors = [
    { id: 'ruff', label: 'Ruff Linter', lang: 'Python' },
    { id: 'bandit', label: 'Bandit Security', lang: 'Python' },
    { id: 'pytest', label: 'Pytest Suite', lang: 'Python' },
    { id: 'llm', label: 'AI Reasoning Core', lang: 'Heuristics' },
  ] as const

  const criticalCount = findings.filter((f) => f.severity === 'Critical').length
  const highCount = findings.filter((f) => f.severity === 'High').length
  const mediumCount = findings.filter((f) => f.severity === 'Medium').length
  const lowCount = findings.filter((f) => f.severity === 'Low').length

  const isComplete = status === 'FINDINGS_READY' || findings.length > 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top 3D Pipeline progress rail */}
      <PipelineRail3D currentStatus={status} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Live Execution Logs & Detector Status Cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Signal Source Detectors Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {detectors.map((det) => {
              const prog = detectorProgress[det.id]
              return (
                <div
                  key={det.id}
                  className={`p-3 rounded-glass border transition-all ${
                    prog?.done
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/[0.02] border-white/[0.06] text-text-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase mb-1">
                    <span>{det.lang}</span>
                    {prog?.done && <span>✓ Done</span>}
                  </div>
                  <div className="text-xs font-bold text-white truncate">{det.label}</div>
                  <div className="text-[11px] font-mono mt-1 opacity-80">
                    {prog?.done ? `${prog.findingCount} findings (${prog.elapsedMs}ms)` : 'Active...'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Real-time Streaming Terminal */}
          <GlassCard className="p-4 flex flex-col h-[400px]" glowColor="none">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-xs font-mono">
              <span className="text-text-muted">Orchestrator Terminal Stream:</span>
              <span className="flex items-center gap-1.5 text-cyan">
                <span className="w-2 h-2 rounded-full bg-cyan animate-ping" />
                Listening to SSE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-2">
              {logs.length === 0 ? (
                <div className="text-text-muted py-8 text-center">
                  Waiting for initial telemetry logs...
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-text-muted shrink-0">[{log.timestamp}]</span>
                    <span
                      className={`
                        ${log.level === 'error' ? 'text-red-400' : ''}
                        ${log.level === 'warn' ? 'text-amber-400' : ''}
                        ${log.level === 'success' ? 'text-emerald-400' : ''}
                        ${log.level === 'info' ? 'text-text-primary' : ''}
                      `}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </GlassCard>
        </div>

        {/* Right 1/3: Real-time Discovery Metrics & CTA */}
        <div className="space-y-4">
          <GlassCard className="p-6 text-center space-y-4" glowColor="cyan">
            <h3 className="text-xs font-mono uppercase text-text-muted tracking-wider">
              Findings Normalized
            </h3>
            <div className="text-5xl font-extrabold text-cyan font-mono">
              {findings.length}
            </div>
            <p className="text-xs text-text-secondary">
              Triangulated from static linters, sandbox test exceptions, and strict AI validation.
            </p>

            <div className="space-y-2 pt-2 border-t border-white/[0.06] text-left font-mono text-xs">
              <div className="flex justify-between text-red-400">
                <span>Critical:</span>
                <span>{criticalCount}</span>
              </div>
              <div className="flex justify-between text-orange-400">
                <span>High:</span>
                <span>{highCount}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Medium:</span>
                <span>{mediumCount}</span>
              </div>
              <div className="flex justify-between text-cyan">
                <span>Low:</span>
                <span>{lowCount}</span>
              </div>
            </div>

            <div className="pt-4">
              <Link to="/findings">
                <NeonButton
                  variant="cyan"
                  className="w-full justify-center"
                  disabled={!isComplete}
                >
                  {isComplete ? 'Review Findings & Explanations →' : 'Scanning Codebase...'}
                </NeonButton>
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
