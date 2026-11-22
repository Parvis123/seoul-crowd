import { Badge } from '@/components/ui/badge'

const DOT = ['bg-level-0', 'bg-level-1', 'bg-level-2', 'bg-level-3']

export function LevelBadge({ rank, label }: { rank: number; label: string }) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className={`size-2 rounded-full ${DOT[rank] ?? DOT[0]}`} aria-hidden="true" />
      {label}
    </Badge>
  )
}

export const levelBar = [
  '[&>[data-slot=progress-indicator]]:bg-level-0',
  '[&>[data-slot=progress-indicator]]:bg-level-1',
  '[&>[data-slot=progress-indicator]]:bg-level-2',
  '[&>[data-slot=progress-indicator]]:bg-level-3',
]
