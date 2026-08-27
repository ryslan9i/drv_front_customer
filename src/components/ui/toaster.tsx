import { CheckCircle2, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from './toast-store'

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-end gap-2 p-4 sm:bottom-4 sm:right-4 sm:left-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-2 fade-in-0',
            t.variant === 'destructive' && 'border-destructive/30',
            t.variant === 'success' && 'border-success/30',
          )}
        >
          {t.variant === 'destructive' && <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
          {t.variant === 'success' && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />}
          <div className="flex-1 text-sm">
            <p className="font-medium">{t.title}</p>
            {t.description && <p className="mt-0.5 text-muted-foreground">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
