import { http, HttpResponse } from 'msw'
import { db } from '../db'

const DEMO_PASSWORD = 'Password123!'
const LOGIN_RATE_LIMIT = 5
const TFA_RATE_LIMIT = 5

function randomToken(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

let failedLoginAttempts = 0
let lastLoginFailureAt = 0

interface Challenge {
  attempts: number
  expiresAt: number
}
const challenges = new Map<string, Challenge>()

// Simulates refresh-token rotation + reuse detection: only the single
// most-recently-issued refresh token is valid. Reusing a superseded one
// revokes the session entirely, matching the real API's stolen-token response.
let currentRefreshToken: string | null = null

function issueTokenPair() {
  const accessToken = randomToken('access')
  const refreshToken = randomToken('refresh')
  currentRefreshToken = refreshToken
  return { accessToken, refreshToken, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() }
}

function requireBearer(request: Request) {
  return request.headers.get('Authorization')?.startsWith('Bearer ')
}

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string }

    if (Date.now() - lastLoginFailureAt > 60_000) failedLoginAttempts = 0
    if (failedLoginAttempts >= LOGIN_RATE_LIMIT) {
      return HttpResponse.json(
        { title: 'Too Many Requests', detail: 'Забагато спроб. Спробуйте ще раз трохи пізніше.' },
        { status: 429, headers: { 'Retry-After': '30' } },
      )
    }

    if (body.username?.toLowerCase() !== db.user.username.toLowerCase() || body.password !== DEMO_PASSWORD) {
      failedLoginAttempts++
      lastLoginFailureAt = Date.now()
      // One 401 for every failure on purpose — never reveals which part was wrong.
      return HttpResponse.json({ title: 'Unauthorized', detail: "Невірне ім'я користувача або пароль." }, { status: 401 })
    }

    failedLoginAttempts = 0

    if (!db.user.twoFactorEnabled) {
      return HttpResponse.json({ requiresTwoFactor: false, challengeId: null, tokens: issueTokenPair() })
    }

    const challengeId = randomToken('challenge')
    challenges.set(challengeId, { attempts: 0, expiresAt: Date.now() + 5 * 60_000 })
    return HttpResponse.json({ requiresTwoFactor: true, challengeId, tokens: null })
  }),

  http.post('/api/auth/verify-2fa', async ({ request }) => {
    const body = (await request.json()) as { challengeId: string; code: string }
    const challenge = challenges.get(body.challengeId)

    if (!challenge || Date.now() > challenge.expiresAt) {
      challenges.delete(body.challengeId)
      return HttpResponse.json({ code: 'challenge_expired', title: 'Unauthorized', detail: 'Термін дії коду минув. Увійдіть знову.' }, { status: 401 })
    }
    if (challenge.attempts >= TFA_RATE_LIMIT) {
      challenges.delete(body.challengeId)
      return HttpResponse.json({ code: 'challenge_expired', title: 'Unauthorized', detail: 'Забагато спроб. Увійдіть знову.' }, { status: 401 })
    }
    if (body.code !== '123456') {
      challenge.attempts++
      return HttpResponse.json({ title: 'Unauthorized', detail: 'Цей код підтвердження невірний.' }, { status: 401 })
    }

    challenges.delete(body.challengeId)
    return HttpResponse.json(issueTokenPair())
  }),

  http.post('/api/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string }
    // The mock's in-memory state resets on every page reload (a real server's
    // wouldn't); the first refresh after a reload trusts whatever token the
    // client already persisted so "stay signed in" still works in the demo.
    if (currentRefreshToken === null) currentRefreshToken = body.refreshToken
    if (body.refreshToken !== currentRefreshToken) {
      // Reuse of a superseded token — revoke everything.
      currentRefreshToken = null
      return HttpResponse.json({ title: 'Unauthorized', detail: 'Термін дії сесії минув.' }, { status: 401 })
    }
    return HttpResponse.json(issueTokenPair())
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string }
    if (body.refreshToken && body.refreshToken === currentRefreshToken) currentRefreshToken = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/auth/2fa/setup', ({ request }) => {
    if (!requireBearer(request)) return HttpResponse.json({ title: 'Unauthorized' }, { status: 401 })
    const secret = 'JBSWY3DPEHPK3PXP'
    const provisioningUri = `otpauth://totp/RozkladPro:${encodeURIComponent(db.user.username)}?secret=${secret}&issuer=RozkladPro`
    return HttpResponse.json({ secret, provisioningUri })
  }),

  http.post('/api/auth/2fa/confirm', async ({ request }) => {
    if (!requireBearer(request)) return HttpResponse.json({ title: 'Unauthorized' }, { status: 401 })
    const body = (await request.json()) as { code: string }
    if (body.code !== '123456') {
      return HttpResponse.json({ title: 'Unauthorized', detail: 'Цей код підтвердження невірний.' }, { status: 401 })
    }
    db.user.twoFactorEnabled = true
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/auth/2fa/disable', async ({ request }) => {
    if (!requireBearer(request)) return HttpResponse.json({ title: 'Unauthorized' }, { status: 401 })
    const body = (await request.json()) as { code: string }
    if (body.code !== '123456') {
      return HttpResponse.json({ title: 'Unauthorized', detail: 'Цей код підтвердження невірний.' }, { status: 401 })
    }
    db.user.twoFactorEnabled = false
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/auth/forgot-password', async () => {
    return HttpResponse.json({ message: 'Якщо акаунт із такою поштою існує, посилання для відновлення вже надіслано.' })
  }),
]
