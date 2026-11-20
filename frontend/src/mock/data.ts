// ============================================================
// AutoPatch — Mock Data
// All values mirror the backend Pydantic schemas exactly.
// ============================================================

import type {
  Project,
  ProjectTree,
  Scan,
  Finding,
  Patch,
  ValidationResult,
  HealthMetrics,
  HistoryEntry,
  ChatMessage,
  LogEntry,
} from '@/types'

// ── Project ──────────────────────────────────────────────────

export const MOCK_PROJECT: Project = {
  id: 'proj-001',
  name: 'python_marks',
  language: 'python',
  language_confidence: 1.0,
  language_reasons: [
    'Found Python requirements.txt manifest',
    'Found 2 Python source file(s) (.py)',
  ],
  file_count: 5,
  created_at: '2026-11-19T08:00:00.000Z',
}

// ── Project Tree ─────────────────────────────────────────────

export const MOCK_TREE: ProjectTree = {
  project_id: 'proj-001',
  language: 'python',
  language_confidence: 1.0,
  language_reasons: [
    'Found Python requirements.txt manifest',
    'Found 2 Python source file(s) (.py)',
  ],
  entry_point: 'src/marks/calculator.py',
  tree: [
    {
      path: 'src',
      type: 'dir',
      children: [
        {
          path: 'src/marks',
          type: 'dir',
          children: [
            {
              path: 'src/marks/__init__.py',
              type: 'file',
              size_bytes: 0,
            },
            {
              path: 'src/marks/calculator.py',
              type: 'file',
              size_bytes: 1240,
            },
          ],
        },
      ],
    },
    {
      path: 'tests',
      type: 'dir',
      children: [
        {
          path: 'tests/__init__.py',
          type: 'file',
          size_bytes: 0,
        },
        {
          path: 'tests/test_calculator.py',
          type: 'file',
          size_bytes: 2048,
        },
      ],
    },
    {
      path: 'requirements.txt',
      type: 'file',
      size_bytes: 64,
    },
  ],
  source_file_count: 5,
  test_files: ['tests/test_calculator.py'],
  dependencies: ['pytest', 'ruff', 'bandit'],
  missing_dependencies: [],
}

// ── Scan ─────────────────────────────────────────────────────

export const MOCK_SCAN: Scan = {
  id: 'scan-001',
  project_id: 'proj-001',
  status: 'FINDINGS_READY',
  tool_versions: {
    ruff: '0.4.4',
    bandit: '1.7.8',
    pytest: '8.2.0',
  },
  started_at: '2026-11-19T08:01:00.000Z',
  finished_at: '2026-11-19T08:01:45.000Z',
  job_id: 'job-abc-123',
  stream_url: '/api/v1/jobs/job-abc-123/events',
}

// ── Findings ─────────────────────────────────────────────────

export const MOCK_FINDINGS: Finding[] = [
  {
    id: 'f1',
    scan_id: 'scan-001',
    file: 'marks/calculator.py',
    line_start: 2,
    line_end: 8,
    title: 'ZeroDivisionError on empty list',
    description:
      'The `average_marks` function does not guard against an empty input list. ' +
      'Calling `sum(marks) / len(marks)` when `marks` is `[]` raises `ZeroDivisionError` ' +
      'at runtime, crashing the application.',
    trigger: 'average_marks([])',
    repro_input: '[]',
    expected: 'Returns 0.0 or raises ValueError with a helpful message.',
    actual: 'ZeroDivisionError: division by zero',
    root_cause:
      'No guard clause checks for an empty list before the division operation.',
    source: 'llm',
    severity: 'Critical',
    severity_reason:
      'Division-by-zero crash on a core business function with no error handling.',
    confidence_estimate: 0.95,
    is_candidate: true,
    status: 'open',
  },
  {
    id: 'f2',
    scan_id: 'scan-001',
    file: 'marks/calculator.py',
    line_start: 2,
    line_end: 15,
    title: 'No input validation for mark ranges',
    description:
      'Individual marks are accepted without bounds checking. Values outside the ' +
      'valid range (0–100) silently corrupt grade calculations.',
    trigger: 'average_marks([150, -10, 80])',
    repro_input: '[150, -10, 80]',
    expected: 'Raises ValueError for out-of-range marks.',
    actual: 'Returns 73.33 — an incorrect and misleading average.',
    root_cause: 'Bandit B101 / missing input validation on numeric inputs.',
    source: 'bandit',
    severity: 'High',
    severity_reason:
      'Silent data corruption in a scoring system; no exception is raised.',
    confidence_estimate: 0.82,
    is_candidate: false,
    status: 'open',
  },
  {
    id: 'f3',
    scan_id: 'scan-001',
    file: 'marks/calculator.py',
    line_start: 1,
    line_end: 1,
    title: 'Missing type annotations',
    description:
      'Public functions lack PEP 484 type annotations. This reduces IDE support, ' +
      'makes static analysis less effective, and obscures the expected parameter types.',
    trigger: 'ruff ANN001/ANN201',
    repro_input: 'N/A — static analysis finding.',
    expected: 'All public functions annotated with parameter and return types.',
    actual: 'No type annotations present.',
    root_cause: 'Developer did not add type hints when writing the module.',
    source: 'ruff',
    severity: 'Medium',
    severity_reason:
      'Code quality issue affecting maintainability and static analysis coverage.',
    confidence_estimate: 1.0,
    is_candidate: false,
    status: 'open',
  },
]

