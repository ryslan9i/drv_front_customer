import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { availabilityApi } from '@/api/endpoints/availability'
import { classesApi } from '@/api/endpoints/classes'
import { subjectsApi } from '@/api/endpoints/subjects'
import { teachersApi } from '@/api/endpoints/teachers'
import { workloadApi } from '@/api/endpoints/workload'
import { AvailabilityEditor } from '@/components/schedule/AvailabilityEditor'
import { ErrorState } from '@/components/data/ErrorState'
import { LoadingState } from '@/components/data/LoadingState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { classWeeklyLoad } from '@/lib/derive'
import { useSchool } from '@/lib/useSchool'

export default function ClassDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { school } = useSchool()
  const [availOpen, setAvailOpen] = useState(false)
  const { data: classes, isLoading, error, refetch } = useQuery({
    queryKey: ['classes', school?.id],
    queryFn: () => classesApi.list(school!.id),
    enabled: !!school,
  })
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects', school?.id], queryFn: () => subjectsApi.list(school!.id), enabled: !!school })
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers', school?.id], queryFn: () => teachersApi.list(school!.id), enabled: !!school })
  const { data: workload = [] } = useQuery({ queryKey: ['workload', school?.id], queryFn: () => workloadApi.list(school!.id), enabled: !!school })

  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])
  const teachersById = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers])
  const cls = classes?.find((c) => c.id === id)
  const classWorkload = workload.filter((w) => w.classId === id)

  if (isLoading || !school) return <LoadingState label="Завантаження класу…" />
  if (error || !cls) return <ErrorState error={error} onRetry={() => refetch()} title="Не вдалося завантажити цей клас" />

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Назад до класів
      </button>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-xl font-bold">{cls.name}</h1>
          <p className="text-sm text-muted-foreground">{cls.grade} клас · {cls.studentsCount} учнів</p>
        </div>
        <Button variant="outline" onClick={() => setAvailOpen(true)}>
          <CalendarClock className="size-4" /> Доступність
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Предмети та навантаження</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {classWorkload.length === 0 && <p className="text-sm text-muted-foreground">Предмети ще не призначено. Налаштуйте це на сторінці «Навантаження».</p>}
          {classWorkload.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{subjectsById.get(w.subjectId)?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const teacher = teachersById.get(w.teacherId)
                    return teacher ? `${teacher.firstName} ${teacher.lastName}` : ''
                  })()}
                </p>
              </div>
              <span className="font-medium">{w.lessonsPerWeek}/тиждень</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>Загальне тижневе навантаження</span>
            <span>{classWeeklyLoad(cls.id, workload)} уроків</span>
          </div>
        </CardContent>
      </Card>

      {school && (
        <AvailabilityEditor
          open={availOpen}
          onOpenChange={setAvailOpen}
          title={`Доступність — ${cls.name}`}
          workingDays={school.workingDays}
          periodsPerDay={school.periodsPerDay}
          onLoad={() => availabilityApi.getClassAvailability(cls.id)}
          onSave={(entries) => availabilityApi.setClassAvailability(cls.id, entries)}
        />
      )}
    </div>
  )
}
