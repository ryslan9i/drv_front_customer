import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { classesApi } from '@/api/endpoints/classes'
import { scheduleApi } from '@/api/endpoints/schedule'
import { subjectsApi } from '@/api/endpoints/subjects'
import { teachersApi } from '@/api/endpoints/teachers'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { LoadingState } from '@/components/data/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { WholeSchoolGrid } from '@/components/schedule/WholeSchoolGrid'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSchool } from '@/lib/useSchool'

const DAY_LABELS: Record<number, string> = { 0: 'Понеділок', 1: 'Вівторок', 2: 'Середа', 3: 'Четвер', 4: "П'ятниця", 5: 'Субота', 6: 'Неділя' }
const WEEK_LABELS: Record<number, string> = { 0: 'Чисельник (1-й тиждень)', 1: 'Знаменник (2-й тиждень)' }

export default function TimetablePage() {
  const { school, isLoading: schoolLoading } = useSchool()
  const schoolId = school?.id
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', schoolId],
    queryFn: () => scheduleApi.list(schoolId!),
    enabled: !!schoolId,
  })
  const latestId = schedules[0]?.id
  const { data: version, isLoading, error, refetch } = useQuery({
    queryKey: ['schedule', latestId],
    queryFn: () => scheduleApi.get(latestId as string),
    enabled: !!latestId,
  })
  const { data: classes = [] } = useQuery({ queryKey: ['classes', schoolId], queryFn: () => classesApi.list(schoolId!), enabled: !!schoolId })
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers', schoolId], queryFn: () => teachersApi.list(schoolId!), enabled: !!schoolId })
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects', schoolId], queryFn: () => subjectsApi.list(schoolId!), enabled: !!schoolId })

  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])
  const teachersById = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers])
  const classesById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])

  const [selectedClassId, setSelectedClassId] = useState<string>()
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>()
  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [selectedWeek, setSelectedWeek] = useState<0 | 1>(0)

  const activeClassId = selectedClassId ?? classes[0]?.id
  const activeTeacherId = selectedTeacherId ?? teachers[0]?.id

  if (schoolLoading || schedulesLoading || isLoading) return <LoadingState label="Завантаження розкладу…" />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} title="Не вдалося завантажити розклад" />
  if (!version || version.lessons.length === 0) {
    return (
      <div>
        <PageHeader title="Розклад занять" description="Перегляд згенерованого розкладу." />
        <EmptyState title="Розклад ще не згенеровано" description="Запустіть генератор розкладу, щоб побачити тут розклад занять." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Розклад занять" description="Перегляд згенерованого розкладу." />

      <Tabs defaultValue="class">
        <TabsList>
          <TabsTrigger value="class">За класом</TabsTrigger>
          <TabsTrigger value="teacher">За вчителем</TabsTrigger>
          <TabsTrigger value="school">Уся школа</TabsTrigger>
        </TabsList>

        <TabsContent value="class" className="space-y-4">
          <Select value={activeClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Оберіть клас" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          {school && (
            <ScheduleGrid
              mode="class"
              lessons={version.lessons.filter((l) => l.classId === activeClassId)}
              workingDays={school.workingDays}
              periodsPerDay={school.periodsPerDay}
              subjectsById={subjectsById}
              teachersById={teachersById}
              classesById={classesById}
            />
          )}
        </TabsContent>

        <TabsContent value="teacher" className="space-y-4">
          <Select value={activeTeacherId} onValueChange={setSelectedTeacherId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Оберіть вчителя" /></SelectTrigger>
            <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent>
          </Select>
          {school && (
            <ScheduleGrid
              mode="teacher"
              lessons={version.lessons.filter((l) => l.teacherId === activeTeacherId)}
              workingDays={school.workingDays}
              periodsPerDay={school.periodsPerDay}
              subjectsById={subjectsById}
              teachersById={teachersById}
              classesById={classesById}
            />
          )}
        </TabsContent>

        <TabsContent value="school" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Оберіть день" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: school?.workingDays ?? 0 }, (_, d) => d).map((d) => (
                  <SelectItem key={d} value={String(d)}>{DAY_LABELS[d] ?? d + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedWeek)} onValueChange={(v) => setSelectedWeek(Number(v) as 0 | 1)}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Оберіть тиждень" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{WEEK_LABELS[0]}</SelectItem>
                <SelectItem value="1">{WEEK_LABELS[1]}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {school && (
            <WholeSchoolGrid
              day={selectedDay}
              week={selectedWeek}
              periodsPerDay={school.periodsPerDay}
              classes={classes}
              lessons={version.lessons}
              subjectsById={subjectsById}
              teachersById={teachersById}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