// ── Patch ─────────────────────────────────────────────────────

export const MOCK_PATCH: Patch = {
  id: 'patch-001',
  finding_id: 'f1',
  diff: `--- a/marks/calculator.py
+++ b/marks/calculator.py
@@ -1,10 +1,20 @@
+from __future__ import annotations
+
 def average_marks(marks: list[float]) -> float:
-    \"\"\"Return the arithmetic mean of a list of marks.\"\"\"
-    return sum(marks) / len(marks)
+    \"\"\"Return the arithmetic mean of a list of marks.
+
+    Args:
+        marks: A list of numeric mark values in the range [0, 100].
+
+    Returns:
+        The arithmetic mean, or 0.0 if the list is empty.
+
+    Raises:
+        ValueError: If any mark is outside the valid range [0, 100].
+    \"\"\"
+    if not marks:
+        return 0.0
+    for mark in marks:
+        if not (0 <= mark <= 100):
+            raise ValueError(
+                f"Mark {mark!r} is out of valid range [0, 100]."
+            )
+    return sum(marks) / len(marks)
`,
  explanation:
    'Added two guard clauses: (1) an early return of `0.0` when the input list is ' +
    'empty, eliminating the `ZeroDivisionError`; (2) a bounds-checking loop that ' +
    'raises `ValueError` for any mark outside [0, 100], preventing silent data ' +
    'corruption. The docstring is updated to document the new behaviour.',
  attempt: 1,
  created_at: '2026-11-19T08:02:30.000Z',
  line_changes: [
    { line: 1,  action: 'add',     content: 'from __future__ import annotations' },
    { line: 2,  action: 'add',     content: '' },
    { line: 3,  action: 'context', content: 'def average_marks(marks: list[float]) -> float:' },
    { line: 4,  action: 'remove',  content: '    """Return the arithmetic mean of a list of marks."""' },
    { line: 5,  action: 'remove',  content: '    return sum(marks) / len(marks)' },
    { line: 4,  action: 'add',     content: '    """Return the arithmetic mean of a list of marks.' },
    { line: 5,  action: 'add',     content: '' },
    { line: 6,  action: 'add',     content: '    Args:' },
    { line: 7,  action: 'add',     content: '        marks: A list of numeric mark values in the range [0, 100].' },
    { line: 8,  action: 'add',     content: '' },
    { line: 9,  action: 'add',     content: '    Returns:' },
    { line: 10, action: 'add',     content: '        The arithmetic mean, or 0.0 if the list is empty.' },
    { line: 11, action: 'add',     content: '' },
    { line: 12, action: 'add',     content: '    Raises:' },
    { line: 13, action: 'add',     content: '        ValueError: If any mark is outside the valid range [0, 100].' },
    { line: 14, action: 'add',     content: '    """' },
    { line: 15, action: 'add',     content: '    if not marks:' },
    { line: 16, action: 'add',     content: '        return 0.0' },
    { line: 17, action: 'add',     content: '    for mark in marks:' },
    { line: 18, action: 'add',     content: '        if not (0 <= mark <= 100):' },
    { line: 19, action: 'add',     content: '            raise ValueError(' },
    { line: 20, action: 'add',     content: '                f"Mark {mark!r} is out of valid range [0, 100]."' },
    { line: 21, action: 'add',     content: '            )' },
    { line: 22, action: 'add',     content: '    return sum(marks) / len(marks)' },
  ],
}

// ── Validation Result ─────────────────────────────────────────

