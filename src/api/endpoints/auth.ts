import { apiClient } from '../client'

export interface LoginRequest {
  username: string
  password: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export type LoginResponse = { requiresTwoFactor: true; challengeId: string; tokens: null } | { requiresTwoFactor: false; challengeId: null; tokens: TokenPair }

export interface VerifyTwoFactorRequest {
  challengeId: string
  code: string
}

export const authApi = {
  login: (body: LoginRequest) => apiClient.post<LoginResponse>('/auth/login', body).then((r) => r.data),

  verifyTwoFactor: (body: VerifyTwoFactorRequest) => apiClient.post<TokenPair>('/auth/verify-2fa', body).then((r) => r.data),

  refresh: (refreshToken: string) => apiClient.post<TokenPair>('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: (refreshToken: string) => apiClient.post<void>('/auth/logout', { refreshToken }).then((r) => r.data),

  setupTwoFactor: () => apiClient.post<{ secret: string; provisioningUri: string }>('/auth/2fa/setup').then((r) => r.data),

  confirmTwoFactor: (code: string) => apiClient.post<void>('/auth/2fa/confirm', { code }).then((r) => r.data),

  disableTwoFactor: (code: string) => apiClient.post<void>('/auth/2fa/disable', { code }).then((r) => r.data),

  /** Not part of the documented auth contract — kept as a mock-only convenience pending a real spec. */
  forgotPassword: (username: string) => apiClient.post<{ message: string }>('/auth/forgot-password', { username }).then((r) => r.data),
}
