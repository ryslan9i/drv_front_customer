import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CheckCircle2, RefreshCcw, Wand2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { classesApi } from '@/api/endpoints/classes'
import { scheduleApi } from '@/api/endpoints/schedule'
import { subjectsApi } from '@/api/endpoints/subjects'
import { teachersApi } from '@/api/endpoints/teachers'
import { workloadApi } from '@/api/endpoints/workload'
import { ConflictList } from '@/components/conflict/ConflictList'
import { LoadingState } from '@/components/data/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressStages } from '@/components/schedule/ProgressStages'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast-store'
import { previewConflicts } from '@/lib/derive'
import { useSchool } from '@/lib/useSchool'

export default function GeneratePage() {
  const queryClient = useQueryClient()
  const { school, isLoading: schoolLoading } = useSchool()
  const schoolId = school?.id
  const [generationId, setGenerationId] = useState<string | null>(null)

  const teachers = useQuery({ queryKey: ['teachers', schoolId], queryFn: () => teachersApi.list(schoolId!), enabled: !!schoolId })
  const classes = useQuery({ queryKey: ['classes', schoolId], queryFn: () => classesApi.list(schoolId!), enabled: !!schoolId })
  const subjects = useQuery({ queryKey: ['subjects', schoolId], queryFn: () => subjectsApi.list(schoolId!), enabled: !!schoolId })
  const workload = useQuery({ queryKey: ['workload', schoolId], queryFn: () => workloadApi.list(schoolId!), enabled: !!schoolId })

  const readinessLoading = teachers.isLoading || classes.isLoading || subjects.isLoading || workload.isLoading
  const conflicts =
    school && teachers.data && classes.data && workload.data ? previewConflicts(school, teachers.data, classes.data, workload.data) : []
  const canGenerate = !readinessLoading && (classes.data?.length ?? 0) > 0 && (teachers.data?.length ?? 0) > 0 && (subjects.data?.length ?? 0) > 0 && (workload.data?.length ?? 0) > 0

  const job = useQuery({
    queryKey: ['generation', generationId],
    queryFn: () => scheduleApi.getGeneration(generationId as string),
    enabled: !!generationId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && ['Completed', 'Impossible', 'Failed', 'Cancelled'].includes(status) ? false : 800
    },
  })

  const startMutation = useMutation({
    mutationFn: () => scheduleApi.startGeneration(schoolId!),
    onSuccess: (res) => setGenerationId(res.generationId),
    onError: () => toast({ title: 'Не вдалося розпочати генерацію', variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => scheduleApi.cancelGeneration(generationId as string),
    onSuccess: () => job.refetch(),
  })

  const schedules = useQuery({
    queryKey: ['schedules', schoolId],
    queryFn: () => scheduleApi.list(schoolId!),
    enabled: !!schoolId && job.data?.status === 'Completed',
  })
  useEffect(() => {
    if (job.data?.status === 'Completed') queryClient.invalidateQueries({ queryKey: ['schedules', schoolId] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.data?.status])
  const latestScheduleId = schedules.data?.[0]?.id

  const isRunning = job.data && ['Queued', 'Validating', 'Running'].includes(job.data.status)
  const isTerminalFailure = job.data && ['Impossible', 'Failed', 'Cancelled'].includes(job.data.status)

  if (schoolLoading) return <LoadingState label="Завантаження…" />
  if (!school) return <p className="text-sm text-muted-foreground">Спочатку створіть школу на сторінці «Школа».</p>

  return (
    <div>
      <PageHeader title="Генерація розкладу" description="Перевірте готовність, а потім запустіть автоматичний генератор розкладу." />

      {!generationId && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Огляд готовності</CardTitle>
            </CardHeader>
            <CardContent>
              {readinessLoading ? (
                <LoadingState label="Перевірка готовності…" />
              ) : (
                <div className="mb-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="Класи" value={classes.data?.length ?? 0} />
                  <Stat label="Вчителі" value={teachers.data?.length ?? 0} />
                  <Stat label="Предмети" value={subjects.data?.length ?? 0} />
                  <Stat label="Записів навантаження" value={workload.data?.length ?? 0} />
                </div>
              )}
            </CardContent>
          </Card>

          {conflicts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Попередній огляд конфліктів</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">
                  Це орієнтовна оцінка на основі тижневих лімітів — остаточна перевірка відбувається під час генерації.
                </p>
                <ConflictList conflicts={conflicts} />
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button size="lg" disabled={!canGenerate || startMutation.isPending} onClick={() => startMutation.mutate()}>
              <Wand2 className="size-4" /> Згенерувати розклад
            </Button>
          </div>
          {!canGenerate && !readinessLoading && (
            <p className="text-right text-sm text-destructive">Спочатку налаштуйте класи, вчителів, предмети та навантаження.</p>
          )}
        </div>
      )}

      {generationId && job.data && (
        <Card>
          <CardHeader>
            <CardTitle>
              {job.data.status === 'Completed'
                ? 'Розклад успішно згенеровано'
                : isTerminalFailure
                  ? 'Генерацію не завершено'
                  : 'Генерація вашого розкладу…'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <ProgressStages stage={job.data.status} />

            {job.data.status === 'Completed' && job.data.statistics && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <ScoreStat label="Оцінка" value={job.data.score ?? 0} highlight />
                  <Stat label="Розміщено уроків" value={job.data.statistics.lessons} />
                  <Stat label="Вікна вчителів" value={job.data.statistics.teacherGaps} />
                  <Stat label="Вікна класів" value={job.data.statistics.classGaps} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {latestScheduleId && (
                    <Button asChild>
                      <Link to="/schedule">
                        <CheckCircle2 className="size-4" /> Переглянути розклад
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setGenerationId(null)}>
                    <RefreshCcw className="size-4" /> Згенерувати знову
                  </Button>
                </div>
              </div>
            )}

            {job.data.status === 'Impossible' && (
              <div className="space-y-4">
                <ConflictList conflicts={job.data.conflicts} />
                <Button variant="outline" onClick={() => setGenerationId(null)}>
                  <RefreshCcw className="size-4" /> Спробувати знову після виправлення
                </Button>
              </div>
            )}

            {job.data.status === 'Failed' && (
              <div className="space-y-4">
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="size-4" /> {job.data.errorMessage ?? 'Розв\'язувач не знайшов рішення у відведений час.'}
                </p>
                <Button variant="outline" onClick={() => setGenerationId(null)}>
                  <RefreshCcw className="size-4" /> Спробувати ще раз
                </Button>
              </div>
            )}

            {job.data.status === 'Cancelled' && (
              <div className="space-y-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Ban className="size-4" /> Генерацію скасовано.
                </p>
                <Button variant="outline" onClick={() => setGenerationId(null)}>
                  <RefreshCcw className="size-4" /> Спробувати ще раз
                </Button>
              </div>
            )}

            {isRunning && (
              <Button variant="ghost" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                <Ban className="size-4" /> Скасувати генерацію
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function ScoreStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${highlight ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
      <p className={`font-display text-xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}%</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
