import { FUTURESCHOOL_BASE, apiClient } from '../client'
import type { Generation, ScheduleDetail, ScheduleSummary } from '@/types/domain'

const BASE = FUTURESCHOOL_BASE

export const scheduleApi = {
  startGeneration: (schoolId: string) =>
    apiClient.post<{ generationId: string; status: 'Queued' }>(`${BASE}/schedules/generate`, { schoolId }).then((r) => r.data),

  getGeneration: (generationId: string) =>
    apiClient.get<Generation>(`${BASE}/schedules/generations/${generationId}`).then((r) => r.data),

  cancelGeneration: (generationId: string) =>
    apiClient.post<void>(`${BASE}/schedules/generations/${generationId}/cancel`).then(() => undefined),

  list: (schoolId: string) => apiClient.get<ScheduleSummary[]>(`${BASE}/schedules`, { params: { schoolId } }).then((r) => r.data),

  get: (id: string) => apiClient.get<ScheduleDetail>(`${BASE}/schedules/${id}`).then((r) => r.data),
}
