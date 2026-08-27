import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/auth/store'
import { hasRole } from '@/lib/roles'
import { NAV_SECTIONS } from '@/lib/nav'
import { cn } from '@/lib/utils'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const role = useAuthStore((s) => s.user?.role)

  return (
    <nav className="flex h-full w-64 flex-col gap-6 overflow-y-auto bg-sidebar px-4 py-6 text-sidebar-foreground">
      <div className="flex items-center gap-2 px-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
          S
        </div>
        <span className="font-display text-sm font-semibold">РозкладПро</span>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        {NAV_SECTIONS.map((section, i) => {
          const items = section.items.filter((item) => hasRole(role, item.roles))
          if (items.length === 0) return null
          return (
            <div key={i} className="space-y-1">
              {section.label && (
                <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{section.label}</p>
              )}
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard' || item.to === '/cabinet' || item.to === '/schedule'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
