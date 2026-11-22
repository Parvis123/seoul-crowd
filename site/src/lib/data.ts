// Reads the weekly summary the collector saves on the main branch, so the
// site shows live data from any branch and from a local dev server.
export const DATA_URL =
  'https://raw.githubusercontent.com/Parvis123/seoul-crowd/main/data/weekly.json'

export type Level = '여유' | '보통' | '약간 붐빔' | '붐빔'

export type Latest = {
  time: string // Seoul local time, "YYYY-MM-DD HH:MM"
  level: Level | string
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

export type Weekly = {
  generated_at: string
  places: Place[]
}

export const LEVELS: Record<string, { label: string; rank: number }> = {
  붐빔: { label: 'Crowded', rank: 3 },
  '약간 붐빔': { label: 'Slightly crowded', rank: 2 },
  보통: { label: 'About normal', rank: 1 },
  여유: { label: 'Relaxed', rank: 0 },
}

export async function loadWeekly(signal?: AbortSignal): Promise<Weekly> {
  const res = await fetch(DATA_URL, { cache: 'no-store', signal })
  if (!res.ok) throw new Error(`The data file returned ${res.status}`)
  return res.json()
}

export type Ranked = Place & { latest: Latest; people: number; rank: number }

// "YYYY-MM-DD HH:MM" in Seoul time, as a sortable number of minutes.
function minutes(time: string): number {
  const [y, mo, d, h, mi] = time.split(/[- :]/).map(Number)
  return Date.UTC(y, mo - 1, d, h, mi) / 60000
}

/**
 * Places with a current reading, busiest first.
 *
 * For now this ranks by the city's own crowd level, with the estimated number
 * of people as the tie-breaker. Once a few weeks of history exist it should
 * rank by how each place compares with its own usual for this hour.
 */
export function rankNow(places: Place[]): Ranked[] {
  const current = places.filter((p): p is Place & { latest: Latest } => p.latest !== null)
  if (current.length === 0) return []
  const newest = Math.max(...current.map((p) => minutes(p.latest.time)))
  return current
    .filter((p) => newest - minutes(p.latest.time) <= 90) // drop places whose last reading is old
    .map((p) => ({
      ...p,
      people: (p.latest.min + p.latest.max) / 2,
      rank: LEVELS[p.latest.level]?.rank ?? 0,
    }))
    .sort((a, b) => b.rank - a.rank || b.people - a.people)
}

export function newestReading(places: Place[]): string | null {
  const times = places.flatMap((p) => (p.latest ? [p.latest.time] : []))
  return times.length ? times.sort().at(-1)! : null
}
