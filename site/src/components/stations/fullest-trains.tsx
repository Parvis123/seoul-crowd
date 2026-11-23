import { useState } from 'react'

import { useCrowding } from '@/api/queries'
import { LineBadge } from '@/components/line-badge'
import { TableSkeleton } from '@/components/page-skeleton'
import { DayPicker, useHeadingName } from '@/components/train-crowding'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatDate, useLanguage } from '@/lib/i18n'
import { type DayKind, TrainCrowding } from '@/model/crowding'
import type { Line } from '@/model/line'
import type { Station, StationDirectory } from '@/model/station'

const SHOWN = 15

/** The worst trains to be on: each station and direction at its fullest half hour, fullest first. */
export function FullestTrains({ directory, line, onSelect }: { directory: StationDirectory; line: Line | null; onSelect: (station: Station) => void }) {
  const { lang, s } = useLanguage()
  const crowding = useCrowding()
  const headingName = useHeadingName(directory)
  const [day, setDay] = useState<DayKind>(() => TrainCrowding.today())

  if (!crowding) return <TableSkeleton rows={8} />
  const peaks = crowding.peaks(day, line).slice(0, SHOWN)
  const most = Math.max(1, peaks[0]?.percent ?? 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{s.fullestTitle}</CardTitle>
        <CardDescription>{s.fullestTrainsHint}</CardDescription>
        <CardAction>
          <DayPicker day={day} onChange={setDay} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {peaks.length === 0 && <p className="text-sm text-muted-foreground">{s.trainsNone}</p>}
        <ol className="-mx-2">
          {peaks.map((peak) => {
            const name = peak.station.name(lang)
            const toward = headingName(peak.line, peak.station, peak.heading)
            const percent = Math.round(peak.percent)
            return (
              <li key={`${peak.line.id}-${peak.station.key}-${peak.heading}`}>
                <button
                  type="button"
                  onClick={() => onSelect(peak.station)}
                  aria-label={s.fullestRow(name, toward, peak.slot, percent)}
                  className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:grid-cols-[auto_minmax(0,1.3fr)_4rem_minmax(0,1fr)_3.5rem]"
                >
                  <LineBadge line={peak.line} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{name}</span>
                    <span className="block truncate text-sm text-muted-foreground">{toward}</span>
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums max-sm:hidden">{peak.slot}</span>
                  <Progress
                    value={(peak.percent / most) * 100}
                    className="h-1.5 max-sm:order-last max-sm:col-span-3 [&>[data-slot=progress-indicator]]:bg-heat"
                    aria-hidden="true"
                  />
                  <span className="text-right tabular-nums">
                    {percent}%<span className="block text-xs text-muted-foreground sm:hidden">{peak.slot}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">{s.trainsHint(formatDate(lang, crowding.asOf))}</p>
      </CardContent>
    </Card>
  )
}
