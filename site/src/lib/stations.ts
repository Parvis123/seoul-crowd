// Subway ridership. The collector on the main branch saves one row for each
// station on each line; this file turns those rows into stations people know.

export const STATIONS_URL =
  'https://raw.githubusercontent.com/Parvis123/seoul-crowd/main/data/stations.json'

type Row = {
  line: string // the name the card data uses, such as "경부선"
  station: string
  label: string | null // English name
  on: number[] // boardings on an average day, for each clock hour 0 to 23
  off: number[] // exits, the same way
  monthly: (number | null)[] // boardings + exits for each month in `months`
  weekdays: (number | null)[] | null // average boardings + exits, Monday first
}

export type StationFile = {
  generated_at: string
  month: string // "YYYY-MM", the month the hourly figures cover
  month_days: number
  months: string[]
  days: { from: string; to: string; count: number } | null
  stations: Row[]
}

export async function loadStations(signal?: AbortSignal): Promise<StationFile> {
  const res = await fetch(STATIONS_URL, { cache: 'no-store', signal })
  if (!res.ok) throw new Error(`The station file returned ${res.status}`)
  return res.json()
}

// ---------- lines ----------

export const LINE_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'gj', 'sb', 'gc', 'gg', 'arex', 'ui', 'sl', 'sh', 'other'] as const
export type LineId = (typeof LINE_IDS)[number]

type LineInfo = { ko: string; en: string; color: string; ink: string; digit?: string }

const numbered = (n: number, color: string, ink = '#fff'): LineInfo => ({
  ko: `${n}호선`,
  en: `Line ${n}`,
  color,
  ink,
  digit: String(n),
})

const DARK_INK = '#101828'

/** The operators' own line colours. `ink` is the text colour that reads on top of each. */
export const LINES: Record<LineId, LineInfo> = {
  '1': numbered(1, '#0052A4'),
  '2': numbered(2, '#00A84D'),
  '3': numbered(3, '#EF7C1C'),
  '4': numbered(4, '#00A4E3'),
  '5': numbered(5, '#996CAC'),
  '6': numbered(6, '#CD7C2F'),
  '7': numbered(7, '#747F00'),
  '8': numbered(8, '#E6186C'),
  '9': numbered(9, '#BDB092', DARK_INK),
  gj: { ko: '경의중앙선', en: 'Gyeongui-Jungang', color: '#77C4A3', ink: DARK_INK },
  sb: { ko: '수인분당선', en: 'Suin-Bundang', color: '#F5A200', ink: DARK_INK },
  gc: { ko: '경춘선', en: 'Gyeongchun', color: '#0C8E72', ink: '#fff' },
  gg: { ko: '경강선', en: 'Gyeonggang', color: '#003DA5', ink: '#fff' },
  arex: { ko: '공항철도', en: 'AREX', color: '#0090D2', ink: '#fff' },
  ui: { ko: '우이신설선', en: 'Ui-Sinseol', color: '#B0CE18', ink: DARK_INK },
  sl: { ko: '신림선', en: 'Sillim', color: '#6789CA', ink: '#fff' },
  sh: { ko: '서해선', en: 'Seohae', color: '#81A914', ink: '#fff' },
  other: { ko: '기타', en: 'Other', color: '#8A8F98', ink: '#fff' },
}

// The card data files rail sections under their railway names. These are the
// lines passengers know them by.
const DATA_LINE: Record<string, LineId> = {
  '1호선': '1',
  경부선: '1',
  경인선: '1',
  경원선: '1',
  장항선: '1',
  '2호선': '2',
  '3호선': '3',
  일산선: '3',
  '4호선': '4',
  과천선: '4',
  안산선: '4',
  '5호선': '5',
  '6호선': '6',
  '7호선': '7',
  '8호선': '8',
  '9호선': '9',
  '9호선2~3단계': '9',
  경의선: 'gj',
  중앙선: 'gj',
  분당선: 'sb',
  수인선: 'sb',
  경춘선: 'gc',
  경강선: 'gg',
  '공항철도 1호선': 'arex',
  우이신설선: 'ui',
  신림선: 'sl',
  서해선: 'sh',
}

// The Gyeongwon railway is Line 1 north of Hoegi, but these stations on it are
// served by Gyeongui-Jungang trains.
const GYEONGWON_GJ = new Set(['서빙고', '옥수', '왕십리', '응봉', '이촌', '청량리', '한남'])

// ---------- stations ----------

/** Figures for a station, or for one line's gates at a station. */
export type Figures = {
  on: number[]
  off: number[]
  weekdays: number[] | null
  monthly: (number | null)[]
}

export type Station = {
  key: string
  ko: string
  en: string
  lines: LineId[]
  byLine: Partial<Record<LineId, Figures>>
  all: Figures
}

// "잠실(송파구청)" and "잠실" are the same station; the part in brackets is a second name.
const baseName = (name: string) => name.replace(/\s*\(.*?\)\s*/g, '').trim()

// One station that the data lists under two names.
const SAME_STATION: Record<string, string> = { 이수: '총신대입구' }

// Two different stations that share a name. The Gyeongui-Jungang ones are kept apart.
const SHARED_NAMES = new Set(['신촌', '양평'])

