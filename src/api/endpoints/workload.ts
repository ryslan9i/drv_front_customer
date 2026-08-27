import { FUTURESCHOOL_BASE, apiClient } from '../client'
import type { WorkloadEntry } from '@/types/domain'

export type WorkloadInput = Pick<WorkloadEntry, 'classId' | 'subjectId' | 'teacherId' | 'lessonsPerWeek'> & { schoolId: string }

const BASE = `${FUTURESCHOOL_BASE}/workloads`

// Create + list + delete — no update route for workloads.
// Delete is a hard delete server-side (nothing else references a workload row).
export const workloadApi = {
  list: (schoolId: string) => apiClient.get<WorkloadEntry[]>(BASE, { params: { schoolId } }).then((r) => r.data),
  create: (body: WorkloadInput) => apiClient.post<WorkloadEntry>(BASE, body).then((r) => r.data),
  remove: (id: string) => apiClient.delete<void>(`${BASE}/${id}`).then((r) => r.data),
}
