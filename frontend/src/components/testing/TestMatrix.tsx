import React, { useState } from 'react'
import { ValidationResult, TestRunResult, TestPhase } from '@/types'
import { StatusBadge } from '../common/StatusBadge'
import { GlassCard } from '../common/GlassCard'

export interface TestMatrixProps {
  validation: ValidationResult | null
  isLoading?: boolean
}

export const TestMatrix: React.FC<TestMatrixProps> = ({
  validation,
  isLoading = false,
}) => {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)

  if (isLoading) {
    return (
      <GlassCard className="p-8 text-center space-y-4" glowColor="cyan">
        <div className="w-10 h-10 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-mono text-cyan">
          Executing isolated test matrix inside Docker sandbox...
        </p>
        <p className="text-xs text-text-muted">
          Evaluating 4 phases: original suite, targeted regression, boundary cases, full project.
        </p>
      </GlassCard>
    )
  }

  if (!validation) {
    return (
      <GlassCard className="p-8 text-center" glowColor="none">
        <p className="text-text-secondary text-sm">
          No validation runs executed for this patch yet. Click &quot;Run Validation&quot; to test in the disposable sandbox.
        </p>
      </GlassCard>
    )
  }

  const phaseLabels: Record<TestPhase, string> = {
    before: 'Phase 1: Pre-patch Baseline (Existing Tests)',
    targeted: 'Phase 2: Generated Targeted Test (Specific Bug)',
    edge: 'Phase 3: Boundary & Edge-case Matrix',
    after: 'Phase 4: Post-patch Regression Suite (Full)',
  }

  const overallBannerConfig = {
    verified: {
      bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
      icon: '✓',
      title: 'Patch Verified Cleanly',
      desc: 'All 4 testing phases succeeded with 0 regression or assertion failures in sandbox.',
    },
    failed: {
      bg: 'bg-red-500/15 border-red-500/40 text-red-400',
      icon: '✗',
      title: 'Validation Failed',
      desc: 'Patch generated test assertion errors. Automatic retry feedback is available.',
    },
    not_verified: {
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
      icon: '⚠',
      title: 'Not Verified',
      desc: 'Execution blocked (exit code 5: no tests collected, compile failure, or timeout).',
    },
  }[validation.overall_status]

  return (
    <div className="space-y-6">
      {/* Overall Status Banner */}
      <div
        className={`p-5 rounded-glass border flex items-start gap-4 shadow-xl ${overallBannerConfig.bg}`}
      >
        <span className="text-2xl font-bold">{overallBannerConfig.icon}</span>
        <div>
          <h3 className="text-base font-bold tracking-wide uppercase font-mono">
            {overallBannerConfig.title}
          </h3>
          <p className="text-sm opacity-90 mt-0.5">{overallBannerConfig.desc}</p>
        </div>
      </div>

      {/* Test Matrix Table */}
      <div className="rounded-glass overflow-hidden border border-white/[0.08] bg-[#0A0B10]">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-[#0F1117] border-b border-white/[0.06] text-text-muted">
              <th className="py-3 px-4 font-semibold uppercase">Phase</th>
              <th className="py-3 px-3 font-semibold uppercase">Passed</th>
              <th className="py-3 px-3 font-semibold uppercase">Failed</th>
              <th className="py-3 px-4 font-semibold uppercase">Status</th>
              <th className="py-3 px-4 font-semibold uppercase">Duration</th>
              <th className="py-3 px-4 font-semibold uppercase text-right">Raw Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {validation.phases.map((run: TestRunResult) => (
              <React.Fragment key={run.phase}>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-medium text-text-primary">
                    {phaseLabels[run.phase]}
                  </td>
                  <td className="py-3.5 px-3 text-emerald-400 font-semibold">{run.passed}</td>
                  <td className="py-3.5 px-3 text-red-400 font-semibold">{run.failed}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={run.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary">{run.duration_ms} ms</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() =>
                        setExpandedPhase(expandedPhase === run.phase ? null : run.phase)
                      }
                      className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.1] text-cyan border border-white/[0.08] transition-colors cursor-pointer"
                    >
                      {expandedPhase === run.phase ? 'Hide Log' : 'View Log'}
                    </button>
                  </td>
                </tr>

                {/* Expanded Raw Output Accordion */}
                {expandedPhase === run.phase && (
                  <tr>
                    <td colSpan={6} className="p-4 bg-black/60 border-t border-b border-cyan/20">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-text-muted">
                          <span>Exit code: {run.exit_code}</span>
                          {run.reason && (
                            <span className="text-amber-400 font-semibold">
                              Reason: {run.reason}
                            </span>
                          )}
                        </div>
                        <pre className="p-3 rounded bg-[#05060A] border border-white/[0.06] text-[11px] text-text-secondary overflow-x-auto max-h-60">
                          {run.raw_output || 'No output streams captured.'}
                        </pre>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
