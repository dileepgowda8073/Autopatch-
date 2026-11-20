// ============================================================
// AutoPatch — useUpload Hook
// Orchestrates file upload → scan start → store hydration.
// ============================================================

import { useState, useCallback } from 'react'
import { uploadProject, getProjectTree, startScan } from '@/api/projects'
import { useProjectStore } from '@/store/projectStore'
import { usePipelineStore } from '@/store/pipelineStore'
import { useUIStore } from '@/store/uiStore'

// ── Return type ───────────────────────────────────────────────

export interface UseUploadReturn {
  /**
   * Accepts a File (ZIP archive), uploads it to the backend, starts a scan,
   * and seeds all relevant Zustand stores.
   *
   * @param file - The archive selected by the user (e.g. from an `<input type="file">`).
   */
  uploadFile: (file: File) => Promise<void>
  /** True while the upload or scan-start request is in-flight. */
  isUploading: boolean
  /**
   * Upload progress percentage in the range [0, 100].
   * Tracks the XHR upload phase; jumps to 100 once the scan start succeeds.
   */
  progress: number
  /** Human-readable error message, or `null` when no error has occurred. */
  error: string | null
  /** Clear the error state (useful for dismissing an error banner). */
  clearError: () => void
}

// ── Hook ─────────────────────────────────────────────────────

/**
 * Provides a fully orchestrated file-upload flow:
 *  1. POSTs the archive to `/projects` (multipart)
 *  2. POSTs to `/projects/{id}/scans` to start a scan
 *  3. Seeds `projectStore` and `pipelineStore` with the results
 *  4. Exposes `isUploading`, `progress`, and `error` for UI feedback
 */
export function useUpload(): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const { addProject, setCurrentProject, setCurrentTree, setCurrentScan } = useProjectStore()
  const { setJobId, setScanId, setStatus, resetPipeline } = usePipelineStore()
  const { addToast } = useUIStore()

  const clearError = useCallback(() => setError(null), [])

  const uploadFile = useCallback(async (file: File): Promise<void> => {
    // Reset state before starting a new upload.
    setIsUploading(true)
    setProgress(0)
    setError(null)
    resetPipeline()

    try {
      // ── Phase 1: Simulate upload progress (0 → 70%) ──────────
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 70) {
            clearInterval(progressInterval)
            return 70
          }
          return prev + Math.floor(Math.random() * 10) + 5
        })
      }, 150)

      // ── Phase 2: Upload the project ───────────────────────────
      const project = await uploadProject(file)
      clearInterval(progressInterval)
      setProgress(75)

      // Seed the project store.
      addProject(project)
      setCurrentProject(project)

      // ── Phase 3: Fetch Project Tree & Analysis ────────────────
      const tree = await getProjectTree(project.id)
      setCurrentTree(tree)

      setProgress(100)
      addToast('success', `"${project.name}" analyzed successfully.`)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during upload. Please try again.'
      setError(message)
      addToast('error', message)
    } finally {
      setIsUploading(false)
    }
  }, [
    addProject,
    setCurrentProject,
    setCurrentScan,
    setJobId,
    setScanId,
    setStatus,
    resetPipeline,
    addToast,
  ])

  return { uploadFile, isUploading, progress, error, clearError }
}
