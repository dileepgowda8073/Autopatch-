// ============================================================
// AutoPatch — Axios Client
// Shared HTTP client with interceptors and error handling.
// ============================================================

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { ApiError as ApiErrorType } from '@/types'

// ── Environment flags ─────────────────────────────────────────

/**
 * When `true`, all API functions return mock data instead of hitting the
 * real backend. Honors both `VITE_USE_MOCK` and `VITE_MOCK_MODE`.
 * An explicit 'false' on either flag disables mock mode (routes to live API).
 */
export const isMockMode: boolean = (() => {
  const useMock = import.meta.env.VITE_USE_MOCK
  const mockMode = import.meta.env.VITE_MOCK_MODE
  if (useMock === 'false' || mockMode === 'false') {
    return false
  }
  return useMock === 'true' || mockMode === 'true'
})()

// ── ApiError class ────────────────────────────────────────────

/**
 * Structured error thrown by the response interceptor whenever the backend
 * returns a non-2xx status code or the network request fails.
 */
export class ApiError extends Error {
  public readonly code: string
  public readonly details: Record<string, unknown>
  public readonly statusCode: number

  constructor(payload: ApiErrorType, statusCode: number = 0) {
    super(payload.message)
    this.name = 'ApiError'
    this.code = payload.code
    this.details = payload.details ?? {}
    this.statusCode = statusCode
  }
}

// Re-export the plain type alias so consumers can import both.
export type { ApiErrorType }

// ── Axios instance ────────────────────────────────────────────

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'

/** Singleton Axios instance used by all API modules. */
export const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ── Request interceptor ───────────────────────────────────────

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Attach a unique trace ID to every outbound request so logs can be
    // correlated across frontend and backend.
    const requestId = crypto.randomUUID()
    config.headers.set('X-Request-ID', requestId)
    return config
  },
  (error: unknown) => Promise.reject(error),
)

// ── Response interceptor ──────────────────────────────────────

client.interceptors.response.use(
  // Success: unwrap the standard `{ data: T }` envelope the backend sends.
  // If the response body is not an object with a `data` key, return it as-is
  // so raw endpoints (like binary blob downloads) pass through cleanly.
  (response) => {
    const body = response.data
    if (
      body !== null &&
      typeof body === 'object' &&
      'data' in body
    ) {
      return { ...response, data: body.data }
    }
    return response
  },
  // Error: normalise into ApiError instances.
  (error: unknown) => {
    if (error instanceof AxiosError) {
      const statusCode = error.response?.status ?? 0
      const responseBody = error.response?.data

      // Backend returned a structured error envelope.
      if (
        responseBody &&
        typeof responseBody === 'object' &&
        'code' in responseBody &&
        'message' in responseBody
      ) {
        return Promise.reject(
          new ApiError(responseBody as ApiErrorType, statusCode),
        )
      }

      // Generic HTTP error (e.g. 404, 500 without envelope, network timeout).
      return Promise.reject(
        new ApiError(
          {
            code: `HTTP_${statusCode || 'NETWORK_ERROR'}`,
            message:
              error.message ||
              'An unexpected network error occurred. Please try again.',
            details: { url: error.config?.url, method: error.config?.method },
          },
          statusCode,
        ),
      )
    }

    // Non-Axios error — re-throw as-is.
    return Promise.reject(error)
  },
)

export default client