export const MOCK_VALIDATION: ValidationResult = {
  patch_id: 'patch-001',
  overall_status: 'verified',
  phases: [
    {
      id: 'run-before-001',
      patch_id: 'patch-001',
      phase: 'before',
      exit_code: 1,
      passed: 2,
      failed: 1,
      status: 'failed',
      reason: 'test_average_empty_list failed with ZeroDivisionError before patch.',
      raw_output:
        'FAILED tests/test_calculator.py::test_average_empty_list - ZeroDivisionError: division by zero\n2 passed, 1 failed in 0.42s',
      duration_ms: 420,
    },
    {
      id: 'run-targeted-001',
      patch_id: 'patch-001',
      phase: 'targeted',
      exit_code: 0,
      passed: 3,
      failed: 0,
      status: 'verified',
      reason: null,
      raw_output: '3 passed in 0.38s',
      duration_ms: 380,
    },
    {
      id: 'run-edge-001',
      patch_id: 'patch-001',
      phase: 'edge',
      exit_code: 0,
      passed: 5,
      failed: 0,
      status: 'verified',
      reason: null,
      raw_output: '5 passed in 0.51s',
      duration_ms: 510,
    },
    {
      id: 'run-after-001',
      patch_id: 'patch-001',
      phase: 'after',
      exit_code: 0,
      passed: 8,
      failed: 0,
      status: 'verified',
      reason: null,
      raw_output: '8 passed in 0.73s',
      duration_ms: 730,
    },
  ],
}

// ── Health Metrics ────────────────────────────────────────────

export const MOCK_HEALTH: HealthMetrics = {
  project_id: 'proj-001',
  total_bugs: 3,
  critical_count: 1,
  high_count: 1,
  medium_count: 1,
  low_count: 0,
  files_affected: 1,
  tests_passed: 8,
  tests_failed: 0,
  bugs_fixed: 1,
  bugs_remaining: 2,
  security_findings: 1,
}

// ── History ───────────────────────────────────────────────────

export const MOCK_HISTORY: HistoryEntry[] = [
  {
    finding_id: 'f1',
    finding_title: 'ZeroDivisionError on empty list',
    severity: 'Critical',
    patch_id: 'patch-001',
    attempt: 1,
    overall_test_status: 'verified',
    decision: 'accept',
    decided_at: '2026-11-19T08:05:00.000Z',
    phases: [
      { phase: 'before',   status: 'failed'   },
      { phase: 'targeted', status: 'verified' },
      { phase: 'edge',     status: 'verified' },
      { phase: 'after',    status: 'verified' },
    ],
  },
]

// ── Chat Messages ─────────────────────────────────────────────

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-001',
    finding_id: 'f1',
    role: 'user',
    content:
      'Why does `average_marks([])` crash? I expected it to return 0.',
    created_at: '2026-11-19T08:03:10.000Z',
  },
  {
    id: 'msg-002',
    finding_id: 'f1',
    role: 'assistant',
    content:
      "Great question! Python's built-in `len([])` returns `0`, so the expression " +
      '`sum([]) / len([])` evaluates to `0 / 0`, which raises `ZeroDivisionError`.\n\n' +
      'The patch adds a guard clause at the top of the function:\n\n' +
      '```python\nif not marks:\n    return 0.0\n```\n\n' +
      'This short-circuits before the division is ever attempted, returning `0.0` ' +
      'for an empty list—which matches your expectation. The existing tests still ' +
      'pass, and a new targeted test confirms the empty-list case is now handled.',
    created_at: '2026-11-19T08:03:14.000Z',
  },
]

// ── Log Entries ───────────────────────────────────────────────

export const MOCK_LOG_ENTRIES: LogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-11-19T08:01:02.000Z',
    level: 'info',
    message: 'Starting ruff linter on 2 source files…',
    tool: 'ruff',
  },
  {
    id: 'log-002',
    timestamp: '2026-11-19T08:01:05.000Z',
    level: 'success',
    message: 'ruff completed — 1 finding (Medium): ANN001/ANN201 missing type annotations.',
    tool: 'ruff',
  },
  {
    id: 'log-003',
    timestamp: '2026-11-19T08:01:06.000Z',
    level: 'info',
    message: 'Starting bandit security scanner on 2 source files…',
    tool: 'bandit',
  },
  {
    id: 'log-004',
    timestamp: '2026-11-19T08:01:11.000Z',
    level: 'success',
    message: 'bandit completed — 1 finding (High): B101 no input validation for mark ranges.',
    tool: 'bandit',
  },
  {
    id: 'log-005',
    timestamp: '2026-11-19T08:01:12.000Z',
    level: 'info',
    message: 'Starting LLM deep analysis on marks/calculator.py…',
    tool: 'llm',
  },
  {
    id: 'log-006',
    timestamp: '2026-11-19T08:01:44.000Z',
    level: 'warn',
    message:
      'LLM completed — 1 candidate finding (Critical): ZeroDivisionError on empty list. ' +
      'Confidence 0.95. Marked as candidate — human review required.',
    tool: 'llm',
  },
]
