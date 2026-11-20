import React, { useEffect } from 'react'
import HealthCharts3D from '@/3d/HealthCharts3D'
import { GlassCard } from '@/components/common/GlassCard'
import { useProjectStore } from '@/store/projectStore'
import { getHealth } from '@/api/projects'
import { MOCK_HEALTH } from '@/mock/data'

export default function HealthPage() {
  const currentProject = useProjectStore((s) => s.currentProject)
  const health = useProjectStore((s) => s.health) || MOCK_HEALTH
  const setHealth = useProjectStore((s) => s.setHealth)

  useEffect(() => {
    async function loadLiveHealth() {
      try {
        const projectId = currentProject?.id || 'latest'
        const liveHealth = await getHealth(projectId)
        if (liveHealth) {
          setHealth(liveHealth)
        }
      } catch (err) {
        console.warn('Could not load live health:', err)
      }
    }
    loadLiveHealth()
  }, [currentProject?.id, setHealth])

  const metricCards = [
    {
      label: 'Total Identified Bugs',
      value: health.total_bugs,
      color: '#EF4444',
      sub: `${health.bugs_fixed} resolved with verified patches`,
    },
    {
      label: 'Critical Vulnerabilities',
      value: health.critical_count,
      color: '#EF4444',
      sub: 'ZeroDivisionError or runtime crashes',
    },
    {
      label: 'Security Surface Warnings',
      value: health.security_findings,
      color: '#F59E0B',
      sub: 'Bandit AST alerts & hardcoded patterns',
    },
    {
      label: 'Regression Suite Health',
      value: `${health.tests_passed}/${health.tests_passed + health.tests_failed}`,
      color: '#10B981',
      sub: 'Passing test assertion ratio',
    },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gradient-cyan-violet font-mono uppercase tracking-wide">
          Project Health Matrix
        </h1>
        <p className="text-xs text-text-secondary font-mono mt-1">
          Aggregated quantitative software reliability metrics & 3D severity extrusions
        </p>
      </div>

      {/* 4 Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((mc) => (
          <GlassCard key={mc.label} className="p-5" glowColor="none">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-1">
              {mc.label}
            </span>
            <div className="text-3xl font-bold font-mono my-1" style={{ color: mc.color }}>
              {mc.value}
            </div>
            <span className="text-xs text-text-secondary">{mc.sub}</span>
          </GlassCard>
        ))}
      </div>

      {/* 3D Extruded Severity Galaxy / Bar Chart */}
      <GlassCard className="p-6 space-y-4" glowColor="cyan">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            3D Findings Volume by Severity
          </h2>
          <span className="text-xs font-mono text-text-muted">
            Raycasted Extrusions • Hover to inspect heights
          </span>
        </div>
        <HealthCharts3D health={health} />
      </GlassCard>

      {/* Breakdown grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6 space-y-4" glowColor="emerald">
          <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wide">
            Automated Repair Velocity
          </h3>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-text-muted">Fixed & Verified Bugs:</span>
              <span className="text-emerald-400 font-bold">{health.bugs_fixed}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-text-muted">Unresolved Candidate Bugs:</span>
              <span className="text-amber-400 font-bold">{health.bugs_remaining}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-text-muted">Files Affected:</span>
              <span className="text-text-primary font-bold">{health.files_affected}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4" glowColor="violet">
          <h3 className="text-sm font-bold font-mono text-violet-400 uppercase tracking-wide">
            Sandbox Confinement Safety
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            All executed candidate tests run in read-only mounted Docker micro-sandboxes. Host
            API keys and environment variables are strictly prevented from entering the execution
            sandbox boundary.
          </p>
          <div className="p-3 rounded bg-black/40 border border-violet/30 font-mono text-xs text-violet-300">
            Docker Isolation Profile: non-root (nobody), network: none, memory: 256MB, cpu: 0.5 shares
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
