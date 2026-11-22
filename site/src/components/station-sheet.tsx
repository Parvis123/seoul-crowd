import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import { Columns } from '@/components/columns'
import { LevelBadge } from '@/components/level-badge'
import { LineBadge } from '@/components/line-badge'
import { Button } from '@/components/ui/button'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatCompact, formatDay, formatMonth, formatNumber, formatRange, useLanguage } from '@/lib/i18n'
import type { Place } from '@/model/place'
import type { Station, StationDirectory } from '@/model/station'

const daysIn = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function StationSheet({
  station,
  directory,
  places,
  onClose,
  onOpenPlace,
}: {
  station: Station | null
  directory: StationDirectory
  /** The crowd places named after this station. */
  places: Place[]
  onClose: () => void
  onOpenPlace: (place: Place) => void
}) {
  const { lang, s } = useLanguage()
  const number = (value: number) => formatNumber(lang, value)

  const dayConfig = useMemo<ChartConfig>(
    () => ({
      // The legend lists series by key, so these names keep boardings first.
      boardings: { label: s.seriesOn, color: 'var(--series-on)' },
      exits: { label: s.seriesOff, color: 'var(--series-off)' },
    }),
    [s],
  )
  const trendConfig = useMemo<ChartConfig>(() => ({ value: { label: s.trendSeries, color: 'var(--heat)' } }), [s])

  const other = station?.otherName(lang)
  const figures = station?.ridership
  const weekday = figures?.busiestWeekday ?? null

  return (
    <Sheet modal={false} open={station !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="gap-0 outline-none data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        // Clicking the map or a list behind the panel should change what it shows, not close it.
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          // Keep focus on the panel itself so the first chart's tooltip doesn't pop open.
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).focus()
        }}
        tabIndex={-1}
      >
        {station && other && figures && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-8 font-display text-2xl">{station.name(lang)}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {station.lines.map((line) => (
                    <LineBadge key={line.id} line={line} named />
                  ))}
                </div>
              </SheetDescription>
              <p className="text-xs text-muted-foreground/70" lang={other.lang}>
                {other.text}
              </p>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]>div]:!block">
              <div className="space-y-6 px-4 pb-6">
                <dl className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                  {[
                    [s.tileTotal, number(figures.total())],
                    [s.tileHour, s.hourRange(figures.busiestHour)],
                    [s.tileDay, weekday === null ? s.none : s.daysLong[weekday]],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2.5 sm:block sm:p-3"
                    >
                      <dt className="text-sm text-muted-foreground sm:text-xs">{label}</dt>
                      <dd className="font-semibold sm:mt-1">{value}</dd>
                    </div>
                  ))}
                </dl>

                {places.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="font-medium">{s.stationNowTitle}</h3>
                    {places.map((place) => (
                      <div key={place.code} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{place.name(lang)}</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <LevelBadge level={place.level} />
                            <span className="tabular-nums">{s.rangePeople(formatRange(lang, place.range))}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => onOpenPlace(place)}>
                          {s.seePlace}
                        </Button>
                      </div>
                    ))}
                  </section>
                )}

                <Separator />

                <section className="space-y-3">
                  <h3 className="font-medium">{s.dayChartTitle}</h3>
                  <ChartContainer config={dayConfig} className="h-56 w-full">
                    <LineChart
                      data={figures.throughTheDay.map((entry) => ({ ...entry, hour: s.hour(entry.hour) }))}
                      margin={{ left: 0, right: 12, top: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="hour"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        ticks={[6, 12, 18, 0].map(s.hour)}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        tickFormatter={(value: number) => formatCompact(lang, value)}
                      />
                      <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      {(['boardings', 'exits'] as const).map((key) => (
                        <Line
                          key={key}
                          dataKey={key}
                          type="monotone"
                          stroke={`var(--color-${key})`}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, stroke: 'var(--popover)', strokeWidth: 2 }}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                  <p className="text-sm text-muted-foreground">{s.dayChartHint(formatMonth(lang, directory.month))}</p>
                </section>

                {figures.weekdays && directory.days && (
                  <section className="space-y-3">
                    <h3 className="font-medium">{s.weekdaysTitle}</h3>
                    <Columns
                      label={s.weekdaysTitle}
                      peakValue={number(Math.max(...figures.weekdays))}
                      items={figures.weekdays.map((value, d) => ({
                        id: String(d),
                        value,
                        axis: s.days[d],
                        text: s.weekdayBar(s.daysLong[d], number(value)),
                      }))}
                    />
                    <p className="text-sm text-muted-foreground">
                      {s.weekdaysHint(formatDay(lang, directory.days.from), formatDay(lang, directory.days.to))}
                    </p>
                  </section>
                )}

                {station.lines.length > 1 && (
                  <section className="space-y-3">
                    <h3 className="font-medium">{s.linesTitle}</h3>
                    <ul className="space-y-2.5">
                      {station.lines.map((line) => {
                        const total = station.gatesOn(line)?.total() ?? null
                        return (
                          <li key={line.id} className="grid grid-cols-[9.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-sm">
                            <LineBadge line={line} named />
                            {total === null ? (
                              <span className="col-span-2 text-muted-foreground">{s.noOwnGates}</span>
                            ) : (
                              <>
                                <Progress
                                  value={(total / figures.total()) * 100}
                                  className="h-1.5 [&>[data-slot=progress-indicator]]:bg-heat"
                                  aria-hidden="true"
                                />
                                <span className="text-right tabular-nums">{number(total)}</span>
                              </>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    <p className="text-sm text-muted-foreground">{s.linesHint}</p>
                  </section>
                )}

                <section className="space-y-3">
                  <h3 className="font-medium">{s.trendTitle}</h3>
                  <ChartContainer config={trendConfig} className="h-44 w-full">
                    <AreaChart
                      data={directory.months.map((month, m) => ({
                        month: formatMonth(lang, month, true),
                        value: figures.monthly[m] === null ? null : Math.round(figures.monthly[m]! / daysIn(month)),
                      }))}
                      margin={{ left: 0, right: 12, top: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} interval={2} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        tickFormatter={(value: number) => formatCompact(lang, value)}
                      />
                      <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                      <Area
                        dataKey="value"
                        type="monotone"
                        stroke="var(--color-value)"
                        fill="var(--color-value)"
                        fillOpacity={0.1}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, stroke: 'var(--popover)', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <p className="text-sm text-muted-foreground">{s.trendHint}</p>
                </section>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
