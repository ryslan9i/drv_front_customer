import { AlertOctagon, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { GenerationConflict } from '@/types/domain'

interface ConflictListProps {
  conflicts: GenerationConflict[]
  title?: string
}

export function ConflictList({ conflicts, title }: ConflictListProps) {
  if (conflicts.length === 0) return null

  return (
    <div className="space-y-3">
      {title && <p className="font-display text-sm font-semibold">Знайдено конфліктів: {conflicts.length}</p>}
      <ul className="space-y-2">
        {conflicts.map((conflict, i) => (
          <ConflictItem key={`${conflict.type}-${i}`} conflict={conflict} />
        ))}
      </ul>
    </div>
  )
}

export function ConflictItem({ conflict }: { conflict: GenerationConflict }) {
  const isHard = conflict.severity === 'Hard'
  const Icon = isHard ? AlertOctagon : AlertTriangle

  return (
    <li className={`flex gap-3 rounded-lg border p-3.5 ${isHard ? 'border-hard/25 bg-hard/5' : 'border-soft/30 bg-soft/10'}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${isHard ? 'text-hard' : 'text-soft-foreground'}`} />
      <div className="space-y-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isHard ? 'hard' : 'soft'}>{isHard ? 'Жорстке' : "М'яке"}</Badge>
          <span className="font-medium">{conflict.type}</span>
        </div>
        <p className="text-muted-foreground">{conflict.message}</p>
      </div>
    </li>
  )
}
