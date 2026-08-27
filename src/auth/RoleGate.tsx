import type { ReactNode } from 'react'
import { hasRole } from '@/lib/roles'
import type { Role } from '@/types/domain'
import { useAuthStore } from './store'

interface RoleGateProps {
  allowed: Role[]
  children: ReactNode
  fallback?: ReactNode
}

/** UX-only visibility gate. The backend enforces real authorization. */
export function RoleGate({ allowed, children, fallback = null }: RoleGateProps) {
  const role = useAuthStore((s) => s.user?.role)
  if (!hasRole(role, allowed)) return <>{fallback}</>
  return <>{children}</>
}
