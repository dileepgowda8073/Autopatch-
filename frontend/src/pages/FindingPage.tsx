import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GlassCard } from '@/components/common/GlassCard'
import { NeonButton } from '@/components/common/NeonButton'
import { SeverityBadge } from '@/components/common/SeverityBadge'
import { FindingList } from '@/components/findings/FindingList'
import { useProjectStore } from '@/store/projectStore'
import { useUiStore } from '@/store/uiStore'
import { generatePatch } from '@/api/patches'
import { getFindings } from '@/api/projects'
import { isMockMode } from '@/api/client'
import { Finding, SOURCE_LABELS } from '@/types'
import { MOCK_FINDINGS } from '@/mock/data'

export default function FindingPage() {
  const navigate = useNavigate()
  const currentScan = useProjectStore((s) => s.currentScan)
  const storedFindings = useProjectStore((s) => s.findings)
  const setFindings = useProjectStore((s) => s.setFindings)
  const findings = storedFindings.length > 0 ? storedFindings : (isMockMode ? MOCK_FINDINGS : [])

  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(findings[0] || null)
  const [isGenerating, setIsGenerating] = useState(false)

  const setCurrentFinding = useProjectStore((s) => s.setCurrentFinding)
  const setCurrentPatch = useProjectStore((s) => s.setCurrentPatch)
  const { setChatDrawerOpen, setActiveFindingId } = useUiStore()

  useEffect(() => {
    if (currentScan?.id && storedFindings.length === 0) {
      getFindings(currentScan.id)
        .then((res) => {
          if (res?.findings && res.findings.length > 0) {
            setFindings(res.findings)
            setSelectedFinding(res.findings[0])
            setCurrentFinding(res.findings[0])
          }
        })
        .catch(console.error)
    }
  }, [currentScan?.id, storedFindings.length])

  useEffect(() => {
    if (!selectedFinding && findings.length > 0) {
      setSelectedFinding(findings[0])
      setCurrentFinding(findings[0])
    }
  }, [findings, selectedFinding])

  const handleSelectFinding = (f: Finding) => {
    setSelectedFinding(f)
    setCurrentFinding(f)
  }

  const handleGeneratePatch = async () => {
    if (!selectedFinding) return
    setIsGenerating(true)
    try {
      const patch = await generatePatch(selectedFinding.id)
      setCurrentFinding(selectedFinding)
      setCurrentPatch(patch)
      toast.success('Focused minimal patch synthesized!')
      navigate(`/patch/${patch.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate patch proposal.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOpenChat = () => {
    if (selectedFinding) {
      setActiveFindingId(selectedFinding.id)
      setChatDrawerOpen(true)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient-cyan-violet font-mono uppercase tracking-wide">
            Step 3: Root-Cause Analysis & Findings
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-1">
            Normalized Findings Matrix • AI candidates labeled with confidence disclaimer
          </p>
        </div>

        <button
          onClick={handleOpenChat}
          className="flex items-center gap-2 px-3 py-1.5 rounded-glass text-xs font-mono text-violet-300 bg-violet/10 border border-violet/30 hover:bg-violet/20 cursor-pointer"
        >
          <span>✨</span>
          <span>Ask CodeTrace AI about this</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5/12): Finding List selector */}
        <div className="lg:col-span-5 space-y-4">
          <FindingList
            findings={findings}
            selectedId={selectedFinding?.id}
            onSelectFinding={handleSelectFinding}
          />
        </div>

        {/* Right Column (7/12): Deep Detailed RCA View */}
        <div className="lg:col-span-7 space-y-4">
          {selectedFinding ? (
            <GlassCard className="p-6 space-y-6" glowColor="cyan">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={selectedFinding.severity} />
                  <span className="px-2 py-0.5 rounded-full border border-white/10 text-xs font-mono text-text-secondary uppercase">
                    Signal: {SOURCE_LABELS[selectedFinding.source] || selectedFinding.source}
                  </span>
                  {selectedFinding.is_candidate && (
                    <span className="px-2 py-0.5 rounded-full border border-amber-500/30 text-xs font-mono text-amber-400 bg-amber-500/10">
                      ⚠ Candidate Finding
                    </span>
                  )}
                  <span className="ml-auto text-xs font-mono text-cyan">
                    {selectedFinding.file}:{selectedFinding.line_start}-{selectedFinding.line_end}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-white pt-1">{selectedFinding.title}</h2>
              </div>

              {/* Sections */}
              <div className="space-y-4 font-mono text-xs">
                {/* Description */}
                <div>
                  <span className="text-text-muted uppercase tracking-wider block mb-1">
                    What Goes Wrong:
                  </span>
                  <p className="text-text-secondary leading-relaxed bg-black/40 p-3 rounded border border-white/[0.04]">
                    {selectedFinding.description}
                  </p>
                </div>

                {/* Trigger & Repro */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-text-muted uppercase tracking-wider block mb-1">
                      Trigger Condition:
                    </span>
                    <div className="bg-black/40 p-2.5 rounded border border-white/[0.04] text-text-secondary">
                      {selectedFinding.trigger}
                    </div>
                  </div>
                  <div>
                    <span className="text-text-muted uppercase tracking-wider block mb-1">
                      Reproduction Input:
                    </span>
                    <div className="bg-black/40 p-2.5 rounded border border-cyan/20 text-cyan">
                      {selectedFinding.repro_input}
                    </div>
                  </div>
                </div>

                {/* Expected vs Actual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-emerald-400 uppercase tracking-wider block mb-1">
                      ✓ Expected Behavior:
                    </span>
                    <div className="bg-emerald-500/10 p-2.5 rounded border border-emerald-500/30 text-emerald-300">
                      {selectedFinding.expected}
                    </div>
                  </div>
                  <div>
                    <span className="text-red-400 uppercase tracking-wider block mb-1">
                      ✗ Actual Behavior:
                    </span>
                    <div className="bg-red-500/10 p-2.5 rounded border border-red-500/30 text-red-300">
                      {selectedFinding.actual}
                    </div>
                  </div>
                </div>

                {/* Root Cause */}
                <div>
                  <span className="text-violet-400 uppercase tracking-wider block mb-1">
                    ✦ Root Cause Analysis:
                  </span>
                  <p className="bg-violet/10 text-violet-200 p-3 rounded border border-violet/30 leading-relaxed">
                    {selectedFinding.root_cause}
                  </p>
                </div>

                {/* Severity Reason & Confidence */}
                <div className="p-3 rounded bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="text-text-secondary">
                    <span className="text-text-muted">Severity Rationale: </span>
                    {selectedFinding.severity_reason}
                  </div>
                  <div className="text-text-secondary pt-1 flex items-center justify-between">
                    <span>
                      Confidence: <strong>{Math.round(selectedFinding.confidence_estimate * 100)}%</strong>
                    </span>
                    <span className="text-[10px] text-text-muted italic">
                      AI estimate — not a measured probability
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
                <NeonButton variant="ghost" size="sm" onClick={handleOpenChat}>
                  💬 Ask Questions About Finding
                </NeonButton>

                <NeonButton
                  variant="cyan"
                  size="md"
                  loading={isGenerating}
                  onClick={handleGeneratePatch}
                >
                  Synthesize Minimal Patch →
                </NeonButton>
              </div>
            </GlassCard>
          ) : (
            <div className="p-12 text-center text-text-muted border border-white/[0.06] rounded-glass">
              Select a finding from the left to inspect root-cause analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
