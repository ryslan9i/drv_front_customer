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

function generateLessons(): { lessons: Lesson[]; unplaced: number } {
  const school = currentSchool()
  const lessons: Lesson[] = []
  const capacity = school.periodsPerDay * school.workingDays
  const classOccupied = new Map<string, Set<string>>()
  const teacherOccupied = new Map<string, Set<string>>()
  const teacherDailyCount = new Map<string, Map<number, number>>()
  let unplaced = 0
  let lessonCounter = 0

  const teacherById = new Map(db.teachers.map((t) => [t.id, t]))

  db.classes.forEach((cls, classIndex) => {
    const entries = db.workload.filter((w) => w.classId === cls.id)
    const units = entries.flatMap((e) => Array.from({ length: roundedLessonCount(e.lessonsPerWeek) }, () => e))
    classOccupied.set(cls.id, new Set())

    for (const unit of units) {
      if (classOccupied.get(cls.id)!.size >= capacity) {
        unplaced++
        continue
      }
      const teacher = teacherById.get(unit.teacherId)
      teacherOccupied.set(unit.teacherId, teacherOccupied.get(unit.teacherId) ?? new Set())
      teacherDailyCount.set(unit.teacherId, teacherDailyCount.get(unit.teacherId) ?? new Map())
      const classAvail = db.classAvailability.get(cls.id)
      const teacherAvail = db.teacherAvailability.get(unit.teacherId)

      let placed = false
      const offset = (classIndex * 7 + lessonCounter * 3) % capacity
      for (let step = 0; step < capacity && !placed; step++) {
        const slotIndex = (offset + step) % capacity
        const day = Math.floor(slotIndex / school.periodsPerDay)
        const period = slotIndex % school.periodsPerDay
        const key = `${day}-${period}`
        const dailyCount = teacherDailyCount.get(unit.teacherId)!.get(day) ?? 0

        if (
          !classOccupied.get(cls.id)!.has(key) &&
          !teacherOccupied.get(unit.teacherId)!.has(key) &&
          isSlotAvailable(classAvail, day, period) &&
          isSlotAvailable(teacherAvail, day, period) &&
          dailyCount < (teacher?.maxLessonsPerDay ?? 6)
        ) {
          classOccupied.get(cls.id)!.add(key)
          teacherOccupied.get(unit.teacherId)!.add(key)
          teacherDailyCount.get(unit.teacherId)!.set(day, dailyCount + 1)
          lessons.push({ classId: unit.classId, subjectId: unit.subjectId, teacherId: unit.teacherId, day, period })
          placed = true
        }
      }
      if (!placed) unplaced++
      lessonCounter++
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
    if (!byDay.has(lesson.day)) byDay.set(lesson.day, [])
    byDay.get(lesson.day)!.push(lesson.period)
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
  const totalPossible = db.workload.reduce((sum, w) => sum + roundedLessonCount(w.lessonsPerWeek), 0)
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
