import { FUTURESCHOOL_BASE, apiClient } from '../client'
import type { AvailabilityEntry } from '@/types/domain'

const BASE = FUTURESCHOOL_BASE

export const availabilityApi = {
  getTeacherAvailability: (teacherId: string) =>
    apiClient.get<AvailabilityEntry[]>(`${BASE}/teacher-availability`, { params: { teacherId } }).then((r) => r.data),
  getClassAvailability: (classId: string) =>
    apiClient.get<AvailabilityEntry[]>(`${BASE}/class-availability`, { params: { classId } }).then((r) => r.data),
  setTeacherAvailability: (teacherId: string, entries: AvailabilityEntry[]) =>
    apiClient.post<void>(`${BASE}/teacher-availability`, { teacherId, entries }).then(() => undefined),
  setClassAvailability: (classId: string, entries: AvailabilityEntry[]) =>
    apiClient.post<void>(`${BASE}/class-availability`, { classId, entries }).then(() => undefined),
}
