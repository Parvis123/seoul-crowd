import { useCrowding } from '@/api/queries'
import { Columns } from '@/components/columns'
import { useHeadingName } from '@/components/train-crowding'
import { LineBadge } from '@/components/line-badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatNumber, formatPeople, useLanguage } from '@/lib/i18n'
import { SERVICE_HOURS } from '@/model/ridership'
import type { LineSummary, StationDirectory } from '@/model/station'

/** The clock hour with the most boardings, looking only at the hours trains run. */
const peakHour = (on: readonly number[]) => SERVICE_HOURS.reduce<number>((best, h) => (on[h] > on[best] ? h : best), SERVICE_HOURS[0])

/** One line at a glance: how many stations, and the hour it is hardest to get on. */
export function LineSummaryCard({ summary, directory }: { summary: LineSummary; directory: StationDirectory }) {
  const { lang, s } = useLanguage()
  const headingName = useHeadingName(directory)
  // Seoul Metro's own figures for how full the trains get, where it has them. Otherwise boardings stand in.
  const fullest = useCrowding()?.peaks('weekday', summary.line)[0]
  return (
    <Card>
      <CardContent className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <div className="flex items-center gap-2 text-lg font-medium">
            <LineBadge line={summary.line} named />
          </div>
          <p className="text-sm text-muted-foreground">{s.stationCount(summary.stations)}</p>
          {fullest ? (
            <>
              <p className="mt-4 text-sm text-muted-foreground">{s.crushRealTitle}</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {s.trainsDays.weekday} {fullest.slot}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.crushRealBody(fullest.station.name(lang), headingName(fullest.line, fullest.station, fullest.heading), Math.round(fullest.percent))}
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm text-muted-foreground">{s.crushTitle}</p>
              <p className="text-2xl font-semibold tracking-tight">{s.hourRange(peakHour(summary.on))}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.crushBody(formatPeople(lang, Math.max(...summary.on)))} {s.crushNote}
              </p>
            </>
          )}
        </div>
        <Columns
          label={s.crushChartLabel(summary.line.name(lang))}
          items={SERVICE_HOURS.map((h) => ({
            id: String(h),
            value: summary.on[h],
            axis: h % 6 === 0 ? s.hour(h) : '',
            text: s.crushBar(s.hourRange(h), formatNumber(lang, summary.on[h])),
          }))}
        />
      </CardContent>
    </Card>
  )
}
