import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/cabinet', label: 'Профіль', end: true },
  { to: '/cabinet/security', label: 'Безпека', end: false },
  { to: '/cabinet/settings', label: 'Налаштування акаунта', end: false },
]

export default function CabinetLayout() {
  return (
    <div>
      <PageHeader title="Особистий кабінет" description="Ваш особистий акаунт, безпека та налаштування." />
      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors',
                isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
