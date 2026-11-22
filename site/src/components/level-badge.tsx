import { LEVEL_DOT } from '@/components/level-colors'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n'
import type { CrowdLevel } from '@/model/place'

/** The city's crowd level for a place, as a coloured dot and its name. */
export function LevelBadge({ level }: { level: CrowdLevel }) {
  const { s } = useLanguage()
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className={`size-2 rounded-full ${LEVEL_DOT[level.rank]}`} aria-hidden="true" />
      {s.levels[level.korean] ?? level.korean}
    </Badge>
  )
}
