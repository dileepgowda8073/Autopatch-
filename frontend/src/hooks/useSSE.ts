// ============================================================
// AutoPatch — useSSE Hook
// Opens a Server-Sent Events stream for a job, dispatches typed
// events to the pipeline and project stores, and simulates the
// full pipeline in mock mode via setTimeout sequences.
// ============================================================

import { useEffect, useRef } from 'react'
import { isMockMode } from '@/api/client'
import { getFindings } from '@/api/projects'
import { usePipelineStore } from '@/store/pipelineStore'
import { useProjectStore } from '@/store/projectStore'
import type {
  SSEEventType,
  StagePayload,
  DetectorDonePayload,
  FindingsReadyPayload,
  PatchReadyPayload,
  TestPhasePayload,
  ValidationDonePayload,
  JobErrorPayload,
  LogEntry,
  SourceTool,
} from '@/types'
import { MOCK_FINDINGS, MOCK_PATCH, MOCK_SCAN } from '@/mock/data'

// ── Utility ───────────────────────────────────────────────────

function logId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function now(): string {
  return new Date().toISOString()
}

function makeLog(
  level: LogEntry['level'],
  message: string,
  tool?: SourceTool,
): LogEntry {
  return { id: logId(), timestamp: now(), level, message, tool }
}

// ── Mock pipeline simulation ──────────────────────────────────

function runMockPipeline(): () => void {
  const { setStatus, addLog, markDetectorDone, setScanId, setJobId } =
    usePipelineStore.getState()
  const { setFindings, setCurrentPatch, setCurrentScan } =
    useProjectStore.getState()

  const timers: ReturnType<typeof setTimeout>[] = []

  const schedule = (fn: () => void, delayMs: number) => {
    timers.push(setTimeout(fn, delayMs))
  }

  // t=0: ANALYZED
  schedule(() => {
    setStatus('ANALYZED')
    addLog(makeLog('info', 'Project analysed. Language: Python. Entry point: src/marks/calculator.py.'))
    setScanId(MOCK_SCAN.id)
    setJobId(MOCK_SCAN.job_id)
    setCurrentScan({ ...MOCK_SCAN, status: 'ANALYZED' })
  }, 500)

  // t=1500: SCANNING
  schedule(() => {
    setStatus('SCANNING')
    addLog(makeLog('info', 'Detectors starting: ruff, bandit, llm.'))
  }, 1500)

  // t=1700: ruff done
  schedule(() => {
    markDetectorDone('ruff', 1, 180)
    addLog(makeLog('success', 'ruff — 1 finding (Medium) in 180 ms.', 'ruff'))
  }, 1700)

  // t=1900: bandit done
  schedule(() => {
    markDetectorDone('bandit', 1, 220)
    addLog(makeLog('success', 'bandit — 1 finding (High) in 220 ms.', 'bandit'))
  }, 1900)

  // t=2100: llm done
  schedule(() => {
    markDetectorDone('llm', 1, 1850)
    addLog(
      makeLog(
        'warn',
        'llm — 1 candidate finding (Critical) in 1 850 ms. Human review required.',
        'llm',
      ),
    )
  }, 2100)

  // t=2600: FINDINGS_READY
  schedule(() => {
    setStatus('FINDINGS_READY')
    setCurrentScan({ ...MOCK_SCAN, status: 'FINDINGS_READY' })
    setFindings(MOCK_FINDINGS)
    addLog(makeLog('success', '3 findings detected. Ready for review.'))
  }, 2600)

  // t=3200: PATCH_GENERATING
  schedule(() => {
    setStatus('PATCH_GENERATING')
    addLog(makeLog('info', 'Generating patch for finding f1 (Critical)…', 'llm'))
  }, 3200)

  // t=4500: PATCH_READY
  schedule(() => {
    setStatus('PATCH_READY')
    setCurrentPatch(MOCK_PATCH)
    addLog(makeLog('success', 'Patch generated. Diff ready for review.'))
  }, 4500)

  // Cleanup: cancel all pending timers.
  return () => timers.forEach(clearTimeout)
}

// ── Real SSE dispatcher ───────────────────────────────────────

