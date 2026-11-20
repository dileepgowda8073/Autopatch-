import React, { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DiffViewer } from '@/components/patch/DiffViewer'
import { GlassCard } from '@/components/common/GlassCard'
import { NeonButton } from '@/components/common/NeonButton'
import { SeverityBadge } from '@/components/common/SeverityBadge'
import { useProjectStore } from '@/store/projectStore'
import { generatePatch } from '@/api/patches'
import { validatePatch } from '@/api/patches'
import { MOCK_PATCH, MOCK_FINDINGS } from '@/mock/data'

export default function PatchPage() {
  const navigate = useNavigate()
  const { patchId } = useParams<{ patchId?: string }>()

  const currentFinding = useProjectStore((s) => s.currentFinding) || MOCK_FINDINGS[0]
  const currentPatch = useProjectStore((s) => s.currentPatch) || MOCK_PATCH
  const setCurrentPatch = useProjectStore((s) => s.setCurrentPatch)
  const setValidation = useProjectStore((s) => s.setValidation)

  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const handleRegenerate = async () => {
    if (currentPatch.attempt >= 3) {
      toast.error('Maximum patch regeneration attempts (3/3) reached.')
      return
    }
    setIsRegenerating(true)
    try {
      const revised = await generatePatch(currentFinding.id, true)
      setCurrentPatch(revised)
      toast.success(`Synthesized revised patch proposal (Attempt ${revised.attempt}/3)`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to regenerate patch.')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleRunValidation = async () => {
    setIsValidating(true)
    try {
      const result = await validatePatch(currentPatch.id)
      setValidation(result)
      toast.success('Validation matrix complete in sandbox.')
      navigate(`/validate/${currentPatch.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Sandbox execution failure.')
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top summary strip */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4" glowColor="none">
        <div className="flex items-center gap-3">
          <Link to="/findings" className="text-text-muted hover:text-white transition-colors">
            ← Findings
          </Link>
          <span className="text-white/[0.2]">|</span>
          <SeverityBadge severity={currentFinding.severity} />
          <span className="font-semibold text-white text-sm truncate">{currentFinding.title}</span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-full bg-violet/10 text-violet-300 border border-violet/30">
            Attempt {currentPatch.attempt} of 3
          </span>
          <span className="text-text-muted">{currentFinding.file}</span>
        </div>
      </GlassCard>

      {/* Main Diff & atomic explanation viewer */}
      <DiffViewer
        diff={currentPatch.diff}
        explanation={currentPatch.explanation}
        lineChanges={currentPatch.line_changes}
        filename={currentFinding.file}
      />

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-4 z-10">
        <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4 border-cyan/30 shadow-2xl bg-[#0F1117]/95" glowColor="cyan">
          <div className="text-xs font-mono text-text-muted">
            <span>Staged on temporary workspace copy • Original is untouched.</span>
          </div>

          <div className="flex items-center gap-3">
            {currentPatch.attempt < 3 && (
              <NeonButton
                variant="ghost"
                size="sm"
                loading={isRegenerating}
                onClick={handleRegenerate}
              >
                🔄 Regenerate Diff ({currentPatch.attempt}/3)
              </NeonButton>
            )}

            <NeonButton
              variant="cyan"
              size="md"
              loading={isValidating}
              onClick={handleRunValidation}
            >
              Run Isolated Sandbox Validation →
            </NeonButton>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
