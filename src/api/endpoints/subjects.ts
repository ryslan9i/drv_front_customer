import { FUTURESCHOOL_BASE, apiClient } from '../client'
import type { Subject } from '@/types/domain'

export type SubjectInput = Pick<Subject, 'name'> & { schoolId: string }

const BASE = `${FUTURESCHOOL_BASE}/subjects`

// Create + list + delete — no update route for subjects.
// Delete is soft (isDeleted) server-side; workload rows referencing a deleted
// subject are left as-is, same convention as Teacher.
export const subjectsApi = {
  list: (schoolId: string) => apiClient.get<Subject[]>(BASE, { params: { schoolId } }).then((r) => r.data),
  create: (body: SubjectInput) => apiClient.post<Subject>(BASE, body).then((r) => r.data),
  remove: (id: string) => apiClient.delete<void>(`${BASE}/${id}`).then((r) => r.data),
}
