import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DaySpark } from '@/components/day-spark'
import { Columns } from '@/components/columns'
import { LineBadge } from '@/components/line-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatMonth, formatNumber, formatPeople, useLanguage } from '@/lib/i18n'
import { Line, type LineId } from '@/model/line'
import { SERVICE_HOURS } from '@/model/ridership'
import type { Station, StationDirectory } from '@/model/station'

type SortKey = 'name' | 'peak' | 'on' | 'off' | 'total'
const PAGE = 40

// 05:00 comes first on the slider and 01:00 last, the way a service day runs.
const sliderOf = (hour: number) => SERVICE_HOURS.indexOf(hour as (typeof SERVICE_HOURS)[number])

/** The service hour with the most boardings in a list of 24. */
const peakHour = (on: readonly number[]) => SERVICE_HOURS.reduce<number>((best, h) => (on[h] > on[best] ? h : best), SERVICE_HOURS[0])

function seoulHour() {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', hour12: false }).format(new Date()),
  )
  return hour % 24
}

export function Stations({
  directory,
  onSelect,
}: {
  directory: StationDirectory
  onSelect: (station: Station) => void
}) {
  const { lang, s } = useLanguage()
  const [view, setView] = useState<'stations' | 'lines'>('stations')
  const [line, setLine] = useState<Line | null>(null)
  const [hour, setHour] = useState<number | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; down: boolean }>({ key: 'total', down: true })
  const [shown, setShown] = useState(PAGE)

  const month = formatMonth(lang, directory.month)
  const number = (value: number) => formatNumber(lang, value)
  const summaries = useMemo(() => directory.lineSummaries(hour), [directory, hour])
  const lineSummary = line ? summaries.find((entry) => entry.line === line) : undefined

  const rows = useMemo(() => {
    const dir = sort.down ? -1 : 1
    return directory
      .on(line)
      .map((station) => {
        const ridership = station.ridershipOn(line)
        return {
          station,
          ridership,
          on: ridership.boardings(hour),
          off: ridership.exits(hour),
          total: ridership.total(hour),
          peak: ridership.busiestHour,
        }
      })
      .sort((a, b) => {
        if (sort.key === 'name') return a.station.name(lang).localeCompare(b.station.name(lang), lang) * dir
        // Sort the busiest hour as a service day runs, so 00:00 comes after 23:00.
        if (sort.key === 'peak') return (sliderOf(a.peak) - sliderOf(b.peak) || b.total - a.total) * dir
        return (a[sort.key] - b[sort.key]) * dir
      })
  }, [directory, line, hour, sort, lang])

  const changeSort = (key: SortKey) => {
    setSort((current) => ({ key, down: current.key === key ? !current.down : key !== 'name' && key !== 'peak' }))
    setShown(PAGE)
  }

  const header = (key: SortKey, label: string, className = '') => {
    const active = sort.key === key
    const Icon = !active ? ArrowUpDown : sort.down ? ArrowDown : ArrowUp
    return (
      <TableHead className={className} aria-sort={active ? (sort.down ? 'descending' : 'ascending') : 'none'}>
        <Button variant="ghost" size="sm" className="-ml-2.5" onClick={() => changeSort(key)}>
          {label}
          <Icon data-icon="inline-end" className={active ? '' : 'text-muted-foreground'} />
        </Button>
      </TableHead>
    )
  }
  const right = 'text-right [&>button]:-mr-2.5 [&>button]:ml-0'

  return (
    <div className="space-y-4">
      {/* One block of controls for everything below it */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={view}
            onValueChange={(value) => value && setView(value as 'stations' | 'lines')}
            aria-label={s.viewLabel}
          >
            <ToggleGroupItem value="stations" className="px-3">
              {s.viewStations}
            </ToggleGroupItem>
            <ToggleGroupItem value="lines" className="px-3">
              {s.viewLines}
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-sm text-muted-foreground">{s.timeLabel}</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={hour === null ? 'day' : 'hour'}
              onValueChange={(value) => {
                if (!value) return
                const now = seoulHour()
                setHour(value === 'day' ? null : sliderOf(now) >= 0 ? now : 18)
                setShown(PAGE)
              }}
              aria-label={s.timeLabel}
            >
              <ToggleGroupItem value="day" className="px-2.5">
                {s.allDay}
              </ToggleGroupItem>
              <ToggleGroupItem value="hour" className="px-2.5">
                {s.oneHour}
              </ToggleGroupItem>
            </ToggleGroup>
            {hour !== null && (
              <>
                <Slider
                  className="w-40 sm:w-48"
                  min={0}
                  max={SERVICE_HOURS.length - 1}
                  step={1}
                  value={[sliderOf(hour)]}
                  onValueChange={([value]) => setHour(SERVICE_HOURS[value])}
                  thumbLabel={s.hourSliderLabel}
                  thumbValueText={s.hourRange(hour)}
                />
                <span className="w-28 text-sm font-medium tabular-nums">{s.hourRange(hour)}</span>
              </>
            )}
          </div>
        </div>

        {view === 'stations' && (
            <div className="max-sm:-mx-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:[scrollbar-width:none]">
            <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={1.5}
                value={line?.id ?? 'all'}
                onValueChange={(value) => {
                  setLine(!value || value === 'all' ? null : Line.get(value as LineId))
                  setShown(PAGE)
                }}
                className="flex-wrap max-sm:flex-nowrap"
                aria-label={s.lineFilterLabel}
              >
                <ToggleGroupItem value="all">{s.allLines}</ToggleGroupItem>
                {directory.lines.map((each) => (
                  <ToggleGroupItem
                    key={each.id}
                    value={each.id}
                    aria-label={each.name(lang)}
                    className={each.isNumbered ? 'px-1.5' : 'pr-2.5 pl-1.5'}
                  >
                    <LineBadge line={each} named={!each.isNumbered} />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
        )}

        <p className="text-sm text-muted-foreground">
          {hour === null ? s.stationsHintDay(month) : s.stationsHintHour(month, s.hourRange(hour))}{' '}
          {view === 'stations' && line ? s.lineGatesHint(line.name(lang)) : s.shinbundang}
        </p>
      </div>

      {view === 'stations' && line && lineSummary && (
        <Card>
          <CardContent className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div>
              <div className="flex items-center gap-2 text-lg font-medium">
                <LineBadge line={line} named />
              </div>
              <p className="text-sm text-muted-foreground">{s.stationCount(lineSummary.stations)}</p>
              <p className="mt-4 text-sm text-muted-foreground">{s.crushTitle}</p>
              <p className="text-2xl font-semibold tracking-tight">{s.hourRange(peakHour(lineSummary.on))}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.crushBody(formatPeople(lang, Math.max(...lineSummary.on)))}{' '}
                {s.crushNote}
              </p>
            </div>
            <Columns
              label={s.crushChartLabel(line.name(lang))}
              items={SERVICE_HOURS.map((h) => ({
                id: String(h),
                value: lineSummary.on[h],
                axis: h % 6 === 0 ? s.hour(h) : '',
                text: s.crushBar(s.hourRange(h), number(lineSummary.on[h])),
              }))}
            />
          </CardContent>
        </Card>
      )}

      {view === 'lines' && (
        <Card>
          <CardHeader>
            <CardTitle>{s.byLineTitle}</CardTitle>
            <CardDescription>{s.byLineHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="-mx-2">
              {summaries.map((entry) => {
                const name = entry.top.name(lang)
                const lineName = entry.line.name(lang)
                return (
                  <li key={entry.line.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setLine(entry.line)
                        setShown(PAGE)
                        setView('stations')
                      }}
                      aria-label={s.byLineRow(lineName, name, number(entry.topCount))}
                      className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1.2fr)_6rem]"
                    >
                      <span className="flex items-center gap-2 text-sm text-muted-foreground max-sm:col-span-2">
                        <LineBadge line={entry.line} named />
                      </span>
                      <span className="truncate font-medium">{name}</span>
                      <Progress
                        value={(entry.topCount / Math.max(1, summaries[0].topCount)) * 100}
                        className="h-1.5 max-sm:order-last max-sm:col-span-2 [&>[data-slot=progress-indicator]]:bg-heat"
                        aria-hidden="true"
                      />
                      <span className="text-right tabular-nums">{number(entry.topCount)}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {view === 'stations' && (
        <>
          <Card className="py-0">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {header('name', s.colStation, 'pl-4')}
                    <TableHead className="hidden md:table-cell">{s.colShape}</TableHead>
                    {header('peak', s.colPeak, 'hidden sm:table-cell')}
                    {header('on', s.colOn, `hidden md:table-cell ${right}`)}
                    {header('off', s.colOff, `hidden md:table-cell ${right}`)}
                    {header('total', s.colTotal, `pr-4 ${right}`)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, shown).map(({ station, ridership, on, off, total, peak }) => (
                    <TableRow
                      key={station.key}
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => onSelect(station)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelect(station)
                        }
                      }}
                    >
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-2">
                          <span className="max-w-36 truncate font-medium sm:max-w-56">
                            {station.name(lang)}
                          </span>
                          <span className="flex shrink-0 gap-1">
                            {station.lines.map((each) => (
                              <LineBadge key={each.id} line={each} />
                            ))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <DaySpark ridership={ridership} hour={hour} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                        {s.hour(peak)}
                      </TableCell>
                      <TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
                        {number(on)}
                      </TableCell>
                      <TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
                        {number(off)}
                      </TableCell>
                      <TableCell className="pr-4 text-right tabular-nums">{number(total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {rows.length > 0 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">{s.showing(Math.min(shown, rows.length), rows.length)}</p>
              {rows.length > shown && (
                <Button variant="outline" onClick={() => setShown(shown + PAGE)}>
                  {s.showMore(Math.min(PAGE, rows.length - shown))}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
