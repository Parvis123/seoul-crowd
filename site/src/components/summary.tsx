import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPeople, useLanguage } from '@/lib/i18n'
import type { PlaceDirectory } from '@/model/place'

export function Summary({ places }: { places: PlaceDirectory }) {
  const { lang, s } = useLanguage()
  const top = places.mostPeople
  const calmest = places.ranked.at(-1)
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>{s.crowdedLabel}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {s.crowdedCount(places.crowdedCount)}{' '}
            <span className="text-base font-normal text-muted-foreground">{s.crowdedOf(places.places.length)}</span>
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>{s.mostPeople}</CardDescription>
          <CardTitle className="truncate text-xl">{top?.name(lang)}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground tabular-nums">
          {s.aboutPeople(formatPeople(lang, top?.people ?? 0))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>{s.lastReading}</CardDescription>
          <CardTitle className="text-xl tabular-nums">{places.newestClock ?? s.none}</CardTitle>
        </CardHeader>
        <CardContent className="truncate text-sm text-muted-foreground">
          {calmest ? s.calmest(calmest.name(lang)) : ''}
        </CardContent>
      </Card>
    </div>
  )
}
