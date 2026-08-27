import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store'

export function PublicOnlyRoute() {
  const status = useAuthStore((s) => s.status)
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
