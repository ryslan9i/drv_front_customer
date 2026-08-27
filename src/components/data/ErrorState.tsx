import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  error?: unknown
  title?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, title, onRetry, className }: ErrorStateProps) {
  const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Щось пішло не так.'

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-14 text-center', className)}>
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-sm font-semibold">{title ?? 'Не вдалося завантажити дані'}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCcw className="size-3.5" />
          Спробувати ще раз
        </Button>
      )}
    </div>
  )
}
