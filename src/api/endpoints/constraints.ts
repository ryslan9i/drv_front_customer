import { FUTURESCHOOL_BASE, apiClient } from '../client'
import type { SchedulingConstraint } from '@/types/domain'

const BASE = `${FUTURESCHOOL_BASE}/scheduling-constraints`

export type ConstraintInput = Omit<SchedulingConstraint, 'id' | 'createdAt' | 'updatedAt'>

export const constraintsApi = {
  list: (schoolId: string) => apiClient.get<SchedulingConstraint[]>(BASE, { params: { schoolId } }).then((r) => r.data),
  get: (id: string) => apiClient.get<SchedulingConstraint>(`${BASE}/${id}`).then((r) => r.data),
  create: (body: ConstraintInput) => apiClient.post<SchedulingConstraint>(BASE, body).then((r) => r.data),
  update: (id: string, body: ConstraintInput) => apiClient.put<void>(`${BASE}/${id}`, body).then(() => undefined),
  setActive: (id: string, isActive: boolean) => apiClient.patch<void>(`${BASE}/${id}/active`, { isActive }).then(() => undefined),
  remove: (id: string) => apiClient.delete<void>(`${BASE}/${id}`).then((r) => r.data),
}
