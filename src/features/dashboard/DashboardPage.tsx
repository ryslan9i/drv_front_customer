import { useQuery } from '@tanstack/react-query'
import { CalendarClock, ClipboardList, GraduationCap, Sliders, Users, Wand2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { classesApi } from '@/api/endpoints/classes'
import { scheduleApi } from '@/api/endpoints/schedule'
import { subjectsApi } from '@/api/endpoints/subjects'
import { teachersApi } from '@/api/endpoints/teachers'
import { workloadApi } from '@/api/endpoints/workload'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { roundedLessonCount } from '@/lib/derive'
import { useSchool } from '@/lib/useSchool'
import { formatDateTime } from '@/lib/utils'

export default function DashboardPage() {
  const { school, isLoading: schoolLoading } = useSchool()
  const schoolId = school?.id
  const teachers = useQuery({ queryKey: ['teachers', schoolId], queryFn: () => teachersApi.list(schoolId!), enabled: !!schoolId })
  const classes = useQuery({ queryKey: ['classes', schoolId], queryFn: () => classesApi.list(schoolId!), enabled: !!schoolId })
  const subjects = useQuery({ queryKey: ['subjects', schoolId], queryFn: () => subjectsApi.list(schoolId!), enabled: !!schoolId })
  const workload = useQuery({ queryKey: ['workload', schoolId], queryFn: () => workloadApi.list(schoolId!), enabled: !!schoolId })
  const schedules = useQuery({ queryKey: ['schedules', schoolId], queryFn: () => scheduleApi.list(schoolId!), enabled: !!schoolId })

  const totalLessons = workload.data?.reduce((sum, w) => sum + roundedLessonCount(w.lessonsPerWeek), 0) ?? 0
  const isLoading = schoolLoading || teachers.isLoading || classes.isLoading || subjects.isLoading || workload.isLoading
  const latestSchedule = schedules.data?.[0]

  return (
    <div>
      <PageHeader title="Дашборд" description="Швидкий огляд стану розкладу вашої школи." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Школа</p>
            <div className="mt-1 font-display text-lg font-semibold">{school?.name ?? <Skeleton className="h-6 w-32" />}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Структура</p>
            <div className="mt-1 font-display text-lg font-semibold">
              {school ? `${school.workingDays} дн. · ${school.periodsPerDay} ур./день` : <Skeleton className="h-6 w-24" />}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Класи" value={classes.data?.length ?? 0} icon={GraduationCap} />
            <StatCard label="Вчителі" value={teachers.data?.length ?? 0} icon={Users} />
            <StatCard label="Предмети" value={subjects.data?.length ?? 0} icon={ClipboardList} />
            <StatCard label="Навантаження" value={`${totalLessons} уроків`} icon={Sliders} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Статус розкладу</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Поточний розклад</p>
              <div className="mt-1.5">
                <Badge variant={latestSchedule ? 'success' : 'secondary'}>{latestSchedule ? 'Згенеровано' : 'Немає'}</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Остання генерація</p>
              <p className="mt-1.5 text-sm font-medium">{latestSchedule ? formatDateTime(latestSchedule.createdAt) : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Якість</p>
              <p className="mt-1.5 font-display text-lg font-semibold text-primary">{latestSchedule ? `${latestSchedule.score}%` : '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Швидкі дії</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild className="justify-start">
              <Link to="/schedule/generate">
                <Wand2 className="size-4" /> Згенерувати розклад
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/schedule">
                <CalendarClock className="size-4" /> Переглянути розклад занять
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/workload">
                <Sliders className="size-4" /> Керувати навантаженням
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/teachers">
                <Users className="size-4" /> Керувати вчителями
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/classes">
                <GraduationCap className="size-4" /> Керувати класами
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
