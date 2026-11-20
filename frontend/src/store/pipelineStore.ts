// ============================================================
// AutoPatch — Pipeline Store (Zustand)
// Manages the scan-pipeline finite-state machine, detector
// progress tracking, and streaming log entries.
// ============================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ScanStatus, SourceTool, LogEntry } from '@/types'

// ── Detector progress record ──────────────────────────────────

export interface DetectorProgress {
  /** Whether this detector has finished. */
  done: boolean
  /** Number of findings reported by this detector. */
  findingCount: number
  /** Wall-clock milliseconds the detector took to complete. */
  elapsedMs: number
}

// ── State shape ───────────────────────────────────────────────

export interface PipelineState {
  /** Active job ID (from the backend job queue). */
  jobId: string | null
  /** Active scan ID. */
  scanId: string | null
  /** Current FSM status (mirrors `ScanStatus`). */
  status: ScanStatus
  /** Streaming log entries shown in the scanning view. */
  logs: LogEntry[]
  /** Per-detector progress map. */
  detectorProgress: Partial<Record<SourceTool, DetectorProgress>>
  /** Number of times the SSE connection has reconnected. */
  retryCount: number
}

// ── Action shape ──────────────────────────────────────────────

export interface PipelineActions {
  /** Set the active job ID. */
  setJobId: (jobId: string | null) => void
  /** Set the active scan ID. */
  setScanId: (scanId: string | null) => void
  /** Transition the pipeline to a new status. */
  setStatus: (status: ScanStatus) => void
  /** Append a single log entry to the stream. */
  addLog: (entry: LogEntry) => void
  /**
   * Mark a detector as finished and record its finding count and elapsed time.
   *
   * @param tool         - Which detector finished.
   * @param findingCount - How many findings it produced.
   * @param elapsedMs    - How long (ms) it took to complete.
   */
  markDetectorDone: (
    tool: SourceTool,
    findingCount: number,
    elapsedMs: number,
  ) => void
  /** Increment the SSE reconnect counter. */
  incrementRetry: () => void
  /** Reset the SSE reconnect counter to zero. */
  resetRetry: () => void
  /** Reset the entire pipeline state to its initial values. */
  resetPipeline: () => void
}

// ── Initial state ─────────────────────────────────────────────

const initialState: PipelineState = {
  jobId: null,
  scanId: null,
  status: 'UPLOADED',
  logs: [],
  detectorProgress: {},
  retryCount: 0,
}

// ── Store ─────────────────────────────────────────────────────

export const usePipelineStore = create<PipelineState & PipelineActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setJobId: (jobId) =>
        set({ jobId }, false, 'pipeline/setJobId'),

      setScanId: (scanId) =>
        set({ scanId }, false, 'pipeline/setScanId'),

      setStatus: (status) =>
        set({ status }, false, 'pipeline/setStatus'),

      addLog: (entry) =>
        set(
          (state) => ({
            // Cap the in-memory log at 500 entries to avoid memory growth.
            logs:
              state.logs.length >= 500
                ? [...state.logs.slice(-499), entry]
                : [...state.logs, entry],
          }),
          false,
          'pipeline/addLog',
        ),

      markDetectorDone: (tool, findingCount, elapsedMs) =>
        set(
          (state) => ({
            detectorProgress: {
              ...state.detectorProgress,
              [tool]: { done: true, findingCount, elapsedMs },
            },
          }),
          false,
          'pipeline/markDetectorDone',
        ),

      incrementRetry: () =>
        set(
          (state) => ({ retryCount: state.retryCount + 1 }),
          false,
          'pipeline/incrementRetry',
        ),

      resetRetry: () =>
        set({ retryCount: 0 }, false, 'pipeline/resetRetry'),

      resetPipeline: () =>
        set(initialState, false, 'pipeline/resetPipeline'),
    }),
    { name: 'AutoPatch/Pipeline' },
  ),
)
