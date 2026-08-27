import type {
  AvailabilityEntry,
  Generation,
  GenerationConflict,
  GenerationStatus,
  Lesson,
  School,
  ScheduleDetail,
  SchedulingConstraint,
  SchoolClass,
  Subject,
  Teacher,
  WorkloadEntry,
} from '@/types/domain'
import { roundedLessonCount } from '@/lib/derive'
import * as seed from './seed'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const db = {
  schools: [clone(seed.school)] as School[],
  user: clone(seed.demoUser),
  subjects: clone(seed.subjects) as Subject[],
  classes: clone(seed.classes) as SchoolClass[],
  teachers: clone(seed.teachers) as Teacher[],
  workload: clone(seed.workload) as WorkloadEntry[],
  sessions: clone(seed.sessions),
  accountSettings: clone(seed.accountSettings),
  schedules: [] as ScheduleDetail[],
  generations: new Map<string, Generation & { _pendingLessons?: Lesson[] }>(),
  teacherAvailability: new Map<string, AvailabilityEntry[]>(),
  classAvailability: new Map<string, AvailabilityEntry[]>(),
  constraints: [] as SchedulingConstraint[],
}

export function currentSchool(): School {
  return db.schools[0]
}

function isSlotAvailable(entries: AvailabilityEntry[] | undefined, day: number, period: number): boolean {
  const exception = entries?.find((e) => e.day === day && e.period === period)
  return exception ? exception.isAvailable : true
}

export function computeConflicts(): GenerationConflict[] {
  const conflicts: GenerationConflict[] = []
  const school = currentSchool()
  const capacityPerClass = school.periodsPerDay * school.workingDays

  for (const teacher of db.teachers) {
    const load = db.workload
      .filter((w) => w.teacherId === teacher.id)
      .reduce((sum, w) => sum + roundedLessonCount(w.lessonsPerWeek), 0)
    if (load > teacher.maxLessonsPerWeek) {
      conflicts.push({
        type: 'TeacherWeeklyLimit',
        severity: 'Hard',
        message: `${teacher.firstName} ${teacher.lastName} потребує ${load} уроків на тиждень, але його ліміт — ${teacher.maxLessonsPerWeek}.`,
      })
    }
  }

  for (const cls of db.classes) {
    const load = db.workload
      .filter((w) => w.classId === cls.id)
      .reduce((sum, w) => sum + roundedLessonCount(w.lessonsPerWeek), 0)
    if (load > capacityPerClass) {
      conflicts.push({
        type: 'ClassCapacity',
        severity: 'Hard',
        message: `${cls.name} має ${load} потрібних уроків, але максимально допустиме навантаження — ${capacityPerClass}.`,
      })
    }
  }

  return conflicts
}

/**
 * A schedule now runs a two-week rotation. `lessonsPerWeek` is the true average across the
 * two-week cycle, so a workload contributes `round(lessonsPerWeek * 2)` lessons total, split
 * as evenly as possible between week 0 (numerator) and week 1 (denominator). A whole number
 * lands identically in both weeks; a fractional one (0.5, 1.5, …) is uneven by one lesson.
 */
function twoWeekCounts(lessonsPerWeek: number): [number, number] {
  const total = Math.round(lessonsPerWeek * 2)
  const numerator = Math.ceil(total / 2)
  return [numerator, total - numerator]
}

function generateLessons(): { lessons: Lesson[]; unplaced: number } {
  const school = currentSchool()
  const lessons: Lesson[] = []
  const capacity = school.periodsPerDay * school.workingDays
  // Occupancy is tracked per rotation week — the same day/period can hold a different
  // lesson in week 0 and week 1.
  const classOccupied = new Map<string, Set<string>>()
  const teacherOccupied = new Map<string, Set<string>>()
  const teacherDailyCount = new Map<string, Map<string, number>>()
  let unplaced = 0
  let lessonCounter = 0

  const teacherById = new Map(db.teachers.map((t) => [t.id, t]))

  // Places one lesson for the given week, trying `preferred` slot first (used to pin a
  // whole-number workload to the same slot in both weeks). Returns the slot used, or null.
  const place = (
    unit: WorkloadEntry,
    week: 0 | 1,
    classIndex: number,
    cls: SchoolClass,
    preferred?: { day: number; period: number },
  ): { day: number; period: number } | null => {
    const classSet = classOccupied.get(cls.id)!
    if (classSet.size >= capacity * 2) return null
    const teacher = teacherById.get(unit.teacherId)
    teacherOccupied.set(unit.teacherId, teacherOccupied.get(unit.teacherId) ?? new Set())
    teacherDailyCount.set(unit.teacherId, teacherDailyCount.get(unit.teacherId) ?? new Map())
    const classAvail = db.classAvailability.get(cls.id)
    const teacherAvail = db.teacherAvailability.get(unit.teacherId)

    const offset = (classIndex * 7 + lessonCounter * 3) % capacity
    const order = preferred ? [preferred.day * school.periodsPerDay + preferred.period] : []
    for (let step = 0; step < capacity; step++) order.push((offset + step) % capacity)

    for (const slotIndex of order) {
      const day = Math.floor(slotIndex / school.periodsPerDay)
      const period = slotIndex % school.periodsPerDay
      const key = `${week}-${day}-${period}`
      const dayKey = `${week}-${day}`
      const dailyCount = teacherDailyCount.get(unit.teacherId)!.get(dayKey) ?? 0

      if (
        !classSet.has(key) &&
        !teacherOccupied.get(unit.teacherId)!.has(key) &&
        isSlotAvailable(classAvail, day, period) &&
        isSlotAvailable(teacherAvail, day, period) &&
        dailyCount < (teacher?.maxLessonsPerDay ?? 6)
      ) {
        classSet.add(key)
        teacherOccupied.get(unit.teacherId)!.add(key)
        teacherDailyCount.get(unit.teacherId)!.set(dayKey, dailyCount + 1)
        lessons.push({ classId: unit.classId, subjectId: unit.subjectId, teacherId: unit.teacherId, day, period, week })
        return { day, period }
      }
    }
    return null
  }

  db.classes.forEach((cls, classIndex) => {
    const entries = db.workload.filter((w) => w.classId === cls.id)
    classOccupied.set(cls.id, new Set())

    for (const entry of entries) {
      const [numerator, denominator] = twoWeekCounts(entry.lessonsPerWeek)
      const isWhole = Number.isInteger(entry.lessonsPerWeek)
      const perWeek = Math.max(numerator, denominator)

      for (let i = 0; i < perWeek; i++) {
        // Whole-number workloads pin the same slot in both weeks (identical timetable
        // every week); fractional ones place each week independently, so the shorter
        // week simply has fewer lessons and the slot shows a rotation.
        const slot = i < numerator ? place(entry, 0, classIndex, cls) : null
        if (i < numerator && !slot) unplaced++

        if (i < denominator) {
          const preferred = isWhole && slot ? slot : undefined
          if (!place(entry, 1, classIndex, cls, preferred)) unplaced++
        }
        lessonCounter++
      }
    }
  })

  return { lessons, unplaced }
}