const DISPLAY: Record<string, { ko: string; en: string }> = {
  총신대입구: { ko: '총신대입구(이수)', en: 'Chongshin Univ. (Isu)' },
  '신촌@gj': { ko: '신촌(경의중앙선)', en: 'Sinchon (Gyeongui-Jungang)' },
  '양평@gj': { ko: '양평(경의중앙선)', en: 'Yangpyeong (Gyeongui-Jungang)' },
}

const sum = (list: number[]) => list.reduce((total, value) => total + value, 0)

function addInto(target: Figures, row: Row) {
  for (let h = 0; h < 24; h++) {
    target.on[h] += row.on[h]
    target.off[h] += row.off[h]
  }
  if (row.weekdays) {
    target.weekdays ??= new Array(7).fill(0)
    row.weekdays.forEach((value, d) => (target.weekdays![d] += value ?? 0))
  }
  row.monthly.forEach((value, m) => {
    if (value !== null) target.monthly[m] = (target.monthly[m] ?? 0) + value
  })
}

const emptyFigures = (months: number): Figures => ({
  on: new Array(24).fill(0),
  off: new Array(24).fill(0),
  weekdays: null,
  monthly: new Array(months).fill(null),
})

/** Groups the file's rows into stations, each with a total and a figure for each line. */
export function buildStations(file: StationFile): Station[] {
  const stations = new Map<string, Station>()
  for (const row of file.stations) {
    // A few rows are stray taps on a line that does not stop there.
    if (sum(row.on) + sum(row.off) < 10) continue
    const base = baseName(row.station)
    const line: LineId = row.line === '경원선' && GYEONGWON_GJ.has(base) ? 'gj' : (DATA_LINE[row.line] ?? 'other')
    const name = SAME_STATION[base] ?? base
    const key = SHARED_NAMES.has(name) && line === 'gj' ? `${name}@gj` : name

    let station = stations.get(key)
    if (!station) {
      station = {
        key,
        ko: DISPLAY[key]?.ko ?? name,
        en: DISPLAY[key]?.en ?? (row.label ?? name).replaceAll('`', '’'),
        lines: [],
        byLine: {},
        all: emptyFigures(file.months.length),
      }
      stations.set(key, station)
    }
    station.byLine[line] ??= emptyFigures(file.months.length)
    addInto(station.byLine[line], row)
    addInto(station.all, row)
  }
  for (const station of stations.values()) {
    station.lines = LINE_IDS.filter((id) => station.byLine[id])
  }
  return [...stations.values()]
}

// ---------- reading figures ----------

/** The hours trains run, in the order of a service day: 05:00 through to 01:00. */
export const SERVICE_HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1]

/** Boardings, exits and both together, for one hour or for the whole day when `hour` is null. */
export function count(figures: Figures, hour: number | null) {
  const on = hour === null ? sum(figures.on) : figures.on[hour]
  const off = hour === null ? sum(figures.off) : figures.off[hour]
  return { on, off, total: on + off }
}

/** The clock hour with the most boardings and exits. */
export function busiestHour(figures: Figures): number {
  let best = SERVICE_HOURS[0]
  for (const h of SERVICE_HOURS) {
    if (figures.on[h] + figures.off[h] > figures.on[best] + figures.off[best]) best = h
  }
  return best
}

/** The clock hour with the most boardings, which is when it is hardest to get on. */
export function busiestBoardingHour(on: number[]): number {
  return SERVICE_HOURS.reduce((best, h) => (on[h] > on[best] ? h : best), SERVICE_HOURS[0])
}

/** Monday = 0. Null when there are no daily figures. */
export function busiestWeekday(figures: Figures): number | null {
  if (!figures.weekdays) return null
  return figures.weekdays.indexOf(Math.max(...figures.weekdays))
}

/** The figures to show for a station: one line's gates when a line is chosen, otherwise everything. */
export const figuresFor = (station: Station, line: LineId | null): Figures =>
  (line && station.byLine[line]) || station.all

export type LineSummary = {
  line: LineId
  stations: number
  on: number[] // boardings on the whole line for each clock hour
  total: number // boardings + exits on the whole line, for the hour or the day
  top: Station
  topCount: number
}

/** For each line: how busy it is and which of its stations is busiest, for one hour or the whole day. */
export function summariseLines(stations: Station[], hour: number | null): LineSummary[] {
  const lines = new Map<LineId, LineSummary>()
  for (const station of stations) {
    for (const line of station.lines) {
      const figures = station.byLine[line]!
      const here = count(figures, hour).total
      let entry = lines.get(line)
      if (!entry) {
        entry = { line, stations: 0, on: new Array(24).fill(0), total: 0, top: station, topCount: -1 }
        lines.set(line, entry)
      }
      entry.stations += 1
      entry.total += here
      figures.on.forEach((value, h) => (entry.on[h] += value))
      if (here > entry.topCount) {
        entry.top = station
        entry.topCount = here
      }
    }
  }
  return [...lines.values()].sort((a, b) => b.topCount - a.topCount)
}

// ---------- link to the crowd places ----------

/**
 * The stations a crowd place is named after. "신논현역·논현역" gives two,
 * "홍대입구역(2호선)" gives one, and a park gives none.
 */
export function stationKeysForPlace(placeName: string, known: Set<string>): string[] {
  if (!placeName.includes('역')) return []
  const keys: string[] = []
  for (const part of placeName.split('·')) {
    const base = baseName(part)
    const match = [base, base.replace(/역$/, ''), `${base}역`].find((name) => known.has(name))
    if (match && !keys.includes(match)) keys.push(match)
  }
  return keys
}
