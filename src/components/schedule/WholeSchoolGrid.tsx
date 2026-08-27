import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Lesson, SchoolClass, Subject, Teacher } from '@/types/domain'

interface WholeSchoolGridProps {
  day: number
  week: 0 | 1
  periodsPerDay: number
  classes: SchoolClass[]
  lessons: Lesson[]
  subjectsById: Map<string, Subject>
  teachersById: Map<string, Teacher>
}

export function WholeSchoolGrid({ day, week, periodsPerDay, classes, lessons, subjectsById, teachersById }: WholeSchoolGridProps) {
  const dayLessons = lessons.filter((l) => l.day === day && l.week === week)

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-20 border-b border-r border-border bg-muted/40 p-2 text-left text-xs font-semibold uppercase text-muted-foreground">
              Урок
            </th>
            {classes.map((cls) => (
              <th key={cls.id} className="min-w-[120px] border-b border-border bg-muted/40 p-2 text-center text-xs font-semibold text-muted-foreground">
                {cls.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: periodsPerDay }, (_, i) => i).map((period) => (
            <tr key={period}>
              <td className="sticky left-0 z-10 border-b border-r border-border bg-muted/20 p-2 text-xs font-medium text-muted-foreground">
                У{period + 1}
              </td>
              {classes.map((cls) => {
                const lesson = dayLessons.find((l) => l.classId === cls.id && l.period === period)
                if (!lesson) return <td key={cls.id} className="border-b border-border p-1.5" />
                const subject = subjectsById.get(lesson.subjectId)
                const teacher = teachersById.get(lesson.teacherId)
                return (
                  <td key={cls.id} className="border-b border-border p-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className={
                            'flex w-full items-center justify-center gap-1 truncate rounded-md px-1.5 py-1 text-center text-[11px] font-medium hover:bg-primary/20 ' +
                            (lesson.isPartial
                              ? 'border border-dashed border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-primary/10 text-primary')
                          }
                        >
                          {lesson.isPartial && <span className="font-bold">½</span>}
                          <span className="truncate">{subject?.name}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 space-y-1">
                        <p className="font-display text-sm font-semibold">{subject?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cls.name} · {teacher ? `${teacher.firstName} ${teacher.lastName}` : ''}
                        </p>
                        {lesson.isPartial && <p className="text-xs text-amber-600 dark:text-amber-400">Урок лише в цьому тижні ротації</p>}
                      </PopoverContent>
                    </Popover>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
