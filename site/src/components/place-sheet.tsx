import { Info } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import { LevelBadge } from '@/components/level-badge'
import { WeekGrid } from '@/components/week-grid'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CATEGORIES, type Current, formatRange, typicalDay } from '@/lib/data'

const chartConfig = { people: { label: 'People', color: 'var(--heat)' } } satisfies ChartConfig

export function PlaceSheet({ place, onClose }: { place: Current | null; onClose: () => void }) {
  const filled = place ? place.grid.flat().filter((v) => v !== null).length : 0
  return (
    <Sheet open={place !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full gap-0 sm:max-w-xl data-[side=right]:sm:max-w-xl"
        onOpenAutoFocus={(event) => {
          // Keep focus on the panel itself so the first grid square's tooltip doesn't pop open.
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).focus()
        }}
        tabIndex={-1}
      >
        {place && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-8 text-xl">{place.label}</SheetTitle>
              <SheetDescription lang="ko">
                {place.name}
                {CATEGORIES[place.category] ? `, ${CATEGORIES[place.category]}` : ''}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-6 px-4 pb-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <LevelBadge rank={place.rank} label={place.levelLabel} />
                  <span className="tabular-nums">About {formatRange(place.latest)} people</span>
                  <span className="text-sm text-muted-foreground">at {place.latest.time.slice(11)} Seoul time</span>
                </div>

                <Separator />

                <section className="space-y-3">
                  <h3 className="font-medium">The week here</h3>
                  <WeekGrid place={place} />
                  <p className="text-sm text-muted-foreground">
                    Brighter squares are busier hours. The outlined square is this hour.
                  </p>
                </section>

                {filled < 168 && (
                  <Alert>
                    <Info />
                    <AlertTitle>
                      {filled} of 168 hours recorded so far
                    </AlertTitle>
                    <AlertDescription>
                      A reading is saved every 20 minutes, so the week fills in over the next seven days.
                    </AlertDescription>
                  </Alert>
                )}

                <section className="space-y-3">
                  <h3 className="font-medium">A typical day</h3>
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
                  <p className="text-sm text-muted-foreground">
                    Average people for each hour of the day, across the days recorded.
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
