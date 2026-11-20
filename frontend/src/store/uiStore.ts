// ============================================================
// AutoPatch — UI Store (Zustand)
// Transient UI state: drawer toggles, toast notifications,
// viewport flags, and accessibility preferences.
// ============================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// ── Toast type ────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

// ── State shape ───────────────────────────────────────────────

export interface UIState {
  /** Whether the main navigation sidebar is open. */
  sidebarOpen: boolean
  /** Whether the AI chat drawer is open. */
  chatDrawerOpen: boolean
  /** ID of the finding whose detail panel / chat drawer is active. */
  activeFindingId: string | null
  /** Stack of live toast notifications. */
  toasts: Toast[]
  /** True when the viewport width is below the mobile breakpoint. */
  isMobile: boolean
  /**
   * True when the user has opted into reduced-motion via their OS/browser
   * settings. Initialised from `window.matchMedia`.
   */
  reducedMotion: boolean
}

// ── Action shape ──────────────────────────────────────────────

export interface UIActions {
  /** Toggle the sidebar open/closed. */
  toggleSidebar: () => void
  /** Set the sidebar to an explicit open state. */
  setSidebarOpen: (open: boolean) => void

  /** Toggle the AI chat drawer open/closed. */
  toggleChatDrawer: () => void
  /** Set the chat drawer to an explicit open state. */
  setChatDrawerOpen: (open: boolean) => void

  /** Set the active finding ID (opens the detail panel). */
  setActiveFindingId: (id: string | null) => void

  /**
   * Push a new toast notification onto the stack.
   *
   * @param type    - Visual style (success | error | info | warning).
   * @param message - Human-readable notification text.
   */
  addToast: (type: ToastType, message: string) => void
  /**
   * Remove a toast by its ID (called after auto-dismiss or manual close).
   *
   * @param id - The toast UUID to remove.
   */
  removeToast: (id: string) => void

  /** Update the mobile-viewport flag (called by a window resize listener). */
  setIsMobile: (isMobile: boolean) => void
  /** Update the reduced-motion preference flag. */
  setReducedMotion: (reducedMotion: boolean) => void
}

// ── Helpers ───────────────────────────────────────────────────

/** Detect the user's reduced-motion OS preference, if available. */
function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Generate a short unique ID for toast instances. */
function toastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Initial state ─────────────────────────────────────────────

const initialState: UIState = {
  sidebarOpen: true,
  chatDrawerOpen: false,
  activeFindingId: null,
  toasts: [],
  isMobile: typeof window !== 'undefined' && window.innerWidth < 768,
  reducedMotion: detectReducedMotion(),
}

// ── Store ─────────────────────────────────────────────────────

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    (set) => ({
      ...initialState,

      // ── Sidebar ────────────────────────────────────────────────
      toggleSidebar: () =>
        set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          'ui/toggleSidebar',
        ),

      setSidebarOpen: (open) =>
        set({ sidebarOpen: open }, false, 'ui/setSidebarOpen'),

      // ── Chat drawer ────────────────────────────────────────────
      toggleChatDrawer: () =>
        set(
          (state) => ({ chatDrawerOpen: !state.chatDrawerOpen }),
          false,
          'ui/toggleChatDrawer',
        ),

      setChatDrawerOpen: (open) =>
        set({ chatDrawerOpen: open }, false, 'ui/setChatDrawerOpen'),

      // ── Active finding ─────────────────────────────────────────
      setActiveFindingId: (id) =>
        set({ activeFindingId: id }, false, 'ui/setActiveFindingId'),

      // ── Toasts ─────────────────────────────────────────────────
      addToast: (type, message) =>
        set(
          (state) => ({
            toasts: [
              ...state.toasts,
              { id: toastId(), type, message },
            ],
          }),
          false,
          'ui/addToast',
        ),

      removeToast: (id) =>
        set(
          (state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }),
          false,
          'ui/removeToast',
        ),

      // ── Viewport / accessibility ───────────────────────────────
      setIsMobile: (isMobile) =>
        set({ isMobile }, false, 'ui/setIsMobile'),

      setReducedMotion: (reducedMotion) =>
        set({ reducedMotion }, false, 'ui/setReducedMotion'),
    }),
    { name: 'AutoPatch/UI' },
  ),
)

export const useUiStore = useUIStore

