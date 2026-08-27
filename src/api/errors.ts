import type { AxiosError } from 'axios'

export interface FieldError {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly fieldErrors?: FieldError[]
  readonly retryAfterSeconds?: number

  constructor(params: {
    status: number
    message: string
    code?: string
    fieldErrors?: FieldError[]
    retryAfterSeconds?: number
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.fieldErrors = params.fieldErrors
    this.retryAfterSeconds = params.retryAfterSeconds
  }

  get isRateLimit() {
    return this.status === 429
  }

  get isValidation() {
    return this.status === 422 || this.status === 400
  }

  get isAuthError() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isConflict() {
    return this.status === 409
  }
}

function parseRetryAfter(value: string | undefined): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (!Number.isNaN(seconds)) return seconds
  const dateMs = Date.parse(value)
  if (!Number.isNaN(dateMs)) return Math.max(0, Math.round((dateMs - Date.now()) / 1000))
  return undefined
}

const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'The request could not be processed.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to perform this action.",
  404: 'The requested resource could not be found.',
  409: 'This change conflicts with the current state. Please refresh and try again.',
  422: 'Some fields need your attention.',
  429: 'Too many requests. Please slow down and try again shortly.',
  500: 'Something went wrong on our end. Please try again.',
}

/**
 * The FutureSchool API (school/teacher/class/subject/workload/schedule
 * endpoints) responds with RFC 7807 problem details: { status, title, detail }.
 * The platform's own auth/account endpoints (our mock, modeled on the same
 * host's existing /api/auth, /api/users) use a simpler { message, code,
 * errors } shape. Both are handled here so callers only ever see ApiError.
 */
export function normalizeAxiosError(error: AxiosError): ApiError {
  if (!error.response) {
    return new ApiError({
      status: 0,
      code: 'network_error',
      message: 'Unable to reach the server. Check your connection and try again.',
    })
  }

  const { status, data, headers } = error.response
  const body = (data ?? {}) as {
    message?: string
    detail?: string
    title?: string
    code?: string
    errors?: FieldError[]
  }

  return new ApiError({
    status,
    code: body.code ?? body.title,
    message: body.detail ?? body.message ?? FALLBACK_MESSAGES[status] ?? 'An unexpected error occurred.',
    fieldErrors: body.errors,
    retryAfterSeconds: status === 429 ? parseRetryAfter(headers?.['retry-after']) : undefined,
  })
}
