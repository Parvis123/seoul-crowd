import categories from '@/data/categories.json'

// Reads the weekly summary the collector saves on the main branch, so the
// site shows live data from any branch and from a local dev server.
export const DATA_URL =
  'https://raw.githubusercontent.com/Parvis123/seoul-crowd/main/data/weekly.json'

export type Latest = {
  time: string // Seoul local time, "YYYY-MM-DD HH:MM"
  level: string
  min: number
  max: number
}

export type Place = {
  name: string // the city's official Korean name
  label: string // English name
  code: string
  readings: number
  first_reading: string
  latest: Latest | null
  grid: (number | null)[][] // [weekday, Monday first][hour] = average people
}

export type Weekly = { generated_at: string; places: Place[] }

/** The city's four crowd levels, quietest to busiest. */
export const LEVEL_RANK: Record<string, number> = { 붐빔: 3, '약간 붐빔': 2, 보통: 1, 여유: 0 }

export async function loadWeekly(signal?: AbortSignal): Promise<Weekly> {
  const res = await fetch(DATA_URL, { cache: 'no-store', signal })
  if (!res.ok) throw new Error(`The data file returned ${res.status}`)
  return res.json()
}

export type Current = Place & {
  latest: Latest
  people: number // middle of the estimated range
  rank: number // 0 relaxed to 3 crowded
  category: string
  fill: number // people here as a percentage of the busiest place right now
}

// "YYYY-MM-DD HH:MM" in Seoul time, as a sortable number of minutes.
function minutes(time: string): number {
  const [y, mo, d, h, mi] = time.split(/[- :]/).map(Number)
  return Date.UTC(y, mo - 1, d, h, mi) / 60000
}

/** Places whose latest reading is recent, with the derived numbers the page shows. */
export function currentPlaces(places: Place[]): Current[] {
  const withReading = places.filter((p): p is Place & { latest: Latest } => p.latest !== null)
  if (withReading.length === 0) return []
  const newest = Math.max(...withReading.map((p) => minutes(p.latest.time)))
  const recent = withReading.filter((p) => newest - minutes(p.latest.time) <= 90)
  const most = Math.max(...recent.map((p) => (p.latest.min + p.latest.max) / 2))
  return recent.map((p) => {
    const people = (p.latest.min + p.latest.max) / 2
    return {
      ...p,
      people,
      rank: LEVEL_RANK[p.latest.level] ?? 0,
      category: (categories as Record<string, string>)[p.name] ?? '',
      fill: most > 0 ? Math.max(1, Math.round((people / most) * 100)) : 0,
    }
  })
}

/**
 * Busiest first. For now this uses the city's own crowd level, with the
 * estimated number of people as the tie-breaker. Once a few weeks of history
 * exist it should compare each place with its own usual for this hour.
 */
export function byBusiest(a: Current, b: Current): number {
  return b.rank - a.rank || b.people - a.people
}

export function newestReading(places: Current[]): string | null {
  return places.length ? places.map((p) => p.latest.time).sort().at(-1)! : null
}

/** Average people for each hour of the day, across the weekdays that have a reading. */
export function typicalDay(place: Place): { hour: string; people: number | null }[] {
  return Array.from({ length: 24 }, (_, h) => {
    const values = place.grid.map((row) => row[h]).filter((v): v is number => v !== null)
    return {
      hour: `${String(h).padStart(2, '0')}:00`,
      people: values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null,
    }
  })
}
