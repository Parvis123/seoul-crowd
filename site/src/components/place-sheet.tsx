import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import { type Column, Columns } from '@/components/columns'
import { LevelBadge } from '@/components/level-badge'
import { LEVEL_DOT } from '@/components/level-colors'
import { LineBadge } from '@/components/line-badge'
import { PanelActions } from '@/components/panel-actions'
import { WeekGrid } from '@/components/week-grid'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatNumber, formatRange, useLanguage } from '@/lib/i18n'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

export function PlaceSheet({
  place,
  stations,
  onClose,
  onOpenStation,
}: {
  place: Place | null
  /** The stations this place is named after. */
  stations: Station[]
  onClose: () => void
  onOpenStation: (station: Station) => void
}) {
  const { lang, s } = useLanguage()
  const chartConfig = useMemo<ChartConfig>(() => ({ people: { label: s.chartPeople, color: 'var(--heat)' } }), [s])
  const recorded = place?.hoursRecorded ?? 0
  const other = place?.otherName(lang)
  const percent = (fraction: number) => Math.round(fraction * 100)

  const forecast: Column[] = (place?.forecast ?? []).map((hour, index) => ({
    id: hour.time,
    value: hour.people,
    axis: index % 3 === 0 ? s.hour(hour.hour) : '',
    text: s.forecastColumn(s.hour(hour.hour), s.levels[hour.level.korean], formatRange(lang, hour.range)),
    tone: LEVEL_DOT[hour.level.rank],
  }))
  const peak = place?.peakAhead
  const ages: Column[] = (place?.ages ?? []).map((share, band) => ({
    id: s.ages[band],
    value: share * 100,
    axis: s.ages[band],
    text: s.ageColumn(s.ages[band], percent(share)),
  }))
  const versus = place?.versusUsual ?? null
  const best = place?.bestTime
  return (
    <Sheet modal={false} open={place !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="gap-0 outline-none data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        // Clicking the map or a list behind the panel should change what it shows, not close it.
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          // Keep focus on the panel itself so the first grid square's tooltip doesn't pop open.
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).focus()
        }}
        tabIndex={-1}
      >
        {place && other && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-28 font-display text-2xl">{place.name(lang)}</SheetTitle>
              <SheetDescription>{s.categories[place.category]}</SheetDescription>
              <p className="text-xs text-muted-foreground/70" lang={other.lang}>
                {other.text}
              </p>
              <PanelActions id={place.id} />
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]>div]:!block">
              <div className="space-y-6 px-4 pb-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <LevelBadge level={place.level} />
                  <span className="tabular-nums">{s.panelNow(formatRange(lang, place.range))}</span>
                  <span className="text-sm text-muted-foreground">{s.panelAt(place.clock)}</span>
                  {versus !== null && place.usual && (
                    <p className="basis-full text-sm text-muted-foreground">{s.usualNow(percent(versus), place.usual.days)}</p>
                  )}
                </div>

                {forecast.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="font-medium">{s.forecastTitle}</h3>
                    <Columns items={forecast} label={s.forecastTitle} />
                    <p className="text-sm text-muted-foreground">
                      {peak && `${s.forecastPeak(s.hour(peak.hour), s.levels[peak.level.korean])} `}
                      {s.forecastHint}
                    </p>
                  </section>
                )}

                {place.visitorShare !== null && (
                  <section className="space-y-3">
                    <h3 className="font-medium">{s.whoTitle}</h3>
                    <div>
                      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                        <span className="bg-heat" style={{ flexGrow: place.visitorShare, flexBasis: 0 }} />
                        <span className="bg-muted-foreground/30" style={{ flexGrow: 1 - place.visitorShare, flexBasis: 0 }} />
                      </div>
                      <p className="mt-2 flex flex-wrap gap-x-5 text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-heat" aria-hidden="true" />
                          {s.whoVisitors(percent(place.visitorShare))}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-muted-foreground/30" aria-hidden="true" />
                          {s.whoRegulars(100 - percent(place.visitorShare))}
                        </span>
                      </p>
                    </div>
                    {ages.length > 0 && <Columns items={ages} label={s.ageTitle} />}
                    <p className="text-sm text-muted-foreground">{s.whoHint}</p>
                  </section>
                )}

                {stations.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="font-medium">{s.placeStationsTitle}</h3>
                    {stations.map((station) => (
                      <button
                        key={station.key}
                        type="button"
                        onClick={() => onOpenStation(station)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">{station.name(lang)}</span>
                          <span className="flex shrink-0 gap-1">
                            {station.lines.map((line) => (
                              <LineBadge key={line.id} line={line} />
                            ))}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                          {s.inAndOutPerDay(formatNumber(lang, station.ridership.total()))}
                        </span>
                      </button>
                    ))}
                  </section>
                )}

                <Separator />

                <section className="space-y-3">
                  <h3 className="font-medium">{s.weekTitle}</h3>
                  <WeekGrid place={place} />
                  <p className="text-sm text-muted-foreground">{s.weekHint}</p>
                </section>

                {recorded < 168 && (
                  <Alert>
                    <Info />
                    <AlertTitle>{s.hoursRecorded(recorded)}</AlertTitle>
                    <AlertDescription>{s.hoursRecordedHint}</AlertDescription>
                  </Alert>
                )}

                <section className="space-y-3">
                  <h3 className="font-medium">{s.dayTitle}</h3>
                  <ChartContainer config={chartConfig} className="h-44 w-full">
                    <AreaChart
                      data={place.typicalDay.map((entry) => ({ hour: s.hour(entry.hour), people: entry.people }))}
                      margin={{ left: 20, right: 20, top: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} interval={5} tickMargin={8} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        dataKey="people"
                        type="monotone"
                        connectNulls
                        stroke="var(--color-people)"
                        fill="var(--color-people)"
                        fillOpacity={0.2}
                        strokeWidth={2}
                        dot={recorded < 48}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <p className="text-sm text-muted-foreground">
                    {best && `${s.bestTime(s.hour(best.quietest), s.hour(best.busiest))} `}
                    {s.dayHint}
                  </p>
                </section>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
