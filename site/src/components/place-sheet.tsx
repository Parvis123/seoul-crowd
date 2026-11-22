import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import { LevelBadge } from '@/components/level-badge'
import { LineBadge } from '@/components/line-badge'
import { WeekGrid } from '@/components/week-grid'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { type Current, typicalDay } from '@/lib/data'
import { formatNumber, formatRange, placeNames, stationNames, useLanguage } from '@/lib/i18n'
import { type Station, count } from '@/lib/stations'

export function PlaceSheet({
  place,
  stations,
  onClose,
  onOpenStation,
}: {
  place: Current | null
  stations: Station[] // the stations this place is named after
  onClose: () => void
  onOpenStation: (station: Station) => void
}) {
  const { lang, s } = useLanguage()
  const chartConfig = useMemo<ChartConfig>(() => ({ people: { label: s.chartPeople, color: 'var(--heat)' } }), [s])
  const filled = place ? place.grid.flat().filter((v) => v !== null).length : 0
  const names = place ? placeNames(place, lang) : null
  const category = place ? s.categories[place.category] : undefined
  return (
    <Sheet open={place !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        onOpenAutoFocus={(event) => {
          // Keep focus on the panel itself so the first grid square's tooltip doesn't pop open.
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).focus()
        }}
        tabIndex={-1}
      >
        {place && names && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-8 text-xl">{names.primary}</SheetTitle>
              <SheetDescription>{category}</SheetDescription>
              <p className="text-xs text-muted-foreground/70" lang={names.secondaryLang}>
                {names.secondary}
              </p>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]>div]:!block">
              <div className="space-y-6 px-4 pb-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <LevelBadge level={place.latest.level} />
                  <span className="tabular-nums">{s.panelNow(formatRange(lang, place.latest))}</span>
                  <span className="text-sm text-muted-foreground">{s.panelAt(place.latest.time.slice(11))}</span>
                </div>

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
                          <span className="truncate font-medium">{stationNames(station, lang).primary}</span>
                          <span className="flex shrink-0 gap-1">
                            {station.lines.map((line) => (
                              <LineBadge key={line} line={line} />
                            ))}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                          {s.inAndOutPerDay(formatNumber(lang, count(station.all, null).total))}
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

                {filled < 168 && (
                  <Alert>
                    <Info />
                    <AlertTitle>{s.hoursRecorded(filled)}</AlertTitle>
                    <AlertDescription>{s.hoursRecordedHint}</AlertDescription>
                  </Alert>
                )}

                <section className="space-y-3">
                  <h3 className="font-medium">{s.dayTitle}</h3>
                  <ChartContainer config={chartConfig} className="h-44 w-full">
                    <AreaChart data={typicalDay(place)} margin={{ left: 20, right: 20, top: 8 }}>
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
                        dot={filled < 48}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <p className="text-sm text-muted-foreground">{s.dayHint}</p>
                </section>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
