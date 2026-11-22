import { LevelBadge } from '@/components/level-badge'
import { LEVEL_BAR } from '@/components/level-colors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatRange, useLanguage } from '@/lib/i18n'
import type { Place } from '@/model/place'

export function NowList({
  title,
  description,
  places,
  share,
  onSelect,
}: {
  title: string
  description: string
  places: Place[]
  /** A place's people as a percentage of the busiest place right now. */
  share: (place: Place) => number
  onSelect: (place: Place) => void
}) {
  const { lang, s } = useLanguage()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="-mx-2">
          {places.map((place, index) => (
            <li key={place.code}>
              <button
                type="button"
                onClick={() => onSelect(place)}
                className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="w-4 pt-0.5 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{place.name(lang)}</span>
                    <LevelBadge level={place.level} />
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground tabular-nums">
                    {s.rangePeople(formatRange(lang, place.range))}
                  </span>
                  <Progress
                    value={share(place)}
                    className={`mt-2 h-1.5 ${LEVEL_BAR[place.level.rank]}`}
                    aria-label={s.barLabel(share(place))}
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
