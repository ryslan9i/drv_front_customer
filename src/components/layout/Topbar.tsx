import { LogOut, Menu, Settings, ShieldCheck, UserCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/hooks'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABELS } from '@/lib/roles'
import { useSchool } from '@/lib/useSchool'
import { initials } from '@/lib/utils'

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth()
  const { school } = useSchool()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="size-5" />
        </Button>
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold">{school?.name ?? 'Завантаження школи…'}</p>
          <p className="text-xs text-muted-foreground">
            {school ? `${school.workingDays} робочих днів · ${school.periodsPerDay} уроків/день` : '—'}
          </p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-full pr-1 transition-colors hover:bg-secondary">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">{user ? ROLE_LABELS[user.role] : ''}</p>
            </div>
            <Avatar>
              <AvatarImage src={user?.avatarUrl} alt="" />
              <AvatarFallback>{user ? initials(user.firstName, user.lastName) : ''}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {user?.firstName} {user?.lastName}
            <p className="mt-0.5 text-xs font-normal text-muted-foreground">{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/cabinet">
              <UserCircle className="size-4" /> Особистий кабінет
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/cabinet/security">
              <ShieldCheck className="size-4" /> Безпека
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/cabinet/settings">
              <Settings className="size-4" /> Налаштування акаунта
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logout()} className="text-destructive focus:text-destructive">
            <LogOut className="size-4" /> Вийти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
