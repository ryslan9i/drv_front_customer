import type { ConstraintType } from '@/types/domain'

type FieldRule = 'required' | 'optional'

export interface ConstraintTypeMeta {
  label: string
  hint: string
  fields: {
    subjectId?: FieldRule
    teacherId?: FieldRule
    classId?: FieldRule
    dayOfWeek?: FieldRule
    periodFrom?: FieldRule
    periodTo?: FieldRule
    value?: FieldRule
  }
}

/** Mirrors the "Constraint types" table in the FutureSchool API reference exactly. */
export const CONSTRAINT_TYPES: Record<ConstraintType, ConstraintTypeMeta> = {
  NoGapsForClass: {
    label: 'Без вікон у класі',
    hint: 'Жодного порожнього уроку перед пізнішим уроком того ж дня.',
    fields: { classId: 'optional' },
  },
  SubjectForbiddenPeriod: {
    label: 'Заборонений урок для предмета',
    hint: 'Предмет не може стояти на цьому уроці, у жоден день.',
    fields: { subjectId: 'required', periodFrom: 'required' },
  },
  SubjectAllowedPeriodRange: {
    label: 'Дозволений діапазон уроків',
    hint: 'Предмет дозволено лише в межах [periodFrom, periodTo].',
    fields: { subjectId: 'required', periodFrom: 'required', periodTo: 'required' },
  },
  SubjectForbiddenDay: {
    label: 'Заборонений день для предмета',
    hint: 'Предмет не може стояти в цей день, у жоден урок.',
    fields: { subjectId: 'required', dayOfWeek: 'required' },
  },
  TeacherUnavailable: {
    label: 'Додаткова недоступність вчителя',
    hint: 'Додатковий блок поверх звичайної доступності вчителя.',
    fields: { teacherId: 'required', dayOfWeek: 'required', periodFrom: 'required' },
  },
  ClassUnavailable: {
    label: 'Додаткова недоступність класу',
    hint: 'Додатковий блок поверх звичайної доступності класу.',
    fields: { classId: 'required', dayOfWeek: 'required', periodFrom: 'required' },
  },
  TeacherMaxDailyLessons: {
    label: 'Макс. уроків на день (вчитель)',
    hint: "Перевизначає/звужує власний ліміт вчителя на день.",
    fields: { teacherId: 'optional', value: 'required' },
  },
  TeacherMaxWeeklyLessons: {
    label: 'Макс. уроків на тиждень (вчитель)',
    hint: "Перевизначає/звужує власний ліміт вчителя на тиждень.",
    fields: { teacherId: 'optional', value: 'required' },
  },
  MaxSubjectLessonsPerDay: {
    label: 'Макс. уроків предмета на день',
    hint: 'Обмежує кількість уроків цього предмета на день для класу.',
    fields: { subjectId: 'required', classId: 'optional', value: 'required' },
  },
  MaxConsecutiveLessons: {
    label: 'Макс. уроків поспіль',
    hint: 'Не більше вказаної кількості уроків підряд того ж дня.',
    fields: { subjectId: 'required', classId: 'optional', value: 'required' },
  },
  MinGapBetweenLessons: {
    label: 'Мін. проміжок між уроками',
    hint: 'Мінімум порожніх уроків між двома уроками цього предмета того ж дня.',
    fields: { subjectId: 'required', classId: 'optional', value: 'required' },
  },
  FixedLesson: {
    label: 'Закріплений урок',
    hint: 'Жорстко закріплює цей урок за конкретним слотом.',
    fields: { classId: 'required', subjectId: 'required', teacherId: 'required', dayOfWeek: 'required', periodFrom: 'required' },
  },
  AvoidLastPeriod: {
    label: 'Уникати останнього уроку',
    hint: 'Уникати останнього уроку дня для предмета та/або класу.',
    fields: { subjectId: 'optional', classId: 'optional' },
  },
  DistributeSubjectAcrossDays: {
    label: 'Розподілити предмет по днях',
    hint: 'М’яка перевага розподіляти уроки предмета по різних днях.',
    fields: { subjectId: 'required', classId: 'optional' },
  },
}

export const CONSTRAINT_TYPE_OPTIONS = Object.entries(CONSTRAINT_TYPES).map(([value, meta]) => ({
  value: value as ConstraintType,
  label: meta.label,
}))
