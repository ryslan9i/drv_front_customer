import { Outlet } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { Toaster } from '@/components/ui/toaster'
import { ThemeEffect } from './ThemeEffect'

export function RootLayout() {
  return (
    <AuthProvider>
      <ThemeEffect />
      <Outlet />
      <Toaster />
    </AuthProvider>
  )
}
