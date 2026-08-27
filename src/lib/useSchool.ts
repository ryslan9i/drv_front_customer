import { useQuery } from '@tanstack/react-query'
import { schoolApi } from '@/api/endpoints/school'

/** The app manages a single school for this tenant — the first (only) row the API returns. */
export function useSchool() {
  const query = useQuery({ queryKey: ['schools'], queryFn: schoolApi.list })
  return { ...query, school: query.data?.[0] }
}
