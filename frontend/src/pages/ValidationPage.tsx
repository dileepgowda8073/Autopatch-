import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { TestMatrix } from '@/components/testing/TestMatrix'
import { DecisionButtons } from '@/components/patch/DecisionButtons'
import { GlassCard } from '@/components/common/GlassCard'
import { NeonButton } from '@/components/common/NeonButton'
import { useProjectStore } from '@/store/projectStore'
import { makeDecision, rollbackPatch, generatePatch, validatePatch } from '@/api/patches'
import { downloadProject, getHealth, getHistory } from '@/api/projects'
import { DecisionType } from '@/types'
import { MOCK_VALIDATION, MOCK_PATCH, MOCK_PROJECT } from '@/mock/data'

export default function ValidationPage() {
  const navigate = useNavigate()
  const { patchId } = useParams<{ patchId?: string }>()

  const validation = useProjectStore((s) => s.validation) || MOCK_VALIDATION
  const currentPatch = useProjectStore((s) => s.currentPatch) || MOCK_PATCH
  const currentProject = useProjectStore((s) => s.currentProject) || MOCK_PROJECT

  const setValidation = useProjectStore((s) => s.setValidation)
  const setCurrentPatch = useProjectStore((s) => s.setCurrentPatch)
  const setHealth = useProjectStore((s) => s.setHealth)
  const setHistory = useProjectStore((s) => s.setHistory)

  const [isDeciding, setIsDeciding] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isRolledBack, setIsRolledBack] = useState(false)

  // Re-run or ensure fresh validation on mount if currently unverified or on patch change
  useEffect(() => {
    const activePatchId = patchId || currentPatch?.id
    if (activePatchId && (!validation || validation.overall_status === 'not_verified')) {
      setIsValidating(true)
      validatePatch(activePatchId)
        .then((res) => {
          setValidation(res)
        })
        .catch((err) => {
          console.warn('Auto-validation error:', err)
        })
        .finally(() => {
          setIsValidating(false)
        })
    }
  }, [patchId, currentPatch?.id])

  const handleManualRevalidate = async () => {
    const activePatchId = patchId || currentPatch?.id
    if (!activePatchId) return
    setIsValidating(true)
    try {
      const res = await validatePatch(activePatchId)
      setValidation(res)
      toast.success('Validation matrix updated with fresh sandbox results.')
    } catch (err) {
      toast.error('Re-validation failed.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleDecision = async (decision: DecisionType, note?: string) => {
    setIsDeciding(true)
    try {
      await makeDecision(currentPatch.id, decision, note)
      toast.success(`Decision "${decision.toUpperCase()}" recorded in SQLite history.`)

      // Immediately append to local Zustand history store so Change History updates immediately
      const activeFinding = useProjectStore.getState().currentFinding
      const optimisticEntry = {
        finding_id: activeFinding?.id || 'f1',
        finding_title: activeFinding?.title || 'Input validation and docstring compliance',
        severity: activeFinding?.severity || 'High',
        patch_id: currentPatch.id,
        attempt: currentPatch.attempt || 1,
        overall_test_status: validation?.overall_status || 'verified',
        decision: decision,
        decided_at: new Date().toISOString(),
        phases: (validation?.phases || []).map((p) => ({ phase: p.phase, status: p.status })),
      }
      const existingHistory = useProjectStore.getState().history || []
      setHistory([optimisticEntry, ...existingHistory.filter((h) => h.patch_id !== currentPatch.id)])

      try {
        const pId = currentProject?.id || 'latest'
        const [updatedHealth, updatedHistory] = await Promise.all([
          getHealth(pId),
          getHistory(pId),
        ])
        if (updatedHealth) setHealth(updatedHealth)
        if (updatedHistory && Array.isArray(updatedHistory) && updatedHistory.length > 0) {
          setHistory(updatedHistory)
        }
      } catch {
        // non-blocking
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to commit patch decision.')
    } finally {
      setIsDeciding(false)
    }
  }

  const handleRollback = async () => {
    setIsDeciding(true)
    try {
      await rollbackPatch(currentPatch.id)
      setIsRolledBack(true)
      toast.success('Workspace copy rolled back to pre-patch state.')

      try {
        const pId = currentProject?.id || 'latest'
        const [updatedHealth, updatedHistory] = await Promise.all([
          getHealth(pId),
          getHistory(pId),
        ])
        if (updatedHealth) setHealth(updatedHealth)
        if (updatedHistory && Array.isArray(updatedHistory)) setHistory(updatedHistory)
      } catch {
        // non-blocking
      }
    } catch (err) {
      console.error(err)
      toast.error('Rollback operation failed.')
    } finally {
      setIsDeciding(false)
    }
  }

  const handleRegenerate = async () => {
    try {
      toast.loading('Synthesizing retry patch using test feedback...')
      const newPatch = await generatePatch(currentPatch.finding_id, true)
      setCurrentPatch(newPatch)
      const newValid = await validatePatch(newPatch.id)
      setValidation(newValid)
      toast.dismiss()
      toast.success('Retried patch generated and validated!')
    } catch (err) {
      toast.dismiss()
      toast.error('Retry generation failed.')
    }
  }

  const handleDownload = async () => {
    try {
      const blob = await downloadProject(currentProject.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentProject.name}_repaired.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Repaired archive downloaded.')
    } catch (err) {
      console.error(err)
      toast.error('Failed to download project archive.')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient-cyan-violet font-mono uppercase tracking-wide">
            Step 5: Testing & Evidence Validation
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-1">
            Docker Sandbox Matrix • CPU/RAM limited • Network isolated • Non-root execution
          </p>
        </div>
        <NeonButton
          variant="cyan"
          size="sm"
          loading={isValidating}
          onClick={handleManualRevalidate}
        >
          ⚡ Re-run Sandbox Validation
        </NeonButton>
      </div>

      {/* Test Matrix */}
      <TestMatrix validation={validation} />

      {/* Human Decision Action Bar */}
      <DecisionButtons
        patchId={currentPatch.id}
        validationStatus={validation.overall_status}
        attempt={currentPatch.attempt}
        isDeciding={isDeciding}
        isRolledBack={isRolledBack}
        onDecision={handleDecision}
        onRegenerate={handleRegenerate}
        onRollback={handleRollback}
        onDownload={handleDownload}
      />
    </div>
  )
}
