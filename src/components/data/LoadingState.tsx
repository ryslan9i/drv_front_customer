import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  fullScreen?: boolean
  className?: string
}

export function LoadingState({ label = 'Завантаження…', fullScreen, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground',
        fullScreen ? 'h-screen w-full bg-background' : 'py-14',
        className,
      )}
    >
      <Loader2 className="size-5 animate-spin text-primary" />
      <span>{label}</span>
    </div>
  )
}
