import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, Pencil } from 'lucide-react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { teacherClassIds, teacherSubjectIds, teacherWeeklyLoad } from '@/lib/derive'
import { useSchool } from '@/lib/useSchool'
import { initials } from '@/lib/utils'
import { TeacherFormSheet } from './TeacherFormSheet'

export default function TeacherDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { school } = useSchool()
  const [editOpen, setEditOpen] = useState(false)
  const [availOpen, setAvailOpen] = useState(false)
  const { data: teacher, isLoading, error, refetch } = useQuery({
    queryKey: ['teachers', id],
    queryFn: () => teachersApi.get(id as string),
    enabled: !!id,
  })
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects', school?.id], queryFn: () => subjectsApi.list(school!.id), enabled: !!school })
  const { data: classes = [] } = useQuery({ queryKey: ['classes', school?.id], queryFn: () => classesApi.list(school!.id), enabled: !!school })
  const { data: workload = [] } = useQuery({ queryKey: ['workload', school?.id], queryFn: () => workloadApi.list(school!.id), enabled: !!school })

  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])
  const classesById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])

  if (isLoading || !school) return <LoadingState label="Завантаження вчителя…" />
  if (error || !teacher) return <ErrorState error={error} onRetry={() => refetch()} title="Не вдалося завантажити цього вчителя" />

  const subjectIds = teacherSubjectIds(teacher.id, workload)
  const classIds = teacherClassIds(teacher.id, workload)
  const weeklyLoad = teacherWeeklyLoad(teacher.id, workload)

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Назад до вчителів
      </button>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback>{initials(teacher.firstName, teacher.lastName)}</AvatarFallback>
          </Avatar>
          <h1 className="font-display text-xl font-bold">
            {teacher.firstName} {teacher.lastName}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAvailOpen(true)}>
            <CalendarClock className="size-4" /> Доступність
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Редагувати вчителя
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Навантаження</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Максимум уроків на день" value={String(teacher.maxLessonsPerDay)} />
            <Field
              label="Тижневе навантаження"
              value={<span className={weeklyLoad > teacher.maxLessonsPerWeek ? 'font-semibold text-hard' : 'font-semibold'}>{weeklyLoad} / {teacher.maxLessonsPerWeek}</span>}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Предмети</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {subjectIds.length === 0 && <p className="text-sm text-muted-foreground">Ще не призначено.</p>}
            {subjectIds.map((sid) => (
              <Badge key={sid} variant="outline">
                {subjectsById.get(sid)?.name ?? sid}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Призначені класи</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {classIds.length === 0 && <p className="text-sm text-muted-foreground">Класи ще не призначено.</p>}
            {classIds.map((cid) => (
              <Badge key={cid} variant="secondary">
                {classesById.get(cid)?.name ?? cid}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <TeacherFormSheet open={editOpen} onOpenChange={setEditOpen} schoolId={teacher.schoolId} teacher={teacher} />
      {school && (
        <AvailabilityEditor
          open={availOpen}
          onOpenChange={setAvailOpen}
          title={`Доступність — ${teacher.firstName} ${teacher.lastName}`}
          workingDays={school.workingDays}
          periodsPerDay={school.periodsPerDay}
          onLoad={() => availabilityApi.getTeacherAvailability(teacher.id)}
          onSave={(entries) => availabilityApi.setTeacherAvailability(teacher.id, entries)}
        />
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  )
}
