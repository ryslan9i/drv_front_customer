import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { classesApi } from '@/api/endpoints/classes'
import { workloadApi } from '@/api/endpoints/workload'
import { ApiError } from '@/api/errors'
import { ConfirmDialog } from '@/components/data/ConfirmDialog'
import { DataTable } from '@/components/data/DataTable'
import { LoadingState } from '@/components/data/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast-store'
import { classSubjectIds, classWeeklyLoad } from '@/lib/derive'
import { useSchool } from '@/lib/useSchool'
import { useSearchParamNumber } from '@/lib/useSearchParamState'
import type { SchoolClass } from '@/types/domain'
import { ClassFormSheet } from './ClassFormSheet'

export default function ClassesListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { school, isLoading: schoolLoading } = useSchool()
  const { data: classes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['classes', school?.id],
    queryFn: () => classesApi.list(school!.id),
    enabled: !!school,
  })
  const { data: workload = [] } = useQuery({ queryKey: ['workload', school?.id], queryFn: () => workloadApi.list(school!.id), enabled: !!school })

  const [pageIndex, setPageIndex] = useSearchParamNumber('page', 0)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<SchoolClass | undefined>()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => classesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      toast({ title: 'Клас видалено', variant: 'success' })
    },
    onError: (error) => toast({ title: 'Не вдалося видалити клас', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' }),
  })

  const deletingWorkloadCount = deleting ? workload.filter((w) => w.classId === deleting.id).length : 0

  if (schoolLoading) return <LoadingState label="Завантаження…" />
  if (!school) return <p className="text-sm text-muted-foreground">Спочатку створіть школу на сторінці «Школа».</p>

  const columns: ColumnDef<SchoolClass>[] = [
    { accessorKey: 'name', header: 'Клас' },
    { accessorKey: 'grade', header: 'Рівень' },
    { accessorKey: 'studentsCount', header: 'Учнів' },
    { id: 'subjects', header: 'Предмети', cell: ({ row }) => <span className="text-muted-foreground">{classSubjectIds(row.original.id, workload).length} предметів</span> },
    { id: 'weeklyWorkload', header: 'Тижневе навантаження', cell: ({ row }) => <span>{classWeeklyLoad(row.original.id, workload)} уроків</span> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/classes/${row.original.id}`)}>
            <Eye className="size-4" />
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
        title="Класи"
        description="Класи та їхня навчальна програма."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" /> Створити клас
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={classes}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        emptyTitle="Ще немає класів"
        emptyDescription="Створіть перший клас, щоб почати призначати предмети та вчителів."
        pageSize={12}
        pageIndex={pageIndex}
        onPageIndexChange={setPageIndex}
      />

      <ClassFormSheet open={formOpen} onOpenChange={setFormOpen} schoolId={school.id} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Видалити ${deleting?.name}?`}
        description={
          deletingWorkloadCount > 0
            ? `У цього класу є ${deletingWorkloadCount} записів навантаження — вони залишаться в системі й генератор все ще намагатиметься розмістити для них уроки.`
            : 'Цю дію неможливо скасувати.'
        }
        variant="destructive"
        confirmLabel="Видалити"
        onConfirm={() => deleting && deleteMutation.mutateAsync(deleting.id)}
      />
    </div>
  )
}
