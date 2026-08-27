import type { AccountTheme } from '@/types/domain'

export function applyTheme(theme: AccountTheme) {
  const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}
