import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GlassCard } from '@/components/common/GlassCard'
import { NeonButton } from '@/components/common/NeonButton'
import { SeverityBadge } from '@/components/common/SeverityBadge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CodeTraceLogo } from '@/components/common/CodeTraceLogo'
import { useProjectStore } from '@/store/projectStore'
import { usePipelineStore } from '@/store/pipelineStore'
import { MOCK_HEALTH, MOCK_FINDINGS } from '@/mock/data'

/** Quick-stat card shown at the top of the dashboard */
function StatCard({
  label, value, color, sublabel
}: { label: string; value: number | string; color: string; sublabel?: string }) {
  return (
    <GlassCard className="p-6" glowColor="none">
      <p className="text-text-muted text-xs uppercase tracking-widest font-mono mb-2">{label}</p>
      <p className="text-4xl font-bold mb-1" style={{ color }}>
        {value}
      </p>
      {sublabel && <p className="text-text-secondary text-sm">{sublabel}</p>}
    </GlassCard>
  )
}

/** Recent findings preview */
function RecentFindings() {
  const findings = useProjectStore(s => s.findings)
  const display  = findings.length ? findings.slice(0, 3) : MOCK_FINDINGS.slice(0, 3)

  return (
    <GlassCard className="p-6 col-span-2" glowColor="cyan">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-lg">Recent Findings</h2>
        <Link to="/findings" className="text-cyan text-sm hover:underline">View all →</Link>
      </div>
      <div className="space-y-3">
        {display.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-3 p-3 rounded-glass bg-white/[0.02] border border-white/[0.05]"
          >
            <SeverityBadge severity={f.severity} showIcon />
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{f.title}</p>
              <p className="text-text-muted text-xs font-mono mt-0.5 truncate">
                {f.file}:{f.line_start}
              </p>
            </div>
            {f.is_candidate && (
              <span className="shrink-0 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5">
                Candidate
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </GlassCard>
  )
}

/** Pipeline quick-actions */
function QuickActions() {
  return (
    <GlassCard className="p-6" glowColor="violet">
      <h2 className="text-white font-semibold text-lg mb-4">Quick Actions</h2>
      <div className="flex flex-col gap-3">
        <Link to="/upload">
          <NeonButton variant="cyan" className="w-full justify-center">
            ↑ Upload New Project
          </NeonButton>
        </Link>
        <Link to="/scan">
          <NeonButton variant="violet" className="w-full justify-center">
            ⚡ Continue Scan
          </NeonButton>
        </Link>
        <Link to="/history">
          <NeonButton variant="ghost" className="w-full justify-center">
            📋 View History
          </NeonButton>
        </Link>
      </div>
    </GlassCard>
  )
}

export default function DashboardPage() {
  const health  = useProjectStore(s => s.health) ?? MOCK_HEALTH
  const project = useProjectStore(s => s.currentProject)
  const status  = usePipelineStore(s => s.status)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gradient-cyan-violet mb-1">
          {project ? project.name : 'Dashboard'}
        </h1>
        <p className="text-text-secondary text-sm">
          {project
            ? `${project.language.toUpperCase()} · ${project.file_count} files · Status: ${status}`
            : 'Upload a project to begin autonomous bug detection and repair.'}
        </p>
      </div>

      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      >
        {[
          { label: 'Total Bugs',      value: health.total_bugs,        color: '#EF4444', sublabel: `${health.bugs_fixed} fixed` },
          { label: 'Critical',        value: health.critical_count,    color: '#EF4444', sublabel: 'Needs immediate action' },
          { label: 'Tests Passed',    value: health.tests_passed,      color: '#10B981', sublabel: `${health.tests_failed} failed` },
          { label: 'Security Issues', value: health.security_findings, color: '#F59E0B', sublabel: 'hardcoded secrets, eval, etc.' },
        ].map((s) => (
          <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </motion.div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RecentFindings />
        <QuickActions />
      </div>

      {/* Welcome CTA if no project */}
      {!project && (
        <GlassCard className="p-8 text-center animated-border" glowColor="cyan">
          <div className="flex justify-center mb-4">
            <CodeTraceLogo size="lg" showTagline={true} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Autonomous Software Bug Detection & Repair</h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Upload a Python or Java project to begin autonomous bug detection,
            root-cause analysis, and AI-powered patch generation.
          </p>
          <Link to="/upload">
            <NeonButton variant="cyan" size="lg">Start Debugging →</NeonButton>
          </Link>
        </GlassCard>
      )}
    </div>
  )
}
