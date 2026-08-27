export type Role = 'super_admin' | 'school_admin' | 'teacher' | 'user'

export type AccountStatus = 'active' | 'invited' | 'suspended'

export interface User {
  id: string
  /** Login identifier — the auth API signs in by username, not email. */
  username: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: Role
  avatarUrl?: string
  schoolId: string
  schoolName: string
  organization: string
  status: AccountStatus
  createdAt: string
  lastLoginAt?: string
  twoFactorEnabled: boolean
}

export interface Session {
  id: string
  browser: string
  os: string
  location?: string
  lastActiveAt: string
  isCurrent: boolean
}

export type AccountLanguage = 'uk' | 'en' | 'es' | 'fr' | 'de'
export type AccountTheme = 'light' | 'dark' | 'system'

export interface AccountSettings {
  language: AccountLanguage
  timeZone: string
  theme: AccountTheme
  notifications: {
    email: boolean
    scheduleGenerated: boolean
    conflicts: boolean
    productUpdates: boolean
  }
}

/**
 * These shapes mirror the FutureSchool API exactly (see the API reference):
 * base path `/v1/future-school`, camelCase JSON, RFC 7807 errors. Fields the
 * backend does not return (email/phone on teachers, a subject "code", any
 * embedded aggregate like weeklyWorkload) are computed client-side from the
 * Workloads list instead of being stored on the entity — see lib/derive.ts.
 */
export interface School {
  id: string
  name: string
  /** Count of working days per week (1-7). Day 0 = the school's first working day. */
  workingDays: number
  /** Periods per day (1-20). */
  periodsPerDay: number
  createdAt: string
}

export interface Teacher {
  id: string
  schoolId: string
  firstName: string
  lastName: string
  maxLessonsPerDay: number
  maxLessonsPerWeek: number
  createdAt: string
}

export interface SchoolClass {
  id: string
  schoolId: string
  name: string
  grade: number
  studentsCount: number
  createdAt: string
}

export interface Subject {
  id: string
  schoolId: string
  name: string
  createdAt: string
}

export interface WorkloadEntry {
  id: string
  schoolId: string
  classId: string
  subjectId: string
  teacherId: string
  /** Lessons per week — can be fractional (0.5-40); the scheduler rounds up to the nearest whole period when generating (0.5 -> 1 lesson, 2.5 -> 3). */
  lessonsPerWeek: number
  createdAt: string
}

/**
 * The API exposes a batch-upsert POST plus a GET for reading back the current
 * exceptions. A slot with no entry is available by default; only send the
 * slots that are unavailable (or re-open one with isAvailable: true).
 * day/period are 0-based.
 */
export interface AvailabilityEntry {
  day: number
  period: number
  isAvailable: boolean
}

export type GenerationStatus = 'Queued' | 'Validating' | 'Running' | 'Completed' | 'Impossible' | 'Failed' | 'Cancelled'

export interface GenerationConflict {
  type: string
  severity: 'Hard' | 'Soft'
  message: string
}

export interface GenerationStatistics {
  lessons: number
  teacherGaps: number
  classGaps: number
}

export interface Generation {
  id: string
  status: GenerationStatus
  score: number | null
  statistics: GenerationStatistics | null
  conflicts: GenerationConflict[]
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

export interface Lesson {
  classId: string
  subjectId: string
  teacherId: string
  day: number
  period: number
}

export interface ScheduleSummary {
  id: string
  schoolId: string
  status: 'Completed'
  score: number
  createdAt: string
}

export interface ScheduleDetail extends ScheduleSummary {
  lessons: Lesson[]
}

export type ConstraintType =
  | 'NoGapsForClass'
  | 'SubjectForbiddenPeriod'
  | 'SubjectAllowedPeriodRange'
  | 'SubjectForbiddenDay'
  | 'TeacherUnavailable'
  | 'ClassUnavailable'
  | 'TeacherMaxDailyLessons'
  | 'TeacherMaxWeeklyLessons'
  | 'MaxSubjectLessonsPerDay'
  | 'MaxConsecutiveLessons'
  | 'MinGapBetweenLessons'
  | 'FixedLesson'
  | 'AvoidLastPeriod'
  | 'DistributeSubjectAcrossDays'

export interface SchedulingConstraint {
  id: string
  schoolId: string
  type: ConstraintType
  subjectId: string | null
  teacherId: string | null
  classId: string | null
  dayOfWeek: number | null
  periodFrom: number | null
  periodTo: number | null
  value: number | null
  isHard: boolean
  weight: number
  priority: number
  parametersJson: string | null
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}
