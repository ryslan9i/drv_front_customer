import { FUTURESCHOOL_BASE, apiClient } from '../client'
import type { SchoolClass } from '@/types/domain'

export type ClassInput = Pick<SchoolClass, 'name' | 'grade' | 'studentsCount'> & { schoolId: string }

const BASE = `${FUTURESCHOOL_BASE}/classes`

// Create + list + delete — no update route for classes.
// Delete is soft (isDeleted) server-side; workload rows referencing a deleted
// class are left as-is, same convention as Teacher.
export const classesApi = {
  list: (schoolId: string) => apiClient.get<SchoolClass[]>(BASE, { params: { schoolId } }).then((r) => r.data),
  create: (body: ClassInput) => apiClient.post<SchoolClass>(BASE, body).then((r) => r.data),
  remove: (id: string) => apiClient.delete<void>(`${BASE}/${id}`).then((r) => r.data),
}
