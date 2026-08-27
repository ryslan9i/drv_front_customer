import type { GenerationConflict, School, SchoolClass, Subject, Teacher, WorkloadEntry } from '@/types/domain'

/**
 * lessonsPerWeek can be fractional (e.g. 0.5); the scheduler rounds each entry up to a whole
 * period when it actually builds the timetable, so client-side capacity checks mirror that.
 */
export function roundedLessonCount(lessonsPerWeek: number): number {
  return Math.ceil(lessonsPerWeek)
}

export function teacherWeeklyLoad(teacherId: string, workload: WorkloadEntry[]) {
  return workload
    .filter((w) => w.teacherId === teacherId)
    .reduce((sum, w) => sum + roundedLessonCount(w.lessonsPerWeek), 0)
}

export function teacherSubjectIds(teacherId: string, workload: WorkloadEntry[]) {
  return [...new Set(workload.filter((w) => w.teacherId === teacherId).map((w) => w.subjectId))]
}

export function teacherClassIds(teacherId: string, workload: WorkloadEntry[]) {
  return [...new Set(workload.filter((w) => w.teacherId === teacherId).map((w) => w.classId))]
}

export function classWeeklyLoad(classId: string, workload: WorkloadEntry[]) {
  return workload
    .filter((w) => w.classId === classId)
    .reduce((sum, w) => sum + roundedLessonCount(w.lessonsPerWeek), 0)
}

export function classSubjectIds(classId: string, workload: WorkloadEntry[]) {
  return [...new Set(workload.filter((w) => w.classId === classId).map((w) => w.subjectId))]
}

export function subjectWeeklyLoad(subjectId: string, workload: WorkloadEntry[]) {
  return workload
    .filter((w) => w.subjectId === subjectId)
    .reduce((sum, w) => sum + roundedLessonCount(w.lessonsPerWeek), 0)
}

export function subjectClassIds(subjectId: string, workload: WorkloadEntry[]) {
  return [...new Set(workload.filter((w) => w.subjectId === subjectId).map((w) => w.classId))]
}

export function subjectTeacherIds(subjectId: string, workload: WorkloadEntry[]) {
  return [...new Set(workload.filter((w) => w.subjectId === subjectId).map((w) => w.teacherId))]
}

/** Short, stable display code for compact grid chips — the API has no subject "code" field. */
export function subjectDisplayCode(subject: Subject) {
  const words = subject.name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0].slice(0, 1) + words[1].slice(0, 2)).toUpperCase()
  return subject.name.slice(0, 4).toUpperCase()
}

/**
 * The API only reveals hard conflicts once generation runs (status "Impossible"). This is a
 * best-effort client-side preview using the figures we can check ahead of time — weekly
 * capacity per teacher/class — without accounting for day-level availability exceptions.
 */
export function previewConflicts(school: School, teachers: Teacher[], classes: SchoolClass[], workload: WorkloadEntry[]): GenerationConflict[] {
  const conflicts: GenerationConflict[] = []
  const capacityPerClass = school.periodsPerDay * school.workingDays

  for (const teacher of teachers) {
    const load = teacherWeeklyLoad(teacher.id, workload)
    if (load > teacher.maxLessonsPerWeek) {
      conflicts.push({
        type: 'TeacherWeeklyLimit',
        severity: 'Hard',
        message: `${teacher.firstName} ${teacher.lastName} потребує ${load} уроків на тиждень, але його ліміт — ${teacher.maxLessonsPerWeek}.`,
      })
    }
  }

  for (const cls of classes) {
    const load = classWeeklyLoad(cls.id, workload)
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
