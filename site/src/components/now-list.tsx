import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LEVELS, type Ranked } from '@/lib/data'

const number = new Intl.NumberFormat('en-GB')

function levelVariant(rank: number) {
  if (rank >= 3) return 'default' as const
  if (rank === 2) return 'secondary' as const
  return 'outline' as const
}

export function NowList({
  title,
  description,
  places,
}: {
  title: string
  description: string
  places: Ranked[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {places.map((place, index) => (
            <li key={place.code} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="w-5 pt-0.5 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{place.label}</p>
                <p className="text-sm text-muted-foreground" lang="ko">
                  {place.name}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={levelVariant(place.rank)}>
                  {LEVELS[place.latest.level]?.label ?? place.latest.level}
                </Badge>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {number.format(place.latest.min)} to {number.format(place.latest.max)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
