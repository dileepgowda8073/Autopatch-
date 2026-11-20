// ============================================================
// AutoPatch — Projects API
// All endpoints that relate to project management and scanning.
// ============================================================

import client, { isMockMode } from './client'
import {
  MOCK_PROJECT,
  MOCK_TREE,
  MOCK_SCAN,
  MOCK_FINDINGS,
  MOCK_HEALTH,
  MOCK_HISTORY,
} from '@/mock/data'
import type {
  Project,
  ProjectTree,
  Scan,
  Finding,
  Severity,
  SourceTool,
  HealthMetrics,
  HistoryEntry,
} from '@/types'

// ── Utility ───────────────────────────────────────────────────

/** Returns a promise that resolves after a random delay in [min, max] ms. */
function mockDelay(min = 300, max = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Deep-clones a value so mutations in tests/stores don't affect mock data. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// ── API functions ─────────────────────────────────────────────

/**
 * Upload a project ZIP/archive and register it with the backend.
 *
 * @param file - The archive file selected by the user.
 * @returns The newly created {@link Project} record.
 */
export async function uploadProject(file: File): Promise<Project> {
  if (isMockMode) {
    await mockDelay()
    return clone(MOCK_PROJECT)
  }

  const form = new FormData()
  form.append('file', file)

  const response = await client.post<Project>('/projects', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

/**
 * Retrieve the directory / file tree for an existing project.
 *
 * @param projectId - The project UUID.
 * @returns A {@link ProjectTree} describing the project's file layout.
 */
export async function getProjectTree(projectId: string): Promise<ProjectTree> {
  if (isMockMode) {
    await mockDelay()
    return clone(MOCK_TREE)
  }

  const response = await client.get<ProjectTree>(`/projects/${projectId}/tree`)
  return response.data
}

/**
 * Kick off a new vulnerability scan for a project.
 * The returned {@link Scan} includes the `job_id` needed to open an SSE
 * stream and the `stream_url` shortcut.
 *
 * @param projectId - The project UUID.
 * @returns The created {@link Scan} record.
 */
export async function startScan(projectId: string): Promise<Scan> {
  if (isMockMode) {
    await mockDelay()
    return clone(MOCK_SCAN)
  }

  const response = await client.post<Scan & { scan_id?: string }>(`/projects/${projectId}/scans`)
  const data = response.data
  return {
    ...data,
    id: data.id || data.scan_id || '',
  } as Scan
}

// ── Findings query parameters ─────────────────────────────────

export interface GetFindingsParams {
  /** Filter by severity level. */
  severity?: Severity
  /** Filter by detection source. */
  source?: SourceTool
  /** 1-based page index. */
  page?: number
  /** Number of results per page (default 20, max 100). */
  page_size?: number
}

/**
 * Retrieve findings for a completed scan, with optional filtering and
 * pagination.
 *
 * @param scanId - The scan UUID.
 * @param params - Optional query parameters for filtering and pagination.
 * @returns An object containing the total count and the requested page of
 *   {@link Finding} items.
 */
export async function getFindings(
  scanId: string,
  params?: GetFindingsParams,
): Promise<{ total: number; findings: Finding[] }> {
  if (isMockMode) {
    await mockDelay()
    let findings = clone(MOCK_FINDINGS)

    if (params?.severity) {
      findings = findings.filter((f) => f.severity === params.severity)
    }
    if (params?.source) {
      findings = findings.filter((f) => f.source === params.source)
    }

    const page = params?.page ?? 1
    const pageSize = params?.page_size ?? 20
    const start = (page - 1) * pageSize
    const paged = findings.slice(start, start + pageSize)

    return { total: findings.length, findings: paged }
  }

  const response = await client.get<{ total: number; findings: Finding[] }>(
    `/scans/${scanId}/findings`,
    { params },
  )
  return response.data
}

/**
 * Fetch aggregate health metrics for a project (bug counts, test results, etc.)
 *
 * @param projectId - The project UUID.
 * @returns A {@link HealthMetrics} snapshot.
 */
export async function getHealth(projectId: string): Promise<HealthMetrics> {
  if (isMockMode) {
    await mockDelay()
    return clone(MOCK_HEALTH)
  }

  const response = await client.get<HealthMetrics>(
    `/projects/${projectId}/health`,
  )
  return response.data
}

/**
 * Retrieve the patch/decision history for a project.
 *
 * @param projectId - The project UUID.
 * @returns An array of {@link HistoryEntry} records, newest first.
 */
export async function getHistory(projectId: string): Promise<HistoryEntry[]> {
  if (isMockMode) {
    await mockDelay()
    return clone(MOCK_HISTORY)
  }

  const response = await client.get<HistoryEntry[] | { entries: HistoryEntry[] }>(
    `/projects/${projectId}/history`,
  )
  const data = response.data
  return Array.isArray(data) ? data : (data as { entries?: HistoryEntry[] }).entries ?? []
}

/**
 * Download the repaired project archive as a binary Blob.
 * Triggers the browser's save-file dialog when combined with a temporary
 * anchor element.
 *
 * @param projectId - The project UUID.
 * @returns A {@link Blob} containing the ZIP archive.
 */
export async function downloadProject(projectId: string): Promise<Blob> {
  if (isMockMode) {
    await mockDelay(100, 300)
    // Return a minimal valid ZIP-like blob for testing.
    return new Blob(['MOCK_ZIP_CONTENT'], { type: 'application/zip' })
  }

  const response = await client.get<Blob>(
    `/projects/${projectId}/download`,
    { responseType: 'blob' },
  )
  return response.data
}