function computeGaps(lessons: Lesson[], key: 'classId' | 'teacherId', school: School): number {
  const byEntity = new Map<string, Map<number, number[]>>()
  for (const lesson of lessons) {
    const id = lesson[key]
    if (!byEntity.has(id)) byEntity.set(id, new Map())
    const byDay = byEntity.get(id)!
    // Gaps are per rotation week — a week-0 and a week-1 lesson never sit in the same day.
    const dayKey = lesson.week * 100 + lesson.day
    if (!byDay.has(dayKey)) byDay.set(dayKey, [])
    byDay.get(dayKey)!.push(lesson.period)
  }
  let gaps = 0
  for (const byDay of byEntity.values()) {
    for (const periods of byDay.values()) {
      periods.sort((a, b) => a - b)
      for (let i = 1; i < periods.length; i++) gaps += periods[i] - periods[i - 1] - 1
    }
  }
  void school
  return gaps
}

const STAGE_SEQUENCE: GenerationStatus[] = ['Queued', 'Validating', 'Running', 'Completed']
const STAGE_DURATION_MS = 900

export function startGenerationJob(): Generation {
  const id = `gen-${Date.now()}`
  const job: Generation & { _pendingLessons?: Lesson[] } = {
    id,
    status: 'Queued',
    score: null,
    statistics: null,
    conflicts: [],
    errorMessage: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  }
  db.generations.set(id, job)

  let stageIndex = 0
  const timer = setInterval(() => {
    stageIndex++
    const stage = STAGE_SEQUENCE[stageIndex]
    if (!stage) {
      clearInterval(timer)
      return
    }

    if (stage === 'Completed') {
      const conflicts = computeConflicts()
      if (conflicts.length > 0) {
        job.status = 'Impossible'
        job.conflicts = conflicts
        job.completedAt = new Date().toISOString()
        clearInterval(timer)
        return
      }
      const school = currentSchool()
      const { lessons } = generateLessons()
      const totalPossible = db.workload.reduce((sum, w) => sum + roundedLessonCount(w.lessonsPerWeek), 0)
      const score = totalPossible === 0 ? 100 : Math.round((lessons.length / totalPossible) * 1000) / 10
      job.status = 'Completed'
      job.score = score
      job.statistics = {
        lessons: lessons.length,
        teacherGaps: computeGaps(lessons, 'teacherId', school),
        classGaps: computeGaps(lessons, 'classId', school),
      }
      job.completedAt = new Date().toISOString()
      job._pendingLessons = lessons
      // A schedule row only exists once a generation succeeds — no separate "save" step.
      db.schedules.unshift({
        id,
        schoolId: currentSchool().id,
        status: 'Completed',
        score,
        createdAt: job.completedAt,
        lessons,
      })
      clearInterval(timer)
    } else {
      job.status = stage
    }
  }, STAGE_DURATION_MS)

  return job
}

// Pre-seed a completed schedule so Dashboard/Timetable have data before the user runs Generate.
{
  const { lessons } = generateLessons()
  const totalPossible = db.workload.reduce((sum, w) => {
    const [a, b] = twoWeekCounts(w.lessonsPerWeek)
    return sum + a + b
  }, 0)
  const score = totalPossible === 0 ? 100 : Math.round((lessons.length / totalPossible) * 1000) / 10
  db.schedules.unshift({
    id: 'schedule-seed-1',
    schoolId: currentSchool().id,
    status: 'Completed',
    score,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lessons,
  })
}
