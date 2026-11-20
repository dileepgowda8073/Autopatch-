import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ValidationStatus, DecisionType } from '@/types'
import { NeonButton } from '../common/NeonButton'
import { GlassCard } from '../common/GlassCard'

export interface DecisionButtonsProps {
  patchId: string | null
  validationStatus: ValidationStatus | null
  attempt?: number
  isDeciding?: boolean
  onDecision: (decision: DecisionType, note?: string) => Promise<void>
  onRegenerate?: () => void
  onRollback?: () => Promise<void>
  onDownload?: () => void
  isRolledBack?: boolean
}

export const DecisionButtons: React.FC<DecisionButtonsProps> = ({
  patchId,
  validationStatus,
  attempt = 1,
  isDeciding = false,
  onDecision,
  onRegenerate,
  onRollback,
  onDownload,
  isRolledBack = false,
}) => {
  const navigate = useNavigate()
  const [modalType, setModalType] = useState<DecisionType | null>(null)
  const [note, setNote] = useState('')
  const [hasDecided, setHasDecided] = useState(false)

  const handleConfirmDecision = async () => {
    if (!modalType) return
    await onDecision(modalType, note)
    setHasDecided(true)
    setModalType(null)
  }

  const isVerified = validationStatus === 'verified'
  const canRetry = attempt < 3 && validationStatus === 'failed'

  return (
    <div className="space-y-4">
      {/* Sticky action bar */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4" glowColor="none">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted">Decision Control:</span>
          {hasDecided && (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Decision Recorded
            </span>
          )}
          {isRolledBack && (
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              Rolled Back to Original
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reject */}
          <NeonButton
            variant="red"
            size="sm"
            disabled={isDeciding}
            onClick={() => setModalType('reject')}
          >
            ✕ Reject
          </NeonButton>

          {/* Needs Review */}
          <NeonButton
            variant="violet"
            size="sm"
            disabled={isDeciding}
            onClick={() => setModalType('needs_review')}
          >
            ? Needs Review
          </NeonButton>

          {/* Retry Regeneration if validation failed */}
          {canRetry && onRegenerate && (
            <NeonButton
              variant="cyan"
              size="sm"
              disabled={isDeciding}
              onClick={onRegenerate}
            >
              🔄 Retry Patch with Error Feedback ({attempt}/3)
            </NeonButton>
          )}

          {/* Accept Patch */}
          <NeonButton
            variant="emerald"
            size="sm"
            disabled={isDeciding}
            onClick={() => setModalType('accept')}
          >
            ✓ Accept Patch
          </NeonButton>

          {/* Post-accept tools: Navigation, Download & Rollback */}
          {hasDecided && (
            <>
              <NeonButton variant="violet" size="sm" onClick={() => navigate('/health')}>
                📊 View Health Score
              </NeonButton>
              <NeonButton variant="cyan" size="sm" onClick={() => navigate('/history')}>
                📜 View Audit History
              </NeonButton>
              {onDownload && (
                <NeonButton variant="emerald" size="sm" onClick={onDownload}>
                  ⬇ Download Repaired ZIP
                </NeonButton>
              )}
              {onRollback && !isRolledBack && (
                <NeonButton variant="ghost" size="sm" onClick={onRollback}>
                  ↩ Roll Back
                </NeonButton>
              )}
            </>
          )}
        </div>
      </GlassCard>

      {/* Decision confirmation modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <GlassCard className="p-6 max-w-md w-full space-y-4 border-cyan/40" glowColor="cyan">
            <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
              Confirm Decision: <span className="text-cyan">{modalType}</span>
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {modalType === 'accept'
                ? 'Accepting will apply this verified patch to the project workspace and record it in the persistent SQLite audit history.'
                : modalType === 'reject'
                ? 'Rejecting will discard this patch proposal while preserving the original codebase untouched.'
                : 'Marking as Needs Review flags this finding for secondary manual inspection.'}
            </p>

            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5">
                Audit Note / Reason (Optional):
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add rationale for change history log..."
                className="w-full h-20 p-2.5 rounded bg-black/60 border border-white/[0.1] text-xs font-mono text-text-primary focus:outline-none focus:border-cyan"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <NeonButton
                variant="ghost"
                size="sm"
                onClick={() => setModalType(null)}
                disabled={isDeciding}
              >
                Cancel
              </NeonButton>
              <NeonButton
                variant={modalType === 'accept' ? 'emerald' : modalType === 'reject' ? 'red' : 'violet'}
                size="sm"
                loading={isDeciding}
                onClick={handleConfirmDecision}
              >
                Confirm {modalType}
              </NeonButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
