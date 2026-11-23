import { LevelBadge } from '@/components/level-badge'
import { LEVEL_BAR } from '@/components/level-colors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatRange, useLanguage } from '@/lib/i18n'
import type { Place } from '@/model/place'

/** A short ranked list of places. Each row opens the place's panel. */
export function NowList({
  title,
  description,
  places,
  detail,
  share,
  barLabel,
  footnote,
  wide = false,
  className = '',
  onSelect,
}: {
  title: string
  description: string
  places: Place[]
  /** The line under each name. Left out, it is the city's estimated range of people. */
  detail?: (place: Place) => string
  /** A percentage for each row's bar: how the place compares with the top of the list. Left out, there is no bar. */
  share?: (place: Place) => number
  /** What a bar of that percentage means, for screen readers. */
  barLabel?: (percent: number) => string
  footnote?: string
  /** Lay the rows out in two columns where there is room, for a card that spans the page. */
  wide?: boolean
  className?: string
  onSelect: (place: Place) => void
}) {
  const { lang, s } = useLanguage()
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-prose">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Columns, not a grid, so the ranking reads down the first column and then the second. */}
        <ol className={`-mx-2 ${wide ? 'gap-x-6 md:columns-2' : ''}`}>
          {places.map((place, index) => (
            <li key={place.code} className="break-inside-avoid">
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
                    {detail ? detail(place) : s.rangePeople(formatRange(lang, place.range))}
                  </span>
                  {share && (
                    <Progress
                      value={share(place)}
                      className={`mt-2 h-1.5 ${LEVEL_BAR[place.level.rank]}`}
                      aria-label={(barLabel ?? s.barLabel)(share(place))}
                    />
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {footnote && <p className="mt-2 text-sm text-muted-foreground">{footnote}</p>}
      </CardContent>
    </Card>
  )
}
