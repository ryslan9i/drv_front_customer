import { create } from 'zustand'
import { setAccessToken } from '@/api/client'
import type { User } from '@/types/domain'
import { setRefreshToken } from './tokenStorage'

export type AuthStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'twoFactorRequired'
  | 'authenticated'
  | 'sessionExpired'
  | 'loggingOut'

interface AuthState {
  status: AuthStatus
  user: User | null
  challengeId: string | null
  bootstrapped: boolean

  beginAuthenticating: () => void
  requireTwoFactor: (challengeId: string) => void
  completeAuthentication: (params: { user: User; accessToken: string; refreshToken: string }) => void
  markSessionExpired: () => void
  beginLoggingOut: () => void
  reset: () => void
  setBootstrapped: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unauthenticated',
  user: null,
  challengeId: null,
  bootstrapped: false,

  beginAuthenticating: () => set({ status: 'authenticating' }),

  requireTwoFactor: (challengeId) => set({ status: 'twoFactorRequired', challengeId }),

  completeAuthentication: ({ user, accessToken, refreshToken }) => {
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)
    set({ status: 'authenticated', user, challengeId: null })
  },

  markSessionExpired: () => {
    setAccessToken(null)
    setRefreshToken(null)
    set({ status: 'sessionExpired', user: null, challengeId: null })
  },

  beginLoggingOut: () => set({ status: 'loggingOut' }),

  reset: () => {
    setAccessToken(null)
    setRefreshToken(null)
    set({ status: 'unauthenticated', user: null, challengeId: null })
  },

  setBootstrapped: () => set({ bootstrapped: true }),
}))
