import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { subjectsApi } from '@/api/endpoints/subjects'
import { workloadApi } from '@/api/endpoints/workload'
import { ApiError } from '@/api/errors'
import { ConfirmDialog } from '@/components/data/ConfirmDialog'
import { DataTable } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast-store'
import { subjectClassIds, subjectDisplayCode, subjectTeacherIds, subjectWeeklyLoad } from '@/lib/derive'
import { useSchool } from '@/lib/useSchool'
import { useSearchParamNumber } from '@/lib/useSearchParamState'
import type { Subject } from '@/types/domain'
import { SubjectFormSheet } from './SubjectFormSheet'

export default function SubjectsListPage() {
  const queryClient = useQueryClient()
  const { school, isLoading: schoolLoading } = useSchool()
  const { data: subjects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['subjects', school?.id],
    queryFn: () => subjectsApi.list(school!.id),
    enabled: !!school,
  })
  const { data: workload = [] } = useQuery({ queryKey: ['workload', school?.id], queryFn: () => workloadApi.list(school!.id), enabled: !!school })

  const [pageIndex, setPageIndex] = useSearchParamNumber('page', 0)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Subject | undefined>()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subjectsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast({ title: 'Предмет видалено', variant: 'success' })
    },
    onError: (error) => toast({ title: 'Не вдалося видалити предмет', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' }),
  })

  const deletingWorkloadCount = deleting ? workload.filter((w) => w.subjectId === deleting.id).length : 0

  if (schoolLoading) return <LoadingState label="Завантаження…" />
  if (!school) return <p className="text-sm text-muted-foreground">Спочатку створіть школу на сторінці «Школа».</p>

  const columns: ColumnDef<Subject>[] = [
    { accessorKey: 'name', header: 'Предмет' },
    { id: 'code', header: 'Код', cell: ({ row }) => <Badge variant="outline">{subjectDisplayCode(row.original)}</Badge> },
    { id: 'classes', header: 'Призначені класи', cell: ({ row }) => <span>{subjectClassIds(row.original.id, workload).length}</span> },
    { id: 'teachers', header: 'Вчителі', cell: ({ row }) => <span>{subjectTeacherIds(row.original.id, workload).length}</span> },
    { id: 'weeklyWorkload', header: 'Тижневе навантаження', cell: ({ row }) => <span>{subjectWeeklyLoad(row.original.id, workload)} уроків</span> },
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

  return (
    <div>
      <PageHeader
        title="Предмети"
        description="Предмети, що викладаються у вашій школі."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" /> Створити предмет
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={subjects}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        emptyTitle="Ще немає предметів"
        pageSize={15}
        pageIndex={pageIndex}
        onPageIndexChange={setPageIndex}
      />

      <SubjectFormSheet open={formOpen} onOpenChange={setFormOpen} schoolId={school.id} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Видалити ${deleting?.name}?`}
        description={
          deletingWorkloadCount > 0
            ? `Цей предмет має ${deletingWorkloadCount} записів навантаження — вони залишаться в системі й генератор все ще намагатиметься розмістити для них уроки.`
            : 'Цю дію неможливо скасувати.'
        }
        variant="destructive"
        confirmLabel="Видалити"
        onConfirm={() => deleting && deleteMutation.mutateAsync(deleting.id)}
      />
    </div>
  )
}
