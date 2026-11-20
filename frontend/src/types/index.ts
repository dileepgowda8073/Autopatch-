// ============================================================
// AutoPatch — Shared TypeScript Types
// All schemas mirror the backend Pydantic models exactly.
// ============================================================

// ── Enums ───────────────────────────────────────────────────────────────

export type Severity   = 'Critical' | 'High' | 'Medium' | 'Low'
export type SourceTool = 'ruff' | 'bandit' | 'pytest' | 'javac' | 'spotbugs' | 'checkstyle' | 'junit' | 'llm'
export type Language   = 'python' | 'java' | 'mixed' | 'unknown'

export type ScanStatus =
  | 'UPLOADED'
  | 'ANALYZED'
  | 'SCANNING'
  | 'FINDINGS_READY'
  | 'PATCH_GENERATING'
  | 'PATCH_READY'
  | 'VALIDATING'
  | 'VERIFIED'
  | 'FAILED'
  | 'NOT_VERIFIED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'NEEDS_REVIEW'
  | 'ROLLED_BACK'

export type ValidationStatus = 'verified' | 'failed' | 'not_verified'
export type TestPhase         = 'before' | 'targeted' | 'edge' | 'after'
export type DecisionType      = 'accept' | 'reject' | 'needs_review' | 'rollback'
export type FindingStatus     = 'open' | 'patched' | 'accepted' | 'rejected' | 'needs_review'

// ── Core models ─────────────────────────────────────────────────────────

export interface Project {
  id:                   string
  name:                 string
  language:             Language
  language_confidence?: number
  language_reasons?:    string[]
  file_count:           number
  created_at:           string
}

export interface TreeNode {
  path:       string
  type:       'file' | 'dir'
  size_bytes?: number
  children?:  TreeNode[]
}

export interface ProjectTree {
  project_id:           string
  language:             Language
  language_confidence?: number
  language_reasons?:    string[]
  entry_point:          string | null
  tree:                 TreeNode[]
  source_file_count:    number
  test_files:           string[]
  dependencies:         string[]
  missing_dependencies: string[]
}

export interface Scan {
  id:           string
  project_id:   string
  status:       ScanStatus
  tool_versions:Record<string, string>
  started_at:   string
  finished_at:  string | null
  job_id:       string
  stream_url:   string
}

export interface Finding {
  id:                  string
  scan_id:             string
  file:                string
  line_start:          number
  line_end:            number
  title:               string
  description:         string
  trigger:             string
  repro_input:         string
  expected:            string
  actual:              string
  root_cause:          string
  source:              SourceTool
  severity:            Severity
  severity_reason:     string
  /** Displayed with label "AI estimate — not a measured probability" */
  confidence_estimate: number
  /** LLM findings are candidates, not certainties */
  is_candidate:        boolean
  status:              FindingStatus
}

export interface LineChange {
  line:    number
  action:  'add' | 'remove' | 'context'
  content: string
}

export interface Patch {
  id:          string
  finding_id:  string
  diff:        string
  explanation: string
  attempt:     number
  created_at:  string
  line_changes:LineChange[]
}

export interface TestRunResult {
  id:          string
  patch_id:    string
  phase:       TestPhase
  exit_code:   number
  passed:      number
  failed:      number
  status:      ValidationStatus
  reason:      string | null
  raw_output:  string
  duration_ms: number
}

export interface ValidationResult {
  patch_id:       string
  overall_status: ValidationStatus
  phases:         TestRunResult[]
}

export interface Decision {
  id:          string
  patch_id:    string
  decision:    DecisionType
  note:        string | null
  decided_at:  string
  download_url?:string
}

export interface HealthMetrics {
  project_id:        string
  total_bugs:        number
  critical_count:    number
  high_count:        number
  medium_count:      number
  low_count:         number
  files_affected:    number
  tests_passed:      number
  tests_failed:      number
  bugs_fixed:        number
  bugs_remaining:    number
  security_findings: number
}

