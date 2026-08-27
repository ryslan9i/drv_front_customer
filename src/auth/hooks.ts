import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/endpoints/auth'
import { useAuthStore } from './store'
import { getRefreshToken } from './tokenStorage'

export function useAuth() {
  const navigate = useNavigate()
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const beginLoggingOut = useAuthStore((s) => s.beginLoggingOut)
  const reset = useAuthStore((s) => s.reset)

  async function logout() {
    beginLoggingOut()
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) await authApi.logout(refreshToken)
    } finally {
      reset()
      navigate('/login')
    }
  }

  return { status, user, isAuthenticated: status === 'authenticated', logout }
}
