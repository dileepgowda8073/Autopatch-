// ============================================================
// AutoPatch — Patches API
// Endpoints for patch generation, validation, and decisions.
// ============================================================

import client, { isMockMode } from './client'
import { MOCK_PATCH, MOCK_VALIDATION } from '@/mock/data'
import type { Patch, ValidationResult, Decision, DecisionType } from '@/types'

// ── Utility ───────────────────────────────────────────────────

function mockDelay(min = 300, max = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// ── API functions ─────────────────────────────────────────────

/**
 * Request patch generation for a specific finding.
 * If `forceRegenerate` is `true`, the backend discards any cached patch and
 * re-runs the LLM.
 *
 * @param findingId       - The finding UUID.
 * @param forceRegenerate - When true, bypass the patch cache.
 * @returns The generated {@link Patch}.
 */
export async function generatePatch(
  findingId: string,
  forceRegenerate = false,
): Promise<Patch> {
  if (isMockMode) {
    // Simulate LLM latency for patch generation.
    await mockDelay(600, 1200)
    return clone(MOCK_PATCH)
  }

  const response = await client.post<Patch>('/patches', {
    finding_id: findingId,
    force_regenerate: forceRegenerate,
  })
  return response.data
}

/**
 * Retrieve a previously generated patch, including its full unified diff and
 * per-line change list.
 *
 * @param patchId - The patch UUID.
 * @returns The {@link Patch} record.
 */
export async function getPatchDiff(patchId: string): Promise<Patch> {
  if (isMockMode) {
    await mockDelay()
    return clone(MOCK_PATCH)
  }

  const response = await client.get<Patch>(`/patches/${patchId}/diff`)
  return response.data
}

/**
 * Trigger test-suite validation for a patch (before / targeted / edge / after
 * test phases).
 *
 * @param patchId - The patch UUID.
 * @returns A {@link ValidationResult} with per-phase test run details.
 */
export async function validatePatch(patchId: string): Promise<ValidationResult> {
  if (isMockMode) {
    // Validation takes noticeably longer than a simple read.
    await mockDelay(1000, 2000)
    return clone(MOCK_VALIDATION)
  }

  const response = await client.post<ValidationResult>(
    `/patches/${patchId}/validate`,
  )
  return response.data
}

/**
 * Record a human decision on a validated patch.
 *
 * @param patchId  - The patch UUID.
 * @param decision - One of `accept | reject | needs_review | rollback`.
 * @param note     - Optional free-text rationale stored with the decision.
 * @returns The persisted {@link Decision} record.
 */
export async function makeDecision(
  patchId: string,
  decision: DecisionType,
  note?: string,
): Promise<Decision> {
  if (isMockMode) {
    await mockDelay()
    const mockDecision: Decision = {
      id: `dec-${Date.now()}`,
      patch_id: patchId,
      decision,
      note: note ?? null,
      decided_at: new Date().toISOString(),
      download_url:
        decision === 'accept'
          ? `/api/v1/projects/proj-001/download`
          : undefined,
    }
    return mockDecision
  }

  const response = await client.post<Decision>(`/patches/${patchId}/decision`, {
    decision,
    note: note ?? null,
  })
  return response.data
}

/**
 * Roll back a previously accepted patch, restoring the original source file(s).
 *
 * @param patchId - The patch UUID to roll back.
 * @returns An object containing the ISO timestamp of when the rollback occurred.
 */
export async function rollbackPatch(
  patchId: string,
): Promise<{ rolled_back_at: string }> {
  if (isMockMode) {
    await mockDelay()
    return { rolled_back_at: new Date().toISOString() }
  }

  const response = await client.post<{ rolled_back_at: string }>(
    `/patches/${patchId}/rollback`,
  )
  return response.data
}