function dispatchSSEEvent(type: SSEEventType, payload: unknown): void {
  const { setStatus, addLog, markDetectorDone } = usePipelineStore.getState()
  const { setCurrentScan, setFindings, setCurrentPatch } =
    useProjectStore.getState()

  switch (type) {
    case 'job.stage': {
      const p = payload as StagePayload
      setStatus(p.stage)
      addLog(makeLog('info', `Pipeline stage: ${p.stage}`))
      break
    }

    case 'job.detector_done': {
      const p = payload as DetectorDonePayload
      markDetectorDone(p.tool, p.finding_count, p.elapsed_ms)
      addLog(
        makeLog(
          'success',
          `${p.tool} — ${p.finding_count} finding(s) in ${p.elapsed_ms} ms.`,
          p.tool,
        ),
      )
      break
    }

    case 'job.findings_ready': {
      const p = payload as FindingsReadyPayload & { scan_id?: string }
      setStatus('FINDINGS_READY')
      addLog(
        makeLog(
          'success',
          `${p.total_findings} findings detected (${p.critical_count} critical). Ready for review.`,
        ),
      )
      const scan = useProjectStore.getState().currentScan
      const sId = p.scan_id || scan?.id || (scan as any)?.scan_id
      if (sId) {
        getFindings(sId).then((data) => {
          if (data && data.findings) {
            setFindings(data.findings)
          }
        }).catch(console.error)
      }
      break
    }

    case 'job.patch_ready': {
      const p = payload as PatchReadyPayload
      setStatus('PATCH_READY')
      addLog(makeLog('success', `Patch ${p.patch_id} ready. Preview: ${p.diff_preview}`))
      break
    }

    case 'job.test_phase': {
      const p = payload as TestPhasePayload
      addLog(
        makeLog(
          p.status === 'failed' ? 'warn' : 'info',
          `Test phase [${p.phase}]: ${p.passed} passed, ${p.failed} failed — ${p.status}.`,
        ),
      )
      break
    }

    case 'job.validation_done': {
      const p = payload as ValidationDonePayload
      setStatus(p.final_status === 'verified' ? 'VERIFIED' : 'NOT_VERIFIED')
      addLog(
        makeLog(
          p.final_status === 'verified' ? 'success' : 'warn',
          `Validation complete: ${p.final_status}. ${p.summary}`,
        ),
      )
      break
    }

    case 'job.decision':
      setStatus('ACCEPTED')
      addLog(makeLog('success', 'Decision recorded.'))
      break

    case 'job.rollback':
      setStatus('ROLLED_BACK')
      addLog(makeLog('warn', 'Patch rolled back.'))
      break

    case 'job.error': {
      const p = payload as JobErrorPayload
      setStatus('FAILED')
      addLog(
        makeLog(
          'error',
          `Pipeline error [${p.code}]: ${p.message}${p.retryable ? ' (retryable)' : ''}`,
        ),
      )
      break
    }

    default:
      break
  }
}

// ── Hook ─────────────────────────────────────────────────────

/**
 * Opens a Server-Sent Events connection for the given job and dispatches
 * typed events to the pipeline and project Zustand stores.
 *
 * In mock mode, runs a simulated pipeline sequence via `setTimeout`s.
 *
 * @param jobId - The job UUID to stream events for. Pass `null` to disable.
 */
export function useSSE(jobId: string | null): void {
  const lastEventIdRef = useRef<string | undefined>(undefined)
  const { incrementRetry, resetRetry } = usePipelineStore.getState()

  useEffect(() => {
    if (!jobId) return

    // ── Mock mode ──────────────────────────────────────────────
    if (isMockMode) {
      const cleanup = runMockPipeline()
      return cleanup
    }

    // ── Real SSE mode ──────────────────────────────────────────
    let es: EventSource | null = null
    let isCancelled = false

    function connect() {
      if (isCancelled) return

      const url = new URL(
        `/api/v1/jobs/${encodeURIComponent(jobId!)}/events`,
        window.location.origin,
      )

      // Re-attach from the last received event when reconnecting.
      if (lastEventIdRef.current) {
        url.searchParams.set('lastEventId', lastEventIdRef.current)
      }

      es = new EventSource(url.toString())

      es.onopen = () => {
        resetRetry()
      }

      // Generic message handler (for un-typed SSE messages).
      es.onmessage = (event: MessageEvent<string>) => {
        if (event.lastEventId) {
          lastEventIdRef.current = event.lastEventId
        }
        try {
          const parsed = JSON.parse(event.data) as {
            type: SSEEventType
            payload: unknown
          }
          dispatchSSEEvent(parsed.type, parsed.payload)
        } catch {
          // Ignore malformed frames.
        }
      }

      // Named-event handlers for each SSE event type.
      const eventTypes: SSEEventType[] = [
        'job.stage',
        'job.detector_done',
        'job.findings_ready',
        'job.patch_ready',
        'job.test_phase',
        'job.validation_done',
        'job.decision',
        'job.rollback',
        'job.error',
      ]

      for (const type of eventTypes) {
        es.addEventListener(type, (event: Event) => {
          const msgEvent = event as MessageEvent<string>
          if (msgEvent.lastEventId) {
            lastEventIdRef.current = msgEvent.lastEventId
          }
          try {
            const payload = JSON.parse(msgEvent.data) as unknown
            dispatchSSEEvent(type, payload)
          } catch {
            // Ignore malformed frames.
          }
        })
      }

      es.onerror = () => {
        if (isCancelled) return
        es?.close()
        incrementRetry()
        // Exponential-backoff reconnect: cap at 30 s.
        const { retryCount } = usePipelineStore.getState()
        const backoffMs = Math.min(1000 * 2 ** retryCount, 30_000)
        setTimeout(connect, backoffMs)
      }
    }

    connect()

    return () => {
      isCancelled = true
      es?.close()
    }
  }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps
}
