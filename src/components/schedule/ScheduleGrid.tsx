import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Lesson, SchoolClass, Subject, Teacher } from '@/types/domain'

const DAY_LABELS: Record<number, string> = { 0: 'Пн', 1: 'Вт', 2: 'Ср', 3: 'Чт', 4: 'Пт', 5: 'Сб', 6: 'Нд' }
const WEEK_LABELS: Record<number, string> = { 0: 'Чисельник', 1: 'Знаменник' }
const WEEK_SHORT: Record<number, string> = { 0: 'I', 1: 'II' }

interface ScheduleGridProps {
  lessons: Lesson[]
  workingDays: number
  periodsPerDay: number
  subjectsById: Map<string, Subject>
  teachersById: Map<string, Teacher>
  classesById: Map<string, SchoolClass>
  mode: 'class' | 'teacher'
}

export function ScheduleGrid({ lessons, workingDays, periodsPerDay, subjectsById, teachersById, classesById, mode }: ScheduleGridProps) {
  const days = Array.from({ length: workingDays }, (_, i) => i)
  const periods = Array.from({ length: periodsPerDay }, (_, i) => i)
  const hasRotation = lessons.some((l) => l.isPartial)

  return (
    <div className="space-y-2">
      {hasRotation && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Двотижнева ротація</span>
          <span className="flex items-center gap-1.5">
            <WeekBadge week={0} /> {WEEK_LABELS[0]} (1-й тиждень)
          </span>
          <span className="flex items-center gap-1.5">
            <WeekBadge week={1} /> {WEEK_LABELS[1]} (2-й тиждень)
          </span>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-24 border-b border-r border-border bg-muted/40 p-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                Урок
              </th>
              {days.map((day) => (
                <th key={day} className="min-w-[150px] border-b border-border bg-muted/40 p-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                  {DAY_LABELS[day] ?? day + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period}>
                <td className="border-b border-r border-border bg-muted/20 p-2 text-xs font-medium text-muted-foreground">Урок {period + 1}</td>
                {days.map((day) => (
                  <GridCell
                    key={`${day}-${period}`}
                    lessons={lessons.filter((l) => l.day === day && l.period === period)}
                    subjectsById={subjectsById}
                    teachersById={teachersById}
                    classesById={classesById}
                    mode={mode}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WeekBadge({ week }: { week: number }) {
  return (
    <span
      className={
        'inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-bold leading-none ' +
        (week === 0 ? 'bg-primary/15 text-primary' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400')
      }
    >
      {WEEK_SHORT[week]}
    </span>
  )
}

function teacherName(teacher?: Teacher) {
  return teacher ? `${teacher.firstName} ${teacher.lastName}` : ''
}

function GridCell({
  lessons,
  subjectsById,
  teachersById,
  classesById,
  mode,
}: {
  lessons: Lesson[]
  subjectsById: Map<string, Subject>
  teachersById: Map<string, Teacher>
  classesById: Map<string, SchoolClass>
  mode: 'class' | 'teacher'
}) {
  if (lessons.length === 0) return <td className="h-16 min-w-[150px] border-b border-border p-1.5 align-top" />

  const secondaryOf = (lesson: Lesson) =>
    mode === 'class' ? teacherName(teachersById.get(lesson.teacherId)) : classesById.get(lesson.classId)?.name

  // A slot rotates only when it holds a partial lesson. A full lesson repeats every week,
  // so its two records (week 0 + week 1) collapse to a single chip.
  const isRotation = lessons.some((l) => l.isPartial)
  const week0 = lessons.find((l) => l.week === 0)
  const week1 = lessons.find((l) => l.week === 1)

  if (!isRotation) {
    const lesson = week0 ?? week1!
    return (
      <td className="h-16 min-w-[150px] border-b border-border p-1.5 align-top">
        <LessonChip
          lesson={lesson}
          subject={subjectsById.get(lesson.subjectId)}
          secondary={secondaryOf(lesson)}
          teachersById={teachersById}
          classesById={classesById}
          mode={mode}
        />
      </td>
    )
  }

  // Rotation slot — stack week 0 above week 1, showing an empty slot where a week has no lesson.
  return (
    <td className="h-16 min-w-[150px] border-b border-border p-1 align-top">
      <div className="flex h-full flex-col gap-1">
        <RotationHalf
          week={0}
          lesson={week0}
          subjectsById={subjectsById}
          secondary={week0 ? secondaryOf(week0) : ''}
          teachersById={teachersById}
          classesById={classesById}
          mode={mode}
        />
        <RotationHalf
          week={1}
          lesson={week1}
          subjectsById={subjectsById}
          secondary={week1 ? secondaryOf(week1) : ''}
          teachersById={teachersById}
          classesById={classesById}
          mode={mode}
        />
      </div>
    </td>
  )
}

function RotationHalf({
  week,
  lesson,
  subjectsById,
  secondary,
  teachersById,
  classesById,
  mode,
}: {
  week: 0 | 1
  lesson?: Lesson
  subjectsById: Map<string, Subject>
  secondary?: string
  teachersById: Map<string, Teacher>
  classesById: Map<string, SchoolClass>
  mode: 'class' | 'teacher'
}) {
  if (!lesson) {
    return (
      <div className="flex flex-1 items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground/60">
        <WeekBadge week={week} />
        <span>—</span>
      </div>
    )
  }
  return (
    <LessonChip
      lesson={lesson}
      week={week}
      subject={subjectsById.get(lesson.subjectId)}
      secondary={secondary}
      teachersById={teachersById}
      classesById={classesById}
      mode={mode}
      compact
    />
  )
}

function LessonChip({
  lesson,
  week,
  subject,
  secondary,
  teachersById,
  classesById,
  mode,
  compact,
}: {
  lesson: Lesson
  week?: 0 | 1
  subject?: Subject
  secondary?: string
  teachersById: Map<string, Teacher>
  classesById: Map<string, SchoolClass>
  mode: 'class' | 'teacher'
  compact?: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={
            'flex w-full flex-col rounded-md border border-primary/20 bg-primary/10 text-left transition-shadow hover:shadow-sm ' +
            (compact ? 'flex-1 gap-0 px-2 py-1 text-[11px]' : 'h-full gap-0.5 px-2 py-1.5 text-xs')
          }
        >
          <span className="flex items-center gap-1">
            {week !== undefined && <WeekBadge week={week} />}
            <span className="truncate font-medium text-foreground">{subject?.name}</span>
          </span>
          {secondary && <span className="truncate text-muted-foreground">{secondary}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2">
        <p className="font-display text-sm font-semibold">{subject?.name}</p>
        <p className="text-xs text-muted-foreground">
          {mode === 'class' ? teacherName(teachersById.get(lesson.teacherId)) : classesById.get(lesson.classId)?.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {DAY_LABELS[lesson.day]} · Урок {lesson.period + 1}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {lesson.isPartial ? (
            <>
              <WeekBadge week={lesson.week} />
              {WEEK_LABELS[lesson.week]} — лише цей тиждень
            </>
          ) : (
            'Щотижня'
          )}
        </p>
      </PopoverContent>
    </Popover>
  )
}
