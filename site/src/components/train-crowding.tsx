import { useState } from 'react'

import { useCrowding } from '@/api/queries'
import { type Column, Columns } from '@/components/columns'
import { LineBadge } from '@/components/line-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDate, useLanguage } from '@/lib/i18n'
import { DAY_KINDS, type DayKind, type Heading, TrainCrowding } from '@/model/crowding'
import type { Line } from '@/model/line'
import type { Station, StationDirectory } from '@/model/station'

/** The switch between weekdays, Saturday and Sunday. */
export function DayPicker({ day, onChange }: { day: DayKind; onChange: (day: DayKind) => void }) {
  const { s } = useLanguage()
  return (
    <ToggleGroup type="single" variant="outline" size="sm" spacing={0} value={day} onValueChange={(next) => next && onChange(next as DayKind)} aria-label={s.trainsDayLabel}>
      {DAY_KINDS.map((each) => (
        <ToggleGroupItem key={each} value={each} className="px-3">
          {s.trainsDays[each]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Which way a train is heading, in words: "toward Sinnae", or the loop it runs on Line 2. */
export function useHeadingName(directory: StationDirectory) {
  const { lang, s } = useLanguage()
  return (line: Line, station: Station, heading: Heading) => {
    const ends = directory.ends(line, station)
    if (!ends) return heading === 'on' ? s.routeInner : s.routeOuter
    const name = heading === 'on' ? ends.on : ends.back
    return s.routeToward(directory.stopName(line, name, lang))
  }
}

/**
 * How full the trains through a station are across the day, one small chart
 * for each line and direction, with the worst half hour picked out.
 */
export function TrainCrowdingSection({ station, directory }: { station: Station; directory: StationDirectory }) {
  const { lang, s } = useLanguage()
  const crowding = useCrowding()
  const headingName = useHeadingName(directory)
  const [day, setDay] = useState<DayKind>(() => TrainCrowding.today())

  if (!crowding) return <Skeleton className="h-40" />
  const lines = station.lines.filter((line) => crowding.covers(line, station))
  if (lines.length === 0) return null
  // One scale for every chart in the panel, so a taller column always means a fuller train.
  const fullest = Math.max(
    ...lines.flatMap((line) => (['back', 'on'] as const).flatMap((heading) => (crowding.through(line, station, heading, day) ?? []).map((value) => value ?? 0))),
  )

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{s.trainsTitle}</h3>
        <DayPicker day={day} onChange={setDay} />
      </div>
      {lines.flatMap((line) =>
        (['back', 'on'] as const).flatMap((heading) => {
          const values = crowding.through(line, station, heading, day)
          if (!values) return []
          const items: Column[] = values.map((value, index) => ({
            id: crowding.slots[index],
            value: value ?? 0,
            // A label every three hours is as many as fit under 39 narrow columns.
            axis: crowding.slots[index].endsWith(':00') && Number(crowding.slots[index].slice(0, 2)) % 3 === 0 ? crowding.slots[index] : '',
            text: s.trainsBar(crowding.slots[index], Math.round(value ?? 0)),
          }))
          const peak = values.reduce<number>((best, value, index) => ((value ?? -1) > (values[best] ?? -1) ? index : best), 0)
          return [
            <div key={`${line.id}-${heading}`}>
              <p className="mb-1 flex flex-wrap items-center gap-x-2 text-sm">
                <LineBadge line={line} />
                <span className="font-medium">{headingName(line, station, heading)}</span>
                <span className="text-muted-foreground tabular-nums">{s.trainsPeak(crowding.slots[peak], Math.round(values[peak] ?? 0))}</span>
              </p>
              <Columns items={items} label={`${line.name(lang)}, ${headingName(line, station, heading)}`} peakValue={`${Math.round(values[peak] ?? 0)}%`} scaleTo={fullest} />
            </div>,
          ]
        }),
      )}
      <p className="text-sm text-muted-foreground">{s.trainsHint(formatDate(lang, crowding.asOf))}</p>
    </section>
  )
}
