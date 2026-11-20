import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import HeroScene from '@/3d/HeroScene'
import { TiltCard } from '@/components/common/TiltCard'
import { NeonButton } from '@/components/common/NeonButton'
import { CodeTraceLogo } from '@/components/common/CodeTraceLogo'

export default function LandingPage() {
  const [isPatched, setIsPatched] = useState(false)

  const capabilities = [
    {
      title: 'Tri-Signal Bug Detection',
      desc: 'Correlates static analyzers (Ruff, Bandit, SpotBugs), existing pytest/JUnit failures, and strict JSON AI heuristics.',
      icon: '⚡',
      accent: 'cyan',
    },
    {
      title: 'Evidence-Backed Root Cause',
      desc: 'Never suggests blindly. Formulates exact triggers, reproduction inputs, and expected vs actual states verified via Pydantic.',
      icon: '🔍',
      accent: 'violet',
    },
    {
      title: 'Isolated Sandbox Validation',
      desc: 'Executes candidate patches inside ephemeral Docker containers across 4 test phases: baseline, targeted, edge, and full regression.',
      icon: '🛡️',
      accent: 'emerald',
    },
    {
      title: 'Zero Project Contamination',
      desc: 'Original code is never modified automatically. Patches are staged on disposable copies until accepted with full rollback audit trail.',
      icon: '🔒',
      accent: 'cyan',
    },
  ]

  return (
    <div className="min-h-screen bg-[#05060A] text-text-primary selection:bg-cyan selection:text-black relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(0,245,255,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-96 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-20 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/">
          <CodeTraceLogo size="md" showTagline={true} />
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <span className="text-xs font-mono text-text-secondary hover:text-white transition-colors">
              Live Demo
            </span>
          </Link>
          <Link to="/upload">
            <NeonButton variant="cyan" size="sm">
              Launch Platform →
            </NeonButton>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[65vh]">
          {/* Left Column: Vision Pitch */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-xs font-mono tracking-wide">
              <span>⚡</span>
              <span>Autonomous Software Bug Detection & Repair</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
              Autonomous Software{' '}
              <span className="text-gradient-cyan-violet">Bug Detection</span> & Repair.
            </h1>

            <p className="text-base sm:text-lg text-text-secondary leading-relaxed font-sans max-w-xl">
              CodeTrace does not just guess a fix — it provides verifiable evidence.
              Upload buggy code, understand root causes, review focused diffs, and inspect sandbox test results before accepting.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/upload">
                <NeonButton variant="cyan" size="lg">
                  Start Debugging →
                </NeonButton>
              </Link>
              <NeonButton
                variant="violet"
                size="lg"
                onClick={() => setIsPatched(!isPatched)}
              >
                {isPatched ? 'Reset 3D Simulation' : 'Simulate Patch in 3D'}
              </NeonButton>
            </div>

            <div className="flex items-center gap-6 pt-4 text-xs font-mono text-text-muted">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Python & Java</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Docker Sandbox</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Human-in-the-loop</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Interactive Hero Canvas */}
          <div className="lg:col-span-6 h-[480px] sm:h-[540px] relative">
            <HeroScene patched={isPatched} />
          </div>
        </div>

        {/* 4 Capabilities Grid */}
        <section className="pt-24 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Eight Official Architectural Pillars
            </h2>
            <p className="text-sm font-mono text-text-muted">
              Deterministic static tooling paired with verifiable sandbox assertions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <TiltCard intensity={4} className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xl mb-4">
                      {cap.icon}
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">{cap.title}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">{cap.desc}</p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-white/[0.04] text-[11px] font-mono text-cyan">
                    Capability 0{i + 1}
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#0A0B10]/80 py-8 text-center text-xs font-mono text-text-muted">
        <p>CodeTrace • Autonomous Software Bug Detection and Repair Platform</p>
      </footer>
    </div>
  )
}
