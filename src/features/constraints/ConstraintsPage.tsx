import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { classesApi } from '@/api/endpoints/classes'
import { constraintsApi } from '@/api/endpoints/constraints'
import { subjectsApi } from '@/api/endpoints/subjects'
import { teachersApi } from '@/api/endpoints/teachers'
import { ApiError } from '@/api/errors'
import { ConfirmDialog } from '@/components/data/ConfirmDialog'
import { DataTable } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast-store'
import { CONSTRAINT_TYPES } from '@/lib/constraintTypes'
import { useSchool } from '@/lib/useSchool'
import { useSearchParamNumber } from '@/lib/useSearchParamState'
import type { SchedulingConstraint } from '@/types/domain'
import { ConstraintFormSheet } from './ConstraintFormSheet'

export default function ConstraintsPage() {
  const queryClient = useQueryClient()
  const { school, isLoading: schoolLoading } = useSchool()
  const { data: constraints = [], isLoading, error, refetch } = useQuery({
    queryKey: ['constraints', school?.id],
    queryFn: () => constraintsApi.list(school!.id),
    enabled: !!school,
  })
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects', school?.id], queryFn: () => subjectsApi.list(school!.id), enabled: !!school })
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers', school?.id], queryFn: () => teachersApi.list(school!.id), enabled: !!school })
  const { data: classes = [] } = useQuery({ queryKey: ['classes', school?.id], queryFn: () => classesApi.list(school!.id), enabled: !!school })

  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])
  const teachersById = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers])
  const classesById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes])

  const [pageIndex, setPageIndex] = useSearchParamNumber('page', 0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SchedulingConstraint | undefined>()
  const [deleting, setDeleting] = useState<SchedulingConstraint | undefined>()

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => constraintsApi.setActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['constraints'] }),
    onError: (error) => toast({ title: 'Не вдалося змінити статус', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => constraintsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constraints'] })
      toast({ title: 'Обмеження видалено', variant: 'success' })
    },
    onError: (error) => toast({ title: 'Не вдалося видалити обмеження', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' }),
  })

  if (schoolLoading) return <LoadingState label="Завантаження…" />
  if (!school) return <p className="text-sm text-muted-foreground">Спочатку створіть школу на сторінці «Школа».</p>

  function scopeText(c: SchedulingConstraint) {
    const parts: string[] = []
    if (c.subjectId) parts.push(subjectsById.get(c.subjectId)?.name ?? '?')
    if (c.teacherId) {
      const t = teachersById.get(c.teacherId)
      parts.push(t ? `${t.firstName} ${t.lastName}` : '?')
    }
    if (c.classId) parts.push(classesById.get(c.classId)?.name ?? '?')
    return parts.length > 0 ? parts.join(' · ') : 'Уся школа'
  }

  const columns: ColumnDef<SchedulingConstraint>[] = [
    { id: 'type', header: 'Тип', cell: ({ row }) => CONSTRAINT_TYPES[row.original.type]?.label ?? row.original.type },
    { id: 'scope', header: 'Область дії', cell: ({ row }) => <span className="text-muted-foreground">{scopeText(row.original)}</span> },
    { id: 'kind', header: 'Вид', cell: ({ row }) => <Badge variant={row.original.isHard ? 'hard' : 'soft'}>{row.original.isHard ? 'Жорстке' : 'М’яке'}</Badge> },
    { id: 'description', header: 'Опис', cell: ({ row }) => <span className="text-muted-foreground">{row.original.description}</span> },
    {
      id: 'active',
      header: 'Активне',
      cell: ({ row }) => (
        <Switch
          checked={row.original.isActive}
          onCheckedChange={(checked) => toggleMutation.mutate({ id: row.original.id, isActive: checked })}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Обмеження розкладу"
        description="Правила, які враховує генератор — жорсткі (обов'язкові) або м'які (бажані)."
        actions={
          <Button onClick={() => { setEditing(undefined); setFormOpen(true) }}>
            <Plus className="size-4" /> Додати обмеження
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={constraints}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        emptyTitle="Ще немає обмежень"
        emptyDescription="Додайте перше правило, щоб уточнити, як генератор має будувати розклад."
        pageSize={12}
        pageIndex={pageIndex}
        onPageIndexChange={setPageIndex}
      />

      <ConstraintFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        schoolId={school.id}
        workingDays={school.workingDays}
        periodsPerDay={school.periodsPerDay}
        constraint={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Видалити це обмеження?"
        description="Цю дію неможливо скасувати."
        variant="destructive"
        confirmLabel="Видалити"
        onConfirm={() => deleting && deleteMutation.mutateAsync(deleting.id)}
      />
    </div>
  )
}
