import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { accountApi } from '@/api/endpoints/account'
import { useAuthStore } from '@/auth/store'
import { applyTheme } from '@/lib/theme'

export function ThemeEffect() {
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated')
  const { data } = useQuery({
    queryKey: ['account', 'settings'],
    queryFn: accountApi.getSettings,
    enabled: isAuthenticated,
    staleTime: Infinity,
  })

  useEffect(() => {
    applyTheme(data?.theme ?? 'system')
  }, [data?.theme])

  return null
}
