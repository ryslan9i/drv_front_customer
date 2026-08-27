import {
  CalendarClock,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  School,
  ShieldCheck,
  Sliders,
  UserCircle,
  Users,
} from 'lucide-react'
import type { Role } from '@/types/domain'

export interface NavItem {
  label: string
  to: string
  icon: typeof LayoutDashboard
  roles: Role[]
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

const ALL: Role[] = ['super_admin', 'school_admin', 'teacher', 'user']
const ADMINS: Role[] = ['super_admin', 'school_admin']

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ label: 'Дашборд', to: '/dashboard', icon: LayoutDashboard, roles: ALL }],
  },
  {
    items: [{ label: 'Школа', to: '/school', icon: School, roles: ADMINS }],
  },
  {
    label: 'Навчальний процес',
    items: [
      { label: 'Вчителі', to: '/teachers', icon: Users, roles: ADMINS },
      { label: 'Класи', to: '/classes', icon: GraduationCap, roles: ADMINS },
      { label: 'Предмети', to: '/subjects', icon: ClipboardList, roles: ADMINS },
      { label: 'Навантаження', to: '/workload', icon: Sliders, roles: ADMINS },
    ],
  },
  {
    label: 'Розклад',
    items: [
      { label: 'Розклад занять', to: '/schedule', icon: CalendarClock, roles: ALL },
      { label: 'Обмеження', to: '/constraints', icon: ListChecks, roles: ADMINS },
      { label: 'Генерація', to: '/schedule/generate', icon: CalendarClock, roles: ADMINS },
    ],
  },
  {
    label: 'Користувач',
    items: [
      { label: 'Кабінет', to: '/cabinet', icon: UserCircle, roles: ALL },
      { label: 'Безпека', to: '/cabinet/security', icon: ShieldCheck, roles: ALL },
    ],
  },
]
