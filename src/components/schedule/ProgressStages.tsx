import { AlertTriangle, Ban, Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GenerationStatus } from '@/types/domain'

const STAGES: { key: GenerationStatus; label: string }[] = [
  { key: 'Queued', label: 'У черзі' },
  { key: 'Validating', label: 'Перевірка' },
  { key: 'Running', label: 'Генерація' },
  { key: 'Completed', label: 'Завершено' },
]

const TERMINAL_FAILURE: Partial<Record<GenerationStatus, { label: string; icon: typeof X }>> = {
  Impossible: { label: 'Неможливо згенерувати', icon: AlertTriangle },
  Failed: { label: 'Помилка генерації', icon: X },
  Cancelled: { label: 'Скасовано', icon: Ban },
}

export function ProgressStages({ stage }: { stage: GenerationStatus }) {
  const failure = TERMINAL_FAILURE[stage]
  const currentIndex = STAGES.findIndex((s) => s.key === stage)
  const failedAtIndex = failure ? STAGES.length - 1 : -1

  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
      {STAGES.map((s, i) => {
        const done = !failure && (i < currentIndex || stage === 'Completed')
        const active = !failure && i === currentIndex && stage !== 'Completed'
        const isFailurePoint = failure && i === failedAtIndex
        return (
          <li key={s.key} className="flex flex-1 items-center gap-3">
            <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                  done && 'border-success bg-success text-success-foreground',
                  active && 'border-primary bg-primary/10 text-primary',
                  isFailurePoint && 'border-destructive bg-destructive/10 text-destructive',
                  !done && !active && !isFailurePoint && 'border-border text-muted-foreground',
                )}
              >
                {isFailurePoint && failure ? (
                  <failure.icon className="size-4" />
                ) : done ? (
                  <Check className="size-4" />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  'text-sm',
                  (done || active) && 'font-medium text-foreground',
                  !done && !active && !isFailurePoint && 'text-muted-foreground',
                  isFailurePoint && 'font-medium text-destructive',
                )}
              >
                {isFailurePoint && failure ? failure.label : s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && <div className={cn('mx-2 hidden h-px flex-1 bg-border sm:block', done && 'bg-success')} />}
          </li>
        )
      })}
    </ol>
  )
}
