// ============================================================
// AutoPatch — useDecision Hook
// Provides accept / reject / needs-review / rollback actions
// for a patch, plus a browser-triggered download helper.
// ============================================================

import { useState, useCallback } from 'react'
import { makeDecision, rollbackPatch } from '@/api/patches'
import { downloadProject } from '@/api/projects'
import { useProjectStore } from '@/store/projectStore'
import { usePipelineStore } from '@/store/pipelineStore'
import { useUIStore } from '@/store/uiStore'
import type { DecisionType } from '@/types'

// ── Return type ───────────────────────────────────────────────

export interface UseDecisionReturn {
  /**
   * Accept the patch — records decision, transitions pipeline to ACCEPTED,
   * and makes a repaired-archive download URL available.
   *
   * @param note - Optional human note stored with the decision.
   */
  accept: (note?: string) => Promise<void>
  /**
   * Reject the patch — records decision and transitions pipeline to REJECTED.
   *
   * @param note - Optional rejection rationale.
   */
  reject: (note?: string) => Promise<void>
  /**
   * Flag the patch for further review — transitions pipeline to NEEDS_REVIEW.
   *
   * @param note - Optional commentary for the reviewer.
   */
  needsReview: (note?: string) => Promise<void>
  /**
   * Roll back a previously accepted patch, restoring the original source file(s).
   * Transitions the pipeline to ROLLED_BACK.
   */
  rollback: () => Promise<void>
  /**
   * Trigger a browser download of the repaired project archive.
   * Uses the `download_url` from the most recent Accept decision, or falls
   * back to `GET /projects/{id}/download`.
   */
  downloadRepaired: () => void
  /** True while any decision or rollback request is in-flight. */
  isLoading: boolean
}

// ── Hook ─────────────────────────────────────────────────────

/**
 * Provides all human-decision actions for a given patch, wired to the global
 * Zustand stores and toast notifications.
 *
 * @param patchId - The patch UUID to act on. Pass `null` to disable actions.
 */
export function useDecision(patchId: string | null): UseDecisionReturn {
  const [isLoading, setIsLoading] = useState(false)

  const { currentProject, updateFinding, currentFinding } = useProjectStore()
  const { setStatus } = usePipelineStore()
  const { addToast } = useUIStore()

  // ── Internal helper ────────────────────────────────────────

  const execute = useCallback(
    async (decision: DecisionType, note?: string): Promise<void> => {
      if (!patchId) {
        addToast('error', 'No patch selected.')
        return
      }

      setIsLoading(true)
      try {
        const result = await makeDecision(patchId, decision, note)

        // Map decision to pipeline status and finding status.
        const statusMap: Record<DecisionType, Parameters<typeof setStatus>[0]> =
          {
            accept: 'ACCEPTED',
            reject: 'REJECTED',
            needs_review: 'NEEDS_REVIEW',
            rollback: 'ROLLED_BACK',
          }
        setStatus(statusMap[decision])

        if (currentFinding) {
          const findingStatusMap: Record<DecisionType, Parameters<typeof updateFinding>[1]['status']> =
            {
              accept: 'accepted',
              reject: 'rejected',
              needs_review: 'needs_review',
              rollback: 'open',
            }
          updateFinding(currentFinding.id, {
            status: findingStatusMap[decision],
          })
        }

        const toastMessages: Record<DecisionType, string> = {
          accept: 'Patch accepted — repaired archive is ready to download.',
          reject: 'Patch rejected.',
          needs_review: 'Patch flagged for further review.',
          rollback: 'Patch rolled back — original files restored.',
        }
        addToast('success', toastMessages[decision])

        // Store the download URL from the decision so downloadRepaired() can use it.
        if (decision === 'accept' && result.download_url) {
          // Persist it on the window for the downloadRepaired closure to pick up.
          ;(window as Window & { __autopatch_download_url__?: string }).__autopatch_download_url__ =
            result.download_url
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Decision could not be recorded.'
        addToast('error', message)
      } finally {
        setIsLoading(false)
      }
    },
    [patchId, currentFinding, setStatus, updateFinding, addToast],
  )

  // ── Rollback ───────────────────────────────────────────────

  const rollback = useCallback(async (): Promise<void> => {
    if (!patchId) {
      addToast('error', 'No patch selected.')
      return
    }

    setIsLoading(true)
    try {
      await rollbackPatch(patchId)
      setStatus('ROLLED_BACK')
      if (currentFinding) {
        updateFinding(currentFinding.id, { status: 'open' })
      }
      addToast('success', 'Patch rolled back — original files restored.')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Rollback failed. Please try again.'
      addToast('error', message)
    } finally {
      setIsLoading(false)
    }
  }, [patchId, currentFinding, setStatus, updateFinding, addToast])

  // ── Download helper ────────────────────────────────────────

  const downloadRepaired = useCallback((): void => {
    // Prefer the download URL stored from the most recent accept decision.
    const storedUrl = (
      window as Window & { __autopatch_download_url__?: string }
    ).__autopatch_download_url__

    if (storedUrl) {
      triggerDownload(storedUrl, 'repaired-project.zip')
      return
    }

    // Fall back to fetching the blob directly.
    if (!currentProject) {
      addToast('error', 'No project selected for download.')
      return
    }

    downloadProject(currentProject.id)
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        triggerDownload(url, `${currentProject.name}-repaired.zip`)
        // Revoke the object URL after a short delay to free memory.
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Download failed.'
        addToast('error', message)
      })
  }, [currentProject, addToast])

  // ── Public API ─────────────────────────────────────────────

  return {
    accept: (note) => execute('accept', note),
    reject: (note) => execute('reject', note),
    needsReview: (note) => execute('needs_review', note),
    rollback,
    downloadRepaired,
    isLoading,
  }
}

// ── Private helper ────────────────────────────────────────────

/**
 * Programmatically triggers a browser file download via a temporary
 * `<a>` element.
 *
 * @param href     - The URL or object URL to download.
 * @param filename - The suggested filename for the saved file.
 */
function triggerDownload(href: string, filename: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
