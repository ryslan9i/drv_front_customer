import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { classesApi } from '@/api/endpoints/classes'
import { subjectsApi } from '@/api/endpoints/subjects'
import { teachersApi } from '@/api/endpoints/teachers'
import { workloadApi } from '@/api/endpoints/workload'
import { ApiError } from '@/api/errors'
import { ConfirmDialog } from '@/components/data/ConfirmDialog'
import { DataTable } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast-store'
import { roundedLessonCount, teacherWeeklyLoad } from '@/lib/derive'
import { useSchool } from '@/lib/useSchool'
import { useSearchParamNumber, useSearchParamState } from '@/lib/useSearchParamState'
import type { Teacher, WorkloadEntry } from '@/types/domain'
import { WorkloadFormSheet } from './WorkloadFormSheet'

export default function WorkloadPage() {
  const queryClient = useQueryClient()
  const { school, isLoading: schoolLoading } = useSchool()
  const { data: workload = [], isLoading, error, refetch } = useQuery({
    queryKey: ['workload', school?.id],
    queryFn: () => workloadApi.list(school!.id),
    enabled: !!school,
  })
  const { data: classes = [] } = useQuery({ queryKey: ['classes', school?.id], queryFn: () => classesApi.list(school!.id), enabled: !!school })
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects', school?.id], queryFn: () => subjectsApi.list(school!.id), enabled: !!school })
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers', school?.id], queryFn: () => teachersApi.list(school!.id), enabled: !!school })

  const classesById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])
  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])
  const teachersById = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers])

  const [search, setSearch] = useSearchParamState('q', '')
  const [classFilter, setClassFilter] = useSearchParamState('class', 'all')
  const [teacherFilter, setTeacherFilter] = useSearchParamState('teacher', 'all')
  const [subjectFilter, setSubjectFilter] = useSearchParamState('subject', 'all')
  const [pageIndex, setPageIndex] = useSearchParamNumber('page', 0)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<WorkloadEntry | undefined>()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workloadApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload'] })
      toast({ title: 'Запис навантаження видалено', variant: 'success' })
    },
    onError: (error) => toast({ title: 'Не вдалося видалити запис', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' }),
  })

  const filtered = workload.filter((w) => {
    if (classFilter !== 'all' && w.classId !== classFilter) return false
    if (teacherFilter !== 'all' && w.teacherId !== teacherFilter) return false
    if (subjectFilter !== 'all' && w.subjectId !== subjectFilter) return false
    if (search) {
      const haystack = `${classesById.get(w.classId)?.name} ${subjectsById.get(w.subjectId)?.name} ${teachersById.get(w.teacherId)?.firstName} ${teachersById.get(w.teacherId)?.lastName}`.toLowerCase()
      if (!haystack.includes(search.toLowerCase())) return false
    }
    return true
  })

  const columns: ColumnDef<WorkloadEntry>[] = [
    { id: 'class', header: 'Клас', cell: ({ row }) => classesById.get(row.original.classId)?.name },
    { id: 'subject', header: 'Предмет', cell: ({ row }) => subjectsById.get(row.original.subjectId)?.name },
    {
      id: 'teacher',
      header: 'Вчитель',
      cell: ({ row }) => {
        const t = teachersById.get(row.original.teacherId)
        return t ? `${t.firstName} ${t.lastName}` : ''
      },
    },
    { accessorKey: 'lessonsPerWeek', header: 'Уроків/тиждень' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  if (schoolLoading) return <LoadingState label="Завантаження…" />
  if (!school) return <p className="text-sm text-muted-foreground">Спочатку створіть школу на сторінці «Школа».</p>

  const teacherSummaries = [...teachers]
    .map((t) => ({ teacher: t, load: teacherWeeklyLoad(t.id, workload) }))
    .filter((t) => t.load > 0)
    .sort((a, b) => b.load - a.load)

  return (
    <div>
      <PageHeader
        title="Навантаження"
        description="Призначайте тижневі уроки для кожного класу, предмета та вчителя."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" /> Призначити навантаження
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Input placeholder="Пошук…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger><SelectValue placeholder="Клас" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі класи</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger><SelectValue placeholder="Вчитель" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі вчителі</SelectItem>
            {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger><SelectValue placeholder="Предмет" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі предмети</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            emptyTitle="Немає відповідних записів навантаження"
            pageSize={12}
            pageIndex={pageIndex}
            onPageIndexChange={setPageIndex}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Зведення навантаження</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[28rem] space-y-4 overflow-y-auto">
            {teacherSummaries.map(({ teacher, load }) => (
              <TeacherSummary key={teacher.id} teacher={teacher} load={load} workload={workload} subjectsById={subjectsById} />
            ))}
          </CardContent>
        </Card>
      </div>

      <WorkloadFormSheet open={formOpen} onOpenChange={setFormOpen} schoolId={school.id} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Видалити запис навантаження?"
        description="Цю дію неможливо скасувати."
        variant="destructive"
        confirmLabel="Видалити"
        onConfirm={() => deleting && deleteMutation.mutateAsync(deleting.id)}
      />
    </div>
  )
}

function TeacherSummary({
  teacher,
  load,
  workload,
  subjectsById,
}: {
  teacher: Teacher
  load: number
  workload: WorkloadEntry[]
  subjectsById: Map<string, { name: string }>
}) {
  const entries = workload.filter((w) => w.teacherId === teacher.id)
  const bySubject = new Map<string, number>()
  for (const e of entries) {
    bySubject.set(e.subjectId, (bySubject.get(e.subjectId) ?? 0) + roundedLessonCount(e.lessonsPerWeek))
  }

  return (
    <div className="space-y-1.5 border-b border-border pb-3 last:border-0 last:pb-0">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{teacher.firstName} {teacher.lastName}</span>
        <span className={load > teacher.maxLessonsPerWeek ? 'font-semibold text-hard' : 'text-muted-foreground'}>
          {load} / {teacher.maxLessonsPerWeek}
        </span>
      </div>
      <Progress value={Math.min(100, (load / Math.max(teacher.maxLessonsPerWeek, 1)) * 100)} />
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {[...bySubject.entries()].map(([subjectId, periods]) => (
          <span key={subjectId}>
            {subjectsById.get(subjectId)?.name} — {periods} ур.
          </span>
        ))}
      </div>
    </div>
  )
}
