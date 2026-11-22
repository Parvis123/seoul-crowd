import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type Current, byBusiest, formatPeople } from '@/lib/data'

export function Summary({ places, newest }: { places: Current[]; newest: string | null }) {
  const crowded = places.filter((p) => p.rank >= 2).length
  const top = [...places].sort((a, b) => b.people - a.people)[0]
  const calmest = [...places].sort(byBusiest).at(-1)
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>Crowded or slightly crowded</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {crowded} <span className="text-base font-normal text-muted-foreground">of {places.length} places</span>
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Most people right now</CardDescription>
          <CardTitle className="truncate text-xl">{top?.label}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground tabular-nums">
          About {top ? formatPeople(top.people) : 0} people
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Last reading, Seoul time</CardDescription>
          <CardTitle className="text-xl tabular-nums">{newest?.slice(11) ?? 'None yet'}</CardTitle>
        </CardHeader>
        <CardContent className="truncate text-sm text-muted-foreground">
          Calmest: {calmest?.label}
        </CardContent>
      </Card>
    </div>
  )
}
