// ============================================================
// AutoPatch — Project Store (Zustand)
// Holds all domain data for projects, scans, findings, patches
// and conversation history.
// ============================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
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
} from '@/types'

// ── State shape ───────────────────────────────────────────────

export interface ProjectState {
  // ── Collections ──────────────────────────────────────────────
  /** All projects uploaded in this session. */
  projects: Project[]
  /** All findings for the active scan. */
  findings: Finding[]
  /** Chat messages for the currently selected finding. */
  chatMessages: ChatMessage[]
  /** Patch/decision history for the active project. */
  history: HistoryEntry[]

  // ── Active selections ────────────────────────────────────────
  /** The project currently being worked on. */
  currentProject: Project | null
  /** File tree for `currentProject`. */
  currentTree: ProjectTree | null
  /** Active scan for `currentProject`. */
  currentScan: Scan | null
  /** Finding the user has selected for patching/review. */
  currentFinding: Finding | null
  /** Most recently generated patch for `currentFinding`. */
  currentPatch: Patch | null
  /** Validation result for `currentPatch`. */
  validation: ValidationResult | null
  /** Health snapshot for `currentProject`. */
  health: HealthMetrics | null
}

// ── Action shape ──────────────────────────────────────────────

export interface ProjectActions {
  // ── Project / tree / scan ────────────────────────────────────
  /** Add a project to the list (e.g. after upload). */
  addProject: (project: Project) => void
  /** Set the active project. */
  setCurrentProject: (project: Project | null) => void
  /** Set the file tree for the active project. */
  setCurrentTree: (tree: ProjectTree | null) => void
  /** Set the active scan. */
  setCurrentScan: (scan: Scan | null) => void

  // ── Findings ─────────────────────────────────────────────────
  /** Replace the full findings list. */
  setFindings: (findings: Finding[]) => void
  /** Select a finding for detailed review. */
  setCurrentFinding: (finding: Finding | null) => void
  /** Update a single finding in the list (e.g. after status change). */
  updateFinding: (findingId: string, patch: Partial<Finding>) => void

  // ── Patch / validation ────────────────────────────────────────
  /** Set the generated patch for the current finding. */
  setCurrentPatch: (patch: Patch | null) => void
  /** Set the validation result for the current patch. */
  setValidation: (validation: ValidationResult | null) => void

  // ── Health / history ─────────────────────────────────────────
  /** Set health metrics for the current project. */
  setHealth: (health: HealthMetrics | null) => void
  /** Replace the full history list. */
  setHistory: (history: HistoryEntry[]) => void

  // ── Chat ─────────────────────────────────────────────────────
  /** Replace all chat messages (e.g. when switching findings). */
  setChatMessages: (messages: ChatMessage[]) => void
  /** Append a single message to the conversation. */
  addChatMessage: (message: ChatMessage) => void

  // ── Reset ────────────────────────────────────────────────────
  /** Clear all state back to initial values. */
  resetAll: () => void
}

// ── Initial state ─────────────────────────────────────────────

const initialState: ProjectState = {
  projects: [],
  findings: [],
  chatMessages: [],
  history: [],
  currentProject: null,
  currentTree: null,
  currentScan: null,
  currentFinding: null,
  currentPatch: null,
  validation: null,
  health: null,
}

// ── Store ─────────────────────────────────────────────────────

export const useProjectStore = create<ProjectState & ProjectActions>()(
  devtools(
    (set) => ({
      ...initialState,

      // ── Project / tree / scan ──────────────────────────────────
      addProject: (project) =>
        set(
          (state) => ({ projects: [...state.projects, project] }),
          false,
          'project/addProject',
        ),

      setCurrentProject: (project) =>
        set({ currentProject: project }, false, 'project/setCurrentProject'),

      setCurrentTree: (tree) =>
        set({ currentTree: tree }, false, 'project/setCurrentTree'),

      setCurrentScan: (scan) =>
        set({ currentScan: scan }, false, 'project/setCurrentScan'),

      // ── Findings ───────────────────────────────────────────────
      setFindings: (findings) =>
        set({ findings }, false, 'project/setFindings'),

      setCurrentFinding: (finding) =>
        set({ currentFinding: finding }, false, 'project/setCurrentFinding'),

      updateFinding: (findingId, patch) =>
        set(
          (state) => ({
            findings: state.findings.map((f) =>
              f.id === findingId ? { ...f, ...patch } : f,
            ),
            // Also update currentFinding if it's the same record.
            currentFinding:
              state.currentFinding?.id === findingId
                ? { ...state.currentFinding, ...patch }
                : state.currentFinding,
          }),
          false,
          'project/updateFinding',
        ),

      // ── Patch / validation ─────────────────────────────────────
      setCurrentPatch: (patchData) =>
        set({ currentPatch: patchData }, false, 'project/setCurrentPatch'),

      setValidation: (validation) =>
        set({ validation }, false, 'project/setValidation'),

      // ── Health / history ───────────────────────────────────────
      setHealth: (health) =>
        set({ health }, false, 'project/setHealth'),

      setHistory: (history) =>
        set({ history }, false, 'project/setHistory'),

      // ── Chat ───────────────────────────────────────────────────
      setChatMessages: (chatMessages) =>
        set({ chatMessages }, false, 'project/setChatMessages'),

      addChatMessage: (message) =>
        set(
          (state) => ({ chatMessages: [...state.chatMessages, message] }),
          false,
          'project/addChatMessage',
        ),

      // ── Reset ──────────────────────────────────────────────────
      resetAll: () => set(initialState, false, 'project/resetAll'),
    }),
    { name: 'AutoPatch/Project' },
  ),
)
