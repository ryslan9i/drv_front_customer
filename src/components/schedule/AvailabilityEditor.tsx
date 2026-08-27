import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast-store'
import { cn } from '@/lib/utils'
import type { AvailabilityEntry } from '@/types/domain'

const DAY_LABELS: Record<number, string> = { 0: 'Пн', 1: 'Вт', 2: 'Ср', 3: 'Чт', 4: 'Пт', 5: 'Сб', 6: 'Нд' }

interface AvailabilityEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  workingDays: number
  periodsPerDay: number
  /** Loads the currently-saved exceptions when the dialog opens. */
  onLoad: () => Promise<AvailabilityEntry[]>
  onSave: (entries: AvailabilityEntry[]) => Promise<unknown>
}

export function AvailabilityEditor({ open, onOpenChange, title, workingDays, periodsPerDay, onLoad, onSave }: AvailabilityEditorProps) {
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    onLoad()
      .then((entries) => {
        if (cancelled) return
        setUnavailable(new Set(entries.filter((e) => !e.isAvailable).map((e) => `${e.day}-${e.period}`)))
      })
      .catch(() => {
        if (!cancelled) toast({ title: 'Не вдалося завантажити поточну доступність', variant: 'destructive' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function toggle(day: number, period: number) {
    const key = `${day}-${period}`
    setUnavailable((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const entries: AvailabilityEntry[] = [...unavailable].map((key) => {
        const [day, period] = key.split('-').map(Number)
        return { day, period, isAvailable: false }
      })
      await onSave(entries)
      toast({ title: 'Доступність збережено', variant: 'success' })
      onOpenChange(false)
    } catch {
      toast({ title: 'Не вдалося зберегти доступність', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Позначте періоди, коли недоступний(-а). За замовчуванням усе доступно.</DialogDescription>
        </DialogHeader>
        <div className={cn('space-y-2', loading && 'pointer-events-none opacity-50')}>
          {Array.from({ length: workingDays }, (_, day) => (
            <div key={day} className="flex flex-wrap items-center gap-2">
              <span className="w-8 text-xs font-medium text-muted-foreground">{DAY_LABELS[day] ?? day + 1}</span>
              {Array.from({ length: periodsPerDay }, (_, period) => {
                const blocked = unavailable.has(`${day}-${period}`)
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => toggle(day, period)}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                      blocked ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border text-muted-foreground',
                    )}
                  >
                    {period + 1}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={handleSave} disabled={saving || loading}>{saving ? 'Збереження…' : 'Зберегти доступність'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
