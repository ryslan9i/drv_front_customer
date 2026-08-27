import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' }).format(new Date(iso))
}

export function relativeDay(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (diffDays === 0) return `Сьогодні, ${new Intl.DateTimeFormat('uk-UA', { timeStyle: 'short' }).format(date)}`
  if (diffDays === 1) return 'Вчора'
  if (diffDays > 1 && diffDays < 7) return `${diffDays} дні тому`
  return formatDate(iso)
}
