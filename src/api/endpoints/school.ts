import { FUTURESCHOOL_BASE, apiClient } from '../client'
import type { School } from '@/types/domain'

export type SchoolInput = Pick<School, 'name' | 'workingDays' | 'periodsPerDay'>

const BASE = `${FUTURESCHOOL_BASE}/schools`

export const schoolApi = {
  list: () => apiClient.get<School[]>(BASE).then((r) => r.data),
  create: (body: SchoolInput) => apiClient.post<School>(BASE, body).then((r) => r.data),
}
