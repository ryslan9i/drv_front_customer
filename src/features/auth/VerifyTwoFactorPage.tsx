import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { accountApi } from '@/api/endpoints/account'
import { authApi } from '@/api/endpoints/auth'
import { setAccessToken } from '@/api/client'
import { ApiError } from '@/api/errors'
import { useAuthStore } from '@/auth/store'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/lib/useCountdown'
import { cn } from '@/lib/utils'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { AuthLayout } from './AuthLayout'

export default function VerifyTwoFactorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const challengeId = useAuthStore((s) => s.challengeId)
  const completeAuthentication = useAuthStore((s) => s.completeAuthentication)
  const reset = useAuthStore((s) => s.reset)

  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rateLimit = useCountdown()

  useEffect(() => {
    if (!challengeId) navigate('/login', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!challengeId) return null

  function backToLogin(message?: string) {
    reset()
    navigate(message ? `/login?reason=${encodeURIComponent(message)}` : '/login')
  }

  async function handleVerify() {
    if (code.length !== 6 || rateLimit.isActive) return
    setSubmitting(true)
    setError(null)
    try {
      const tokens = await authApi.verifyTwoFactor({ challengeId: challengeId as string, code })
      setAccessToken(tokens.accessToken)
      const user = await accountApi.getProfile()
      completeAuthentication({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
      const redirect = searchParams.get('redirect')
      navigate(redirect ?? '/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.isRateLimit) {
        rateLimit.start(err.retryAfterSeconds ?? 60)
        setError('Забагато спроб. Спробуйте пізніше.')
      } else if (err instanceof ApiError && err.code === 'challenge_expired') {
        // The challenge is dead (5 min or 5 attempts) — the API requires a fresh login.
        backToLogin('Термін дії коду минув. Увійдіть знову.')
        return
      } else {
        setError('Цей код підтвердження невірний.')
      }
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Двофакторна перевірка" description="Введіть ваш 6-значний код із застосунку автентифікації">
      <div className="space-y-4">
        {error && (
          <Alert variant={rateLimit.isActive ? 'warning' : 'destructive'}>
            <ShieldAlert className="mt-0.5" />
            <div>
              <AlertTitle>{rateLimit.isActive ? 'Перевищено ліміт спроб' : 'Невірний код'}</AlertTitle>
              <AlertDescription>
                {error}
                {rateLimit.isActive && <span className="block font-medium">Спробуйте ще раз через {rateLimit.secondsLeft} с.</span>}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <input
          autoFocus
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          placeholder="000000"
          disabled={submitting || rateLimit.isActive}
          className={cn(
            'w-full rounded-lg border border-input bg-background px-4 py-3 text-center font-display text-2xl font-semibold tracking-[0.5em] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        />

        <Button className="w-full" onClick={handleVerify} disabled={code.length !== 6 || submitting || rateLimit.isActive}>
          {submitting ? 'Перевірка…' : 'Підтвердити'}
        </Button>

        <button
          type="button"
          onClick={() => backToLogin()}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Повернутися до входу
        </button>

        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <AlertTriangle className="size-3.5" /> Демо-код
          </div>
          <p className="mt-1">Використайте 123456 для успішної перевірки. Код дійсний 5 хвилин, до 5 спроб.</p>
        </div>
      </div>
    </AuthLayout>
  )
}
