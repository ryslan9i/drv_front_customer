import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Lesson, SchoolClass, Subject, Teacher } from '@/types/domain'

const DAY_LABELS: Record<number, string> = { 0: 'Пн', 1: 'Вт', 2: 'Ср', 3: 'Чт', 4: 'Пт', 5: 'Сб', 6: 'Нд' }

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

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-24 border-b border-r border-border bg-muted/40 p-2 text-left text-xs font-semibold uppercase text-muted-foreground">
              Урок
            </th>
            {days.map((day) => (
              <th key={day} className="min-w-[140px] border-b border-border bg-muted/40 p-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                {DAY_LABELS[day] ?? day + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period}>
              <td className="border-b border-r border-border bg-muted/20 p-2 text-xs font-medium text-muted-foreground">Урок {period + 1}</td>
              {days.map((day) => {
                const lesson = lessons.find((l) => l.day === day && l.period === period)
                return (
                  <GridCell
                    key={`${day}-${period}`}
                    lesson={lesson}
                    subjectsById={subjectsById}
                    teachersById={teachersById}
                    classesById={classesById}
                    mode={mode}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function teacherName(teacher?: Teacher) {
  return teacher ? `${teacher.firstName} ${teacher.lastName}` : ''
}

function GridCell({
  lesson,
  subjectsById,
  teachersById,
  classesById,
  mode,
}: {
  lesson?: Lesson
  subjectsById: Map<string, Subject>
  teachersById: Map<string, Teacher>
  classesById: Map<string, SchoolClass>
  mode: 'class' | 'teacher'
}) {
  if (!lesson) return <td className="h-16 min-w-[140px] border-b border-border p-1.5 align-top" />

  const subject = subjectsById.get(lesson.subjectId)
  const secondary = mode === 'class' ? teacherName(teachersById.get(lesson.teacherId)) : classesById.get(lesson.classId)?.name

  return (
    <td className="h-16 min-w-[140px] border-b border-border p-1.5 align-top">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex w-full flex-col gap-0.5 rounded-md border border-primary/20 bg-primary/10 px-2 py-1.5 text-left text-xs transition-shadow hover:shadow-sm">
            <span className="truncate font-medium text-foreground">{subject?.name}</span>
            <span className="truncate text-muted-foreground">{secondary}</span>
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
        </PopoverContent>
      </Popover>
    </td>
  )
}
