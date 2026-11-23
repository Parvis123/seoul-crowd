import { LEVEL_DOT } from '@/components/level-colors'
import { useLanguage } from '@/lib/i18n'
import type { PlaceDirectory } from '@/model/place'

/**
 * Every place as one strip, split by the city's crowd level, most crowded
 * first. The counts under it are also the key to the map's colours.
 * Give a step to show the city's forecast for that many hours ahead.
 */
export function LevelStrip({ places, step = 0, className = '' }: { places: PlaceDirectory; step?: number; className?: string }) {
  const { s } = useLanguage()
  // Crowded first, so the part worth reading sits at the start of the line.
  const counts = places.levelCounts(step).reverse()
  const name = (korean: string) => s.levels[korean] ?? korean
  const label = s.levelStripLabel(counts.map(({ level, count }) => s.levelCount(count, name(level.korean))))

  return (
    <div className={className}>
      <div role="img" aria-label={label} className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {counts.map(
          ({ level, count }) =>
            count > 0 && (
              <span
                key={level.rank}
                className={`min-w-1.5 basis-0 transition-[flex-grow] duration-500 ${LEVEL_DOT[level.rank]}`}
                style={{ flexGrow: count }}
                title={s.levelCount(count, name(level.korean))}
              />
            ),
        )}
      </div>
      <ul aria-hidden="true" className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {counts.map(({ level, count }) => (
          <li key={level.rank} className={`flex items-center gap-1.5 ${count === 0 ? 'text-muted-foreground' : ''}`}>
            <span className={`size-2 rounded-full ${LEVEL_DOT[level.rank]}`} />
            <span className="font-medium tabular-nums">{count}</span>
            {name(level.korean)}
          </li>
        ))}
      </ul>
    </div>
  )
}
