import type { Line } from '@/model/line'
import type { Station } from '@/model/station'

// How full the trains are, from Seoul Metro: the average crowding of the trains
// passing each station in each half hour, by direction, for three kinds of day.
// 34 means every seat is taken. 100 is what a car is built to carry.

export type RawCrowdingFile = {
  file: string
  as_of: string // "YYYY-MM-DD"
  slots: string[] // the start of each half hour, "HH:MM"
  /** day, line number, station number, station name, direction, one figure per slot */
  rows: [string, number, string, string, string, (number | null)[]][]
}

export const DAY_KINDS = ['weekday', 'saturday', 'sunday'] as const
export type DayKind = (typeof DAY_KINDS)[number]

/**
 * Which way a train is going. `on` is the direction of rising stop numbers:
 * "down" on most lines, the inner loop on Line 2. `back` is the other way.
 */
export type Heading = 'on' | 'back'
const HEADINGS: Record<string, Heading> = { 하선: 'on', 내선: 'on', 상선: 'back', 외선: 'back' }

export type Peak = { line: Line; station: Station; heading: Heading; slot: string; percent: number }

/** Every seat taken. Below this, you can sit. */
export const SEATS_FULL = 34
/** What a car is built to carry. Above this it is a squeeze. */
export const CAPACITY = 100

export class TrainCrowding {
  /** The date of Seoul Metro's file. */
  readonly asOf: string
  readonly slots: readonly string[]
  private readonly figures = new Map<string, readonly (number | null)[]>()
  private readonly known: { day: DayKind; line: Line; station: Station; heading: Heading }[] = []

  /** `stationAt` says which station a line's stop is, by the name in the file. Rows for stops it does not know are left out. */
  constructor(file: RawCrowdingFile, lineOf: (n: number) => Line | null, stationAt: (line: Line, name: string) => Station | null) {
    this.asOf = file.as_of
    this.slots = file.slots
    for (const [day, lineNumber, , name, direction, values] of file.rows) {
      const line = lineOf(lineNumber)
      const station = line && stationAt(line, name)
      const heading = HEADINGS[direction]
      if (!line || !station || !heading || !DAY_KINDS.includes(day as DayKind)) continue
      const key = TrainCrowding.key(day as DayKind, line, station, heading)
      if (this.figures.has(key)) continue
      this.figures.set(key, values)
      this.known.push({ day: day as DayKind, line, station, heading })
    }
  }

  private static key(day: DayKind, line: Line, station: Station, heading: Heading) {
    return `${day}|${line.id}|${station.key}|${heading}`
  }

  /** The kind of day it is in Seoul right now. */
  static today(now = new Date()): DayKind {
    const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', weekday: 'short' }).format(now)
    return day === 'Sat' ? 'saturday' : day === 'Sun' ? 'sunday' : 'weekday'
  }

  /** The half hour a moment in Seoul falls in, as an index into `slots`, or null outside service hours. */
  slotAt(now = new Date()): number | null {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
    const hour = Number(parts.find((part) => part.type === 'hour')?.value) % 24
    const minute = Number(parts.find((part) => part.type === 'minute')?.value)
    const index = this.slots.indexOf(`${String(hour).padStart(2, '0')}:${minute < 30 ? '00' : '30'}`)
    return index >= 0 ? index : null
  }

  /** True when the file covers this line at this station. It covers Lines 1 to 8 only. */
  covers(line: Line, station: Station): boolean {
    return this.figures.has(TrainCrowding.key('weekday', line, station, 'on')) || this.figures.has(TrainCrowding.key('weekday', line, station, 'back'))
  }

  /** The half-hourly figures for trains leaving a station one way on one kind of day. */
  through(line: Line, station: Station, heading: Heading, day: DayKind): readonly (number | null)[] | null {
    return this.figures.get(TrainCrowding.key(day, line, station, heading)) ?? null
  }

  /** How full the trains leaving a station one way are in one half hour. */
  at(line: Line, station: Station, heading: Heading, day: DayKind, slot: number | null): number | null {
    return slot === null ? null : (this.through(line, station, heading, day)?.[slot] ?? null)
  }

  /** The fullest half hour for each station and direction on one kind of day, fullest first. */
  peaks(day: DayKind, line: Line | null = null): Peak[] {
    return this.known
      .filter((each) => each.day === day && (!line || each.line === line))
      .flatMap((each): Peak[] => {
        const values = this.through(each.line, each.station, each.heading, day) ?? []
        let top = -1
        values.forEach((value, index) => {
          if (value !== null && (top < 0 || value > (values[top] as number))) top = index
        })
        return top < 0 ? [] : [{ line: each.line, station: each.station, heading: each.heading, slot: this.slots[top], percent: values[top] as number }]
      })
      .sort((a, b) => b.percent - a.percent)
  }
}
