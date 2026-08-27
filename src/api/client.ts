import axios, { AxiosError } from 'axios'
import { getRefreshToken, setRefreshToken } from '@/auth/tokenStorage'
import { ApiError, normalizeAxiosError } from './errors'

/**
 * Just the host — e.g. "http://localhost:5000", or "" for same-origin (the
 * mock, or a real deployment served from the same host as the frontend).
 * Every documented route on this platform already starts with /api (the
 * auth doc's base path is /api/auth, FutureSchool's is /api/v1/future-school)
 * — that prefix is a fixed platform convention, not something each deployment
 * configures, so it's baked into API_ROOT below rather than left for
 * VITE_API_BASE_URL to remember to include.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const API_ROOT = `${API_BASE_URL}/api`

/**
 * The FutureSchool scheduling module (schools/teachers/classes/subjects/
 * workloads/availability/schedules) is mounted at this sub-path on the same
 * host and JWT as the platform's existing /auth, /tenants and /users routes.
 */
export const FUTURESCHOOL_BASE = '/v1/future-school'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

/** Dispatched when a refresh attempt fails and the session must be torn down. */
export const SESSION_EXPIRED_EVENT = 'auth:session-expired'

export const apiClient = axios.create({
  baseURL: API_ROOT,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return config
})

interface RefreshResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

let refreshPromise: Promise<string | null> | null = null

/**
 * The refresh token rotates on every use — the server treats reuse of an
 * already-rotated token as a stolen-token signal and revokes every session
 * for the account. A single in-flight promise (shared across every caller —
 * the response interceptor below *and* AuthProvider's bootstrap-on-load —
 * is what keeps two near-simultaneous refresh attempts (React StrictMode's
 * double effect invocation, a racing 401, two tabs) from ever sending the
 * same refresh token twice. Every caller MUST go through this function
 * rather than hitting authApi.refresh() directly.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storedRefreshToken = getRefreshToken()
      if (!storedRefreshToken) return null
      try {
        const res = await axios.post<RefreshResponse>(`${API_ROOT}/auth/refresh`, { refreshToken: storedRefreshToken })
        setRefreshToken(res.data.refreshToken)
        return res.data.accessToken
      } catch {
        setRefreshToken(null)
        return null
      }
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retried?: boolean }) | undefined
    // Public auth endpoints (login, 2FA, refresh itself) issue their own 401s for
    // invalid credentials/codes — those must surface as-is, never trigger a refresh.
    const isPublicAuthCall = originalRequest?.url?.includes('/auth/')

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isPublicAuthCall) {
      originalRequest._retried = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        setAccessToken(newToken)
        originalRequest.headers?.set?.('Authorization', `Bearer ${newToken}`)
        return apiClient(originalRequest)
      }
      setAccessToken(null)
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
      return Promise.reject(new ApiError({ status: 401, message: 'Your session has expired. Please sign in again.' }))
    }

    return Promise.reject(normalizeAxiosError(error))
  },
)
