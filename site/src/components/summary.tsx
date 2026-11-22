import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type Current, byBusiest } from '@/lib/data'
import { formatPeople, placeNames, useLanguage } from '@/lib/i18n'

export function Summary({ places, newest }: { places: Current[]; newest: string | null }) {
  const crowded = places.filter((p) => p.rank >= 2).length
  const top = [...places].sort((a, b) => b.people - a.people)[0]
  const calmest = [...places].sort(byBusiest).at(-1)
  const { lang, s } = useLanguage()
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>{s.crowdedLabel}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {s.crowdedCount(crowded)}{' '}
            <span className="text-base font-normal text-muted-foreground">{s.crowdedOf(places.length)}</span>
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>{s.mostPeople}</CardDescription>
          <CardTitle className="truncate text-xl">{top ? placeNames(top, lang).primary : ''}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground tabular-nums">
          {s.aboutPeople(formatPeople(lang, top ? top.people : 0))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>{s.lastReading}</CardDescription>
          <CardTitle className="text-xl tabular-nums">{newest?.slice(11) ?? s.none}</CardTitle>
        </CardHeader>
        <CardContent className="truncate text-sm text-muted-foreground">
          {calmest ? s.calmest(placeNames(calmest, lang).primary) : ''}
        </CardContent>
      </Card>
    </div>
  )
}
