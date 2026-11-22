import { LevelBadge, levelBar } from '@/components/level-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { type Current, formatRange } from '@/lib/data'

export function NowList({
  title,
  description,
  places,
  onSelect,
}: {
  title: string
  description: string
  places: Current[]
  onSelect: (place: Current) => void
}) {
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
                    <span className="truncate font-medium">{place.label}</span>
                    <LevelBadge rank={place.rank} label={place.levelLabel} />
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span lang="ko" className="truncate">
                      {place.name}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatRange(place.latest)}</span>
                  </span>
                  <Progress
                    value={place.fill}
                    className={`mt-2 h-1.5 ${levelBar[place.rank]}`}
                    aria-label={`${place.fill}% of the busiest place right now`}
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