export interface HistoryEntry {
  finding_id:          string
  finding_title:       string
  severity:            Severity
  patch_id:            string
  attempt:             number
  overall_test_status: ValidationStatus
  decision:            DecisionType
  decided_at:          string
  phases:              { phase: TestPhase; status: ValidationStatus }[]
}

export interface ChatMessage {
  id:         string
  finding_id: string
  role:       'user' | 'assistant'
  content:    string
  created_at: string
}

// ── SSE event payloads ───────────────────────────────────────────────────

export type SSEEventType =
  | 'job.stage'
  | 'job.detector_done'
  | 'job.findings_ready'
  | 'job.patch_ready'
  | 'job.test_phase'
  | 'job.validation_done'
  | 'job.decision'
  | 'job.rollback'
  | 'job.error'

export interface SSEEvent<T = unknown> {
  type:    SSEEventType
  payload: T
}

export interface StagePayload {
  stage:       ScanStatus
  tools?:      SourceTool[]
  tree?:       TreeNode[]
  language?:   Language
  entry_point?:string | null
}

export interface DetectorDonePayload {
  tool:          SourceTool
  finding_count: number
  elapsed_ms:    number
}

export interface FindingsReadyPayload {
  total_findings: number
  critical_count: number
}

export interface PatchReadyPayload {
  patch_id:     string
  diff_preview: string
}

export interface TestPhasePayload {
  phase:  TestPhase
  passed: number
  failed: number
  status: ValidationStatus
}

export interface ValidationDonePayload {
  final_status: ValidationStatus
  summary:      string
  reason?:      string
}

export interface JobErrorPayload {
  code:      string
  message:   string
  retryable: boolean
}

// ── API helpers ──────────────────────────────────────────────────────────

export interface ApiError {
  code:    string
  message: string
  details: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  total:     number
  page:      number
  page_size: number
  items:     T[]
}

// ── UI-only types ────────────────────────────────────────────────────────

/** Progress log entry shown in the scanning view */
export interface LogEntry {
  id:        string
  timestamp: string
  level:     'info' | 'warn' | 'error' | 'success'
  message:   string
  tool?:     SourceTool
}

/** Pipeline stage for the 3D rail */
export interface PipelineStage {
  id:    ScanStatus
  label: string
  icon:  string
  order: number
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'UPLOADED',         label: 'Upload',   icon: '↑', order: 0 },
  { id: 'ANALYZED',         label: 'Analyze',  icon: '🔍', order: 1 },
  { id: 'SCANNING',         label: 'Scan',     icon: '⚡', order: 2 },
  { id: 'FINDINGS_READY',   label: 'Findings', icon: '🐛', order: 3 },
  { id: 'PATCH_GENERATING', label: 'Fix',      icon: '🔧', order: 4 },
  { id: 'VALIDATING',       label: 'Test',     icon: '🧪', order: 5 },
  { id: 'VERIFIED',         label: 'Review',   icon: '✓', order: 6 },
]

export const SEVERITY_ORDER: Record<Severity, number> = {
  Critical: 0, High: 1, Medium: 2, Low: 3,
}

export const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: '#EF4444',
  High:     '#F97316',
  Medium:   '#F59E0B',
  Low:      '#06B6D4',
}

export const SOURCE_LABELS: Record<SourceTool, string> = {
  ruff:        'Ruff',
  bandit:      'Bandit',
  pytest:      'pytest',
  javac:       'javac',
  spotbugs:    'SpotBugs',
  checkstyle:  'Checkstyle',
  junit:       'JUnit',
  llm:         'AI',
}

export const VALIDATION_COLORS: Record<ValidationStatus, string> = {
  verified:     '#10B981',
  failed:       '#EF4444',
  not_verified: '#F59E0B',
}

export const VALIDATION_LABELS: Record<ValidationStatus, string> = {
  verified:     'Verified',
  failed:       'Failed',
  not_verified: 'Not Verified',
}
