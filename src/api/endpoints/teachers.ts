import { FUTURESCHOOL_BASE, apiClient } from '../client'
import type { Teacher } from '@/types/domain'

export type TeacherInput = Pick<Teacher, 'firstName' | 'lastName' | 'maxLessonsPerDay' | 'maxLessonsPerWeek'> & {
  schoolId: string
}
export type TeacherUpdateInput = Pick<Teacher, 'firstName' | 'lastName' | 'maxLessonsPerDay' | 'maxLessonsPerWeek'>

const BASE = `${FUTURESCHOOL_BASE}/teachers`

export const teachersApi = {
  list: (schoolId: string) => apiClient.get<Teacher[]>(BASE, { params: { schoolId } }).then((r) => r.data),
  get: (id: string) => apiClient.get<Teacher>(`${BASE}/${id}`).then((r) => r.data),
  create: (body: TeacherInput) => apiClient.post<Teacher>(BASE, body).then((r) => r.data),
  update: (id: string, body: TeacherUpdateInput) => apiClient.put<void>(`${BASE}/${id}`, body).then(() => undefined),
  remove: (id: string) => apiClient.delete<void>(`${BASE}/${id}`).then((r) => r.data),
}
