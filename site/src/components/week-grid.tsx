import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react'

import { formatPeople, useLanguage } from '@/lib/i18n'
import type { Place } from '@/model/place'

// Matches the weekday names Intl gives for en-GB, Monday first like the data.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type Cell = { day: number; hour: number }

function seoulNow(): Cell {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  return {
    day: WEEKDAYS.indexOf(parts.find((p) => p.type === 'weekday')!.value),
    hour: Number(parts.find((p) => p.type === 'hour')!.value) % 24,
  }
}

const same = (a: Cell | null, b: Cell) => a?.day === b.day && a.hour === b.hour

/**
 * One square per hour of the week. Brighter means busier, like lit windows.
 *
 * The squares are small, so nothing depends on hitting one exactly: the whole
 * grid is one surface, each square's target runs edge to edge with its
 * neighbours, and the value shows on a steady line above instead of in a
 * pop-up. Point, drag a finger across, tap to hold a square, or use the arrow keys.
 */
export function WeekGrid({ place }: { place: Place }) {
  const { lang, s } = useLanguage()
  const max = place.weekPeak
  const now = seoulNow()
  // What the pointer or keyboard is on, and what a tap has pinned. The readout follows the first, then the second, then "now".
  const [pointed, setPointed] = useState<Cell | null>(null)
  const [held, setHeld] = useState<Cell | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const active = pointed ?? held ?? now

  const value = place.grid[active.day]?.[active.hour] ?? null
  const time = `${s.daysLong[active.day]} ${s.hour(active.hour)}`

  // Which square is under a point on screen. Works for a finger dragged across, where no square gets its own events.
  const cellAt = (event: PointerEvent): Cell | null => {
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-day]')
    return hit && grid.current?.contains(hit) ? { day: Number(hit.dataset.day), hour: Number(hit.dataset.hour) } : null
  }

  const focus = (cell: Cell) => grid.current?.querySelector<HTMLElement>(`[data-day="${cell.day}"][data-hour="${cell.hour}"]`)?.focus()
  const onKeyDown = (event: KeyboardEvent, cell: Cell) => {
    const move: Record<string, Cell> = {
      ArrowLeft: { day: cell.day, hour: Math.max(0, cell.hour - 1) },
      ArrowRight: { day: cell.day, hour: Math.min(23, cell.hour + 1) },
      ArrowUp: { day: Math.max(0, cell.day - 1), hour: cell.hour },
      ArrowDown: { day: Math.min(6, cell.day + 1), hour: cell.hour },
      Home: { day: cell.day, hour: 0 },
      End: { day: cell.day, hour: 23 },
    }
    const next = move[event.key]
    if (!next) return
    event.preventDefault()
    focus(next)
  }

  return (
    <div>
      {/* The readout. It keeps its height, so the grid never shifts as it changes. */}
      <p className="mb-3 flex items-baseline justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm" aria-hidden="true">
        <span className="font-medium">{time}</span>
        <span className="text-muted-foreground tabular-nums">
          {value === null ? s.noReading : s.aboutPeople(formatPeople(lang, value))}
        </span>
      </p>

      <div
        ref={grid}
        role="grid"
        aria-label={s.weekTitle}
        className="grid select-none"
        // A finger moving sideways reads the squares. Moving up or down still scrolls the panel.
        style={{ gridTemplateColumns: '2.25rem repeat(24, minmax(0, 1fr))', touchAction: 'pan-y' }}
        onPointerMove={(event) => {
          const cell = cellAt(event)
          if (cell && !same(pointed, cell)) setPointed(cell)
        }}
        onPointerLeave={() => setPointed(null)}
      >
        {place.grid.map((row, day) => (
          <div key={day} role="row" className="contents">
            <span
              role="rowheader"
              className={`flex items-center text-xs transition-colors ${day === active.day ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
            >
              {s.days[day]}
            </span>
            {row.map((people, hour) => {
              const cell = { day, hour }
              const label = `${s.daysLong[day]} ${s.hour(hour)}`
              const isActive = same(active, cell)
              return (
                <button
                  key={hour}
                  type="button"
                  role="gridcell"
                  data-day={day}
                  data-hour={hour}
                  // One stop for the Tab key. The arrow keys move within the grid.
                  tabIndex={isActive ? 0 : -1}
                  aria-label={people === null ? s.cellEmpty(label) : s.cellPeople(label, formatPeople(lang, people))}
                  aria-selected={same(held, cell)}
                  onClick={() => setHeld(same(held, cell) ? null : cell)}
                  onFocus={() => setPointed(cell)}
                  onBlur={() => setPointed(null)}
                  onKeyDown={(event) => onKeyDown(event, cell)}
                  // The button fills its whole track, so there are no dead gaps to land in. The square is drawn inside it.
                  className="group h-8 p-[1.5px] outline-none"
                >
                  <span
                    className={`block size-full rounded-[3px] transition-transform ${people === null ? 'bg-muted' : ''} ${
                      isActive
                        ? 'scale-110 ring-2 ring-foreground'
                        : same(now, cell)
                          ? 'ring-1 ring-foreground/70'
                          : same(held, cell)
                            ? 'ring-1 ring-foreground/40'
                            : ''
                    } group-focus-visible:ring-2 group-focus-visible:ring-ring`}
                    style={
                      people === null
                        ? undefined
                        : { background: `color-mix(in oklab, var(--heat) ${Math.round(12 + 88 * (max ? people / max : 0))}%, transparent)` }
                    }
                  />
                </button>
              )
            })}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, hour) => (
          <span
            key={hour}
            aria-hidden="true"
            className={`mt-1 text-[11px] whitespace-nowrap tabular-nums transition-colors ${
              hour === active.hour ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}
          >
            {/* Every sixth hour is labelled, and so is the hour being read, unless the two would collide. */}
            {hour % 6 === 0 ? s.hour(hour) : hour === active.hour && hour % 6 > 1 && hour % 6 < 5 ? s.hour(hour) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
