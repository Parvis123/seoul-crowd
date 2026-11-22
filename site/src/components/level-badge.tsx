import { Badge } from '@/components/ui/badge'
import { LEVEL_RANK } from '@/lib/data'
import { useLanguage } from '@/lib/i18n'

const DOT = ['bg-level-0', 'bg-level-1', 'bg-level-2', 'bg-level-3']

/** The city's crowd level for a place, as a coloured dot and its name. */
export function LevelBadge({ level }: { level: string }) {
  const { s } = useLanguage()
  const rank = LEVEL_RANK[level] ?? 0
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className={`size-2 rounded-full ${DOT[rank] ?? DOT[0]}`} aria-hidden="true" />
      {s.levels[level] ?? level}
    </Badge>
  )
}

export const levelBar = [
  '[&>[data-slot=progress-indicator]]:bg-level-0',
  '[&>[data-slot=progress-indicator]]:bg-level-1',
  '[&>[data-slot=progress-indicator]]:bg-level-2',
  '[&>[data-slot=progress-indicator]]:bg-level-3',
]
