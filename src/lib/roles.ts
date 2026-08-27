import type { Role } from '@/types/domain'

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Супер адміністратор',
  school_admin: 'Адміністратор школи',
  teacher: 'Вчитель',
  user: 'Користувач',
}

export const ALL_ROLES: Role[] = ['super_admin', 'school_admin', 'teacher', 'user']

/**
 * Role checks here are UX only (hide/show nav & actions). The backend is the
 * sole source of truth for authorization — every mutation must still handle
 * a 403 even if the UI never should have offered the action.
 */
export function hasRole(userRole: Role | undefined, allowed: Role[]): boolean {
  if (!userRole) return false
  return allowed.includes(userRole)
}

/**
 * The real auth API's JWT claims example uses PascalCase role names
 * ("Admin", "SchoolAdmin", "Teacher", "User") — different casing/spelling
 * from this app's internal snake_case Role values, which were fixed before
 * that spec existed. Whatever shape a real profile endpoint sends, normalize
 * it here rather than assuming it already matches, so nav visibility doesn't
 * silently break on a casing difference. Falls back to the least-privileged
 * role ('user') for anything unrecognized, with a console warning so a
 * mismatch is visible during integration instead of silently hiding nav.
 */
export function normalizeRole(raw: string): Role {
  const key = raw.toLowerCase().replace(/[^a-z]/g, '')
  const known: Record<string, Role> = {
    superadmin: 'super_admin',
    // "Admin" (bare, no "School" prefix) is the auth doc's example for the
    // platform-level seeded account — distinct from "SchoolAdmin" below.
    admin: 'super_admin',
    schooladmin: 'school_admin',
    teacher: 'teacher',
    user: 'user',
  }
  const role = known[key]
  if (!role) {
    console.warn(`[roles] Unrecognized role "${raw}" from the backend — defaulting to "user". Add it to normalizeRole() in lib/roles.ts.`)
    return 'user'
  }
  return role
}
