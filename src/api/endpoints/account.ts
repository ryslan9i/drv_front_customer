import { apiClient } from '../client'
import { normalizeRole } from '@/lib/roles'
import type { AccountSettings, Session, User } from '@/types/domain'

function normalizeUser(user: User): User {
  return { ...user, role: normalizeRole(user.role) }
}

export const accountApi = {
  getProfile: () => apiClient.get<User>('/account/profile').then((r) => normalizeUser(r.data)),

  updateProfile: (body: Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'phone'>>) =>
    apiClient.patch<User>('/account/profile', body).then((r) => normalizeUser(r.data)),

  updateAvatar: (dataUrl: string) =>
    apiClient.post<{ avatarUrl: string }>('/account/avatar', { dataUrl }).then((r) => r.data),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiClient.post<void>('/account/password', body).then((r) => r.data),

  getSettings: () => apiClient.get<AccountSettings>('/account/settings').then((r) => r.data),

  updateSettings: (body: Partial<AccountSettings>) =>
    apiClient.patch<AccountSettings>('/account/settings', body).then((r) => r.data),

  // Sessions — not part of the documented auth API; kept as a placeholder
  // pending a real spec for per-device session listing/revocation.
  getSessions: () => apiClient.get<Session[]>('/account/sessions').then((r) => r.data),

  revokeSession: (id: string) => apiClient.delete<void>(`/account/sessions/${id}`).then((r) => r.data),

  revokeOtherSessions: () => apiClient.post<void>('/account/sessions/revoke-others').then((r) => r.data),
}
