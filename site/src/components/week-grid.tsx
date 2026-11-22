import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPeople, useLanguage } from '@/lib/i18n'
import type { Place } from '@/model/place'

// Matches the weekday names Intl gives for en-GB, Monday first like the data.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function seoulNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  return {
    weekday: WEEKDAYS.indexOf(parts.find((p) => p.type === 'weekday')!.value),
    hour: Number(parts.find((p) => p.type === 'hour')!.value) % 24,
  }
}

/** One square per hour of the week. Brighter means busier, like lit windows. */
export function WeekGrid({ place }: { place: Place }) {
  const max = place.weekPeak
  const now = seoulNow()
  const { lang, s } = useLanguage()
  return (
    <TooltipProvider delayDuration={80}>
      <div
        className="grid items-center gap-[3px]"
        style={{ gridTemplateColumns: '2.25rem repeat(24, minmax(0, 1fr))' }}
      >
        {place.grid.map((row, d) => (
          <div key={d} className="contents">
            <span className="text-xs text-muted-foreground">{s.days[d]}</span>
            {row.map((value, h) => {
              const time = `${s.daysLong[d]} ${String(h).padStart(2, '0')}:00`
              const text = value === null ? s.cellEmpty(time) : s.cellPeople(time, formatPeople(lang, value))
              const isNow = d === now.weekday && h === now.hour
              return (
                <Tooltip key={h}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={text}
                      className={`aspect-[4/5] rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring ${
                        value === null ? 'bg-muted' : ''
                      } ${isNow ? 'ring-2 ring-foreground ring-offset-1 ring-offset-popover' : ''}`}
                      style={
                        value === null
                          ? undefined
                          : {
                              background: `color-mix(in oklab, var(--heat) ${Math.round(
                                12 + 88 * (max ? value / max : 0),
                              )}%, transparent)`,
                            }
                      }
                    />
                  </TooltipTrigger>
                  <TooltipContent>{text}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-[11px] whitespace-nowrap text-muted-foreground">
            {h % 6 === 0 ? `${String(h).padStart(2, '0')}:00` : ''}
          </span>
        ))}
      </div>
    </TooltipProvider>
  )
}
