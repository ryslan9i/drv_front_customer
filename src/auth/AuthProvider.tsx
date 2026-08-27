import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountApi } from '@/api/endpoints/account'
import { SESSION_EXPIRED_EVENT, refreshAccessToken, setAccessToken } from '@/api/client'
import { LoadingState } from '@/components/data/LoadingState'
import { useAuthStore } from './store'
import { getRefreshToken } from './tokenStorage'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const bootstrapped = useAuthStore((s) => s.bootstrapped)
  const setBootstrapped = useAuthStore((s) => s.setBootstrapped)
  const completeAuthentication = useAuthStore((s) => s.completeAuthentication)
  const reset = useAuthStore((s) => s.reset)
  const markSessionExpired = useAuthStore((s) => s.markSessionExpired)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!getRefreshToken()) {
        reset()
        return
      }
      // Goes through the same mutex-guarded refresh as the response
      // interceptor, so StrictMode's double effect invocation (or any other
      // concurrent caller) can never send the same refresh token twice.
      const accessToken = await refreshAccessToken()
      const rotatedRefreshToken = getRefreshToken()
      if (!accessToken || !rotatedRefreshToken) {
        if (!cancelled) reset()
        return
      }
      try {
        setAccessToken(accessToken) // needed before getProfile() can authenticate
        const user = await accountApi.getProfile()
        if (cancelled) return
        completeAuthentication({ user, accessToken, refreshToken: rotatedRefreshToken })
      } catch {
        if (!cancelled) reset()
      }
    }

    bootstrap().finally(() => {
      if (!cancelled) setBootstrapped()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onSessionExpired() {
      const wasAuthenticated = useAuthStore.getState().status === 'authenticated'
      markSessionExpired()
      if (wasAuthenticated) {
        navigate('/login?reason=session-expired')
      }
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
  }, [navigate, markSessionExpired])

  if (!bootstrapped) {
    return <LoadingState fullScreen label="Завантаження вашого робочого простору…" />
  }

  return <>{children}</>
}
