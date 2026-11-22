import type { Lang } from '@/lib/i18n'
import { type LatLng, centreOf, kilometresBetween } from '@/model/geo'
import { Line, type LineId } from '@/model/line'
import { Ridership } from '@/model/ridership'
import { baseName, fold, initials } from '@/model/text'

// ---------- the file the collector saves ----------

type RawStation = {
  line: string // the railway name the card data uses, such as "경부선"
  station: string
  label: string | null // English name
  on: number[]
  off: number[]
  monthly: (number | null)[]
  weekdays: (number | null)[] | null
}

export type RawStationFile = {
  generated_at: string
  month: string // "YYYY-MM", the month the hourly figures cover
  month_days: number
  months: string[]
  days: { from: string; to: string; count: number } | null
  stations: RawStation[]
  /** { station name: [[railway, lat, lng], ...] } */
  coordinates?: Record<string, [string, number, number][]>
}

// ---------- quirks of the city's data ----------

// One station that the data lists under two names.
const SAME_STATION: Record<string, string> = { 이수: '총신대입구' }

// Two different stations that share a name. The Gyeongui-Jungang ones are kept apart.
const SHARED_NAMES = new Set(['신촌', '양평'])

const DISPLAY: Record<string, Record<Lang, string>> = {
  총신대입구: { ko: '총신대입구(이수)', en: 'Chongshin Univ. (Isu)' },
  '신촌@gj': { ko: '신촌(경의중앙선)', en: 'Sinchon (Gyeongui-Jungang)' },
  '양평@gj': { ko: '양평(경의중앙선)', en: 'Yangpyeong (Gyeongui-Jungang)' },
}

// Stations the position list still has under an older name.
const OLD_NAMES: Record<string, string> = { 자양: '뚝섬유원지', 평택지제: '지제', 한국항공대: '화전' }

// What people call a station when it is not its name.
const NICKNAMES: Record<string, string[]> = {
  홍대입구: ['hongdae', '홍대'],
  건대입구: ['kondae', 'geondae', '건대'],
  동대문역사문화공원: ['ddp'],
  서울대입구: ['snu', '서울대'],
  고속터미널: ['gosok', '고터', '고속버스터미널'],
  삼성: ['coex', '코엑스'],
  잠실: ['lotte world', '롯데월드'],
  이대: ['ewha', '이화여대'],
  성신여대입구: ['성신여대'],
  총신대입구: ['isu', '이수'],
  김포공항: ['gimpo airport', 'gmp'],
  인천공항1터미널: ['incheon airport', 'icn'],
}

// ---------- a station ----------

/** One station, with everything known about it. A station on several lines is still one station. */
export class Station {
  readonly kind = 'station'
  /** A stable id: the Korean name, with "@gj" for the two names shared by different stations. */
  readonly key: string
  /** The lines that stop here, in map order. */
  readonly lines: readonly Line[]
  /** Every line's gates together. */
  readonly ridership: Ridership
  readonly location: LatLng | null
  private readonly names: Record<Lang, string>
  private readonly byLine: ReadonlyMap<LineId, Ridership>
  private readonly terms: string[]
  private readonly koreanInitials: string

  constructor(init: {
    key: string
    names: Record<Lang, string>
    byLine: ReadonlyMap<LineId, Ridership>
    location: LatLng | null
  }) {
    this.key = init.key
    this.names = init.names
    this.byLine = init.byLine
    this.location = init.location
    this.lines = Line.all.filter((line) => init.byLine.has(line.id))
    this.ridership = Ridership.combine([...init.byLine.values()])
    const plainKey = init.key.replace(/@.*/, '')
    this.terms = [init.names.ko, init.names.en, plainKey, ...(NICKNAMES[plainKey] ?? [])].map(fold)
    this.koreanInitials = initials(init.names.ko)
  }

  name(lang: Lang): string {
    return this.names[lang]
  }

  /** The name in the other language, for the small line in the panel. */
  otherName(lang: Lang): { text: string; lang: Lang } {
    const other: Lang = lang === 'ko' ? 'en' : 'ko'
    return { text: this.names[other], lang: other }
  }

  serves(line: Line): boolean {
    return this.byLine.has(line.id)
  }

  /** One line's gates when a line is given and stops here, otherwise the whole station. */
  ridershipOn(line: Line | null): Ridership {
    return (line && this.byLine.get(line.id)) || this.ridership
  }

  /** The line with the most riders here. Its colour stands for the station on the map. */
  get mainLine(): Line {
    return this.lines.reduce((best, line) => (this.ridershipOn(line).total() > this.ridershipOn(best).total() ? line : best))
  }

