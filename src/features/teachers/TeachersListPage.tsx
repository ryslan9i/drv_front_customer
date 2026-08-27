import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subjectsApi } from '@/api/endpoints/subjects'
import { teachersApi } from '@/api/endpoints/teachers'
import { workloadApi } from '@/api/endpoints/workload'
import { ApiError } from '@/api/errors'
import { ConfirmDialog } from '@/components/data/ConfirmDialog'
import { DataTable } from '@/components/data/DataTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/data/LoadingState'
import { toast } from '@/components/ui/toast-store'
import { teacherClassIds, teacherSubjectIds, teacherWeeklyLoad } from '@/lib/derive'
import { useSchool } from '@/lib/useSchool'
import { useSearchParamNumber, useSearchParamState } from '@/lib/useSearchParamState'
import { initials } from '@/lib/utils'
import type { Teacher } from '@/types/domain'
import { TeacherFormSheet } from './TeacherFormSheet'

export default function TeachersListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { school, isLoading: schoolLoading } = useSchool()
  const { data: teachers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['teachers', school?.id],
    queryFn: () => teachersApi.list(school!.id),
    enabled: !!school,
  })
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects', school?.id], queryFn: () => subjectsApi.list(school!.id), enabled: !!school })
  const { data: workload = [] } = useQuery({ queryKey: ['workload', school?.id], queryFn: () => workloadApi.list(school!.id), enabled: !!school })

  const [search, setSearch] = useSearchParamState('q', '')
  const [pageIndex, setPageIndex] = useSearchParamNumber('page', 0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Teacher | undefined>()
  const [deleting, setDeleting] = useState<Teacher | undefined>()

  const subjectsById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teachersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast({ title: 'Вчителя видалено', variant: 'success' })
    },
    onError: (error) => {
      toast({
        title: 'Не вдалося видалити вчителя',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      })
    },
  })

  const filtered = teachers.filter((t) => `${t.firstName} ${t.lastName}`.toLowerCase().includes(search.toLowerCase()))

  if (schoolLoading) return <LoadingState label="Завантаження…" />
  if (!school) return <p className="text-sm text-muted-foreground">Спочатку створіть школу на сторінці «Школа».</p>

  const columns: ColumnDef<Teacher>[] = [
    {
      id: 'name',
      accessorFn: (t) => `${t.firstName} ${t.lastName}`,
      header: "Ім'я",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials(row.original.firstName, row.original.lastName)}</AvatarFallback>
          </Avatar>
          <p className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </p>
        </div>
      ),
    },
    {
      id: 'subjects',
      header: 'Предмети',
      cell: ({ row }) => {
        const ids = teacherSubjectIds(row.original.id, workload)
        return (
          <div className="flex max-w-[220px] flex-wrap gap-1">
            {ids.slice(0, 3).map((id) => (
              <Badge key={id} variant="outline">
                {subjectsById.get(id)?.name}
              </Badge>
            ))}
            {ids.length > 3 && <Badge variant="outline">+{ids.length - 3}</Badge>}
          </div>
        )
      },
    },
    {
      id: 'classes',
      header: 'Класи',
      cell: ({ row }) => <span className="text-muted-foreground">{teacherClassIds(row.original.id, workload).length}</span>,
    },
    {
      id: 'weeklyWorkload',
      header: 'Тижневе навантаження',
      cell: ({ row }) => {
        const load = teacherWeeklyLoad(row.original.id, workload)
        return (
          <span className={load > row.original.maxLessonsPerWeek ? 'font-medium text-hard' : ''}>
            {load} / {row.original.maxLessonsPerWeek}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/teachers/${row.original.id}`)}>
            <Eye className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditing(row.original)
              setFormOpen(true)
            }}
          >
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
        title="Вчителі"
        description="Керуйте викладацьким складом та їхнім тижневим лімітом навантаження."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Додати вчителя
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <Input placeholder="Пошук вчителів…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        emptyTitle="Ще немає вчителів"
        emptyDescription="Додайте першого вчителя, щоб почати формувати навантаження та розклад."
        pageSize={12}
        pageIndex={pageIndex}
        onPageIndexChange={setPageIndex}
      />

      <TeacherFormSheet open={formOpen} onOpenChange={setFormOpen} schoolId={school.id} teacher={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Видалити ${deleting?.firstName} ${deleting?.lastName}?`}
        description="Наявне навантаження, що посилається на цього вчителя, залишиться без змін."
        variant="destructive"
        confirmLabel="Видалити"
        onConfirm={() => deleting && deleteMutation.mutateAsync(deleting.id)}
      />
    </div>
  )
}