  /**
   * How well a folded search query fits: 0 an exact name, 1 the start of one,
   * 2 inside one, 3 Korean first consonants. Null when it does not fit.
   */
  match(query: string, queryInitials: string | null): number | null {
    if (queryInitials) return this.koreanInitials.includes(queryInitials) ? 3 : null
    if (this.terms.includes(query)) return 0
    if (this.terms.some((term) => term.startsWith(query))) return 1
    return this.terms.some((term) => term.includes(query)) ? 2 : null
  }
}

// ---------- every station ----------

export type LineSummary = {
  line: Line
  stations: number
  /** Boardings on the whole line for each clock hour. */
  on: number[]
  /** The line's busiest station for the hour asked about, counting this line's gates only. */
  top: Station
  topCount: number
}

/** Every station, built from the collector's file. */
export class StationDirectory {
  readonly stations: readonly Station[]
  /** "YYYY-MM", the month the hourly figures are an average day of. */
  readonly month: string
  /** The months each station's `monthly` figures cover, oldest first. */
  readonly months: readonly string[]
  /** The days the weekday averages come from. */
  readonly days: { from: string; to: string; count: number } | null
  private readonly byKey: Map<string, Station>

  private constructor(stations: readonly Station[], file: RawStationFile) {
    this.stations = stations
    this.month = file.month
    this.months = file.months
    this.days = file.days
    this.byKey = new Map(stations.map((station) => [station.key, station]))
  }

  static fromFile(file: RawStationFile): StationDirectory {
    type Draft = { key: string; names: Record<Lang, string>; plain: string; rows: Map<LineId, Ridership[]> }
    const drafts = new Map<string, Draft>()

    for (const row of file.stations) {
      const figures = new Ridership(row.on, row.off, row.weekdays?.map((value) => value ?? 0) ?? null, row.monthly)
      // A few rows are stray taps on a line that does not stop there.
      if (figures.total() < 10) continue
      const base = baseName(row.station)
      const line = Line.forRailway(row.line, base) ?? Line.get('other')
      const plain = SAME_STATION[base] ?? base
      const key = SHARED_NAMES.has(plain) && line.id === 'gj' ? `${plain}@gj` : plain

      let draft = drafts.get(key)
      if (!draft) {
        const names = DISPLAY[key] ?? { ko: plain, en: (row.label ?? plain).replaceAll('`', '’') }
        draft = { key, names, plain, rows: new Map() }
        drafts.set(key, draft)
      }
      draft.rows.set(line.id, [...(draft.rows.get(line.id) ?? []), figures])
    }

    const stations = [...drafts.values()].map((draft) => {
      const byLine = new Map([...draft.rows].map(([id, rows]) => [id, Ridership.combine(rows)]))
      const lines = Line.all.filter((line) => byLine.has(line.id))
      const location = StationDirectory.locate(draft.plain, lines, file.coordinates ?? {})
      return new Station({ key: draft.key, names: draft.names, byLine, location })
    })
    return new StationDirectory(stations, file)
  }

  /** Where a station is: the middle of its platforms on the lines this site knows it by. */
  private static locate(name: string, lines: readonly Line[], coordinates: NonNullable<RawStationFile['coordinates']>): LatLng | null {
    const listed = [name, OLD_NAMES[name], name.replace(/역$/, ''), `${name}역`].find((candidate) => candidate && coordinates[candidate])
    if (!listed) return null
    const entries = coordinates[listed].map(([railway, lat, lng]) => ({ line: Line.forRailway(railway, name), lat, lng }))
    const onOurLines = entries.filter((entry) => entry.line && lines.includes(entry.line))
    const chosen = onOurLines.length ? onOurLines : entries
    const centre = centreOf(chosen)
    // If the entries are far apart they are different stations with one name, and the middle is nowhere.
    return chosen.every((entry) => kilometresBetween(entry, centre) < 1) ? centre : chosen[0]
  }

  get(key: string): Station | undefined {
    return this.byKey.get(key)
  }

  /** The lines that have at least one station, in map order. */
  get lines(): Line[] {
    return Line.all.filter((line) => this.stations.some((station) => station.serves(line)))
  }

  on(line: Line | null): Station[] {
    return line ? this.stations.filter((station) => station.serves(line)) : [...this.stations]
  }

  /** For each line: its busiest station and its boardings through the day. Busiest line first. */
  lineSummaries(hour: number | null): LineSummary[] {
    return this.lines
      .map((line) => {
        const stations = this.on(line)
        const on = Array.from({ length: 24 }, (_, h) => stations.reduce((total, st) => total + st.ridershipOn(line).on[h], 0))
        const top = stations.reduce((best, st) => (st.ridershipOn(line).total(hour) > best.ridershipOn(line).total(hour) ? st : best))
        return { line, stations: stations.length, on, top, topCount: top.ridershipOn(line).total(hour) }
      })
      .sort((a, b) => b.topCount - a.topCount)
  }
}
