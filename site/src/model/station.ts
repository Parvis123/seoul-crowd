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

// English names the station list gives with a character or a space missing.
const ENGLISH: Record<string, string> = {
  동대문역사문화공원: 'Dongdaemun History & Culture Park',
  경기광주: 'Gyeonggi Gwangju',
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
  /** Everyone entering and leaving the station, through any line's gates. */
  readonly ridership: Ridership
  readonly location: LatLng | null
  private readonly names: Record<Lang, string>
  /**
   * The city files each tap under the line that owns the gate, not the train the
   * person rides. A line with no gates of its own here is missing from this map.
   */
  private readonly gates: ReadonlyMap<LineId, Ridership>
  private readonly terms: string[]
  private readonly koreanInitials: string

  constructor(init: {
    key: string
    names: Record<Lang, string>
    gates: ReadonlyMap<LineId, Ridership>
    /** Lines the station list puts here that have no gates of their own. */
    otherLines?: readonly Line[]
    location: LatLng | null
  }) {
    this.key = init.key
    this.names = init.names
    this.gates = init.gates
    this.location = init.location
    this.lines = Line.all.filter((line) => init.gates.has(line.id) || init.otherLines?.includes(line))
    this.ridership = Ridership.combine([...init.gates.values()])
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
    return this.lines.includes(line)
  }

  /**
   * The taps at one line's own gates, or null when the line has none here.
   * This says which entrance people used, not which train: at Hapjeong most
   * Line 6 riders walk in through the Line 2 gates.
   */
  gatesOn(line: Line): Ridership | null {
    return this.gates.get(line.id) ?? null
  }

  /** The line whose gates most people use. Its colour stands for the station on the map. */
  get mainLine(): Line {
    const taps = (line: Line) => this.gatesOn(line)?.total() ?? 0
    return this.lines.reduce((best, line) => (taps(line) > taps(best) ? line : best))
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

type Platform = LatLng & { line: Line | null }

export type LineSummary = {
  line: Line
  stations: number
  /** Boardings at the line's own gates for each clock hour. */
  on: number[]
  /** The busiest station the line stops at for the hour asked about, counting the whole station. */
  top: Station
  topCount: number
  /** The two stations after it. */
  next: Station[]
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
        const names = DISPLAY[key] ?? { ko: plain, en: ENGLISH[plain] ?? (row.label ?? plain).replaceAll('`', '’') }
        draft = { key, names, plain, rows: new Map() }
        drafts.set(key, draft)
      }
      draft.rows.set(line.id, [...(draft.rows.get(line.id) ?? []), figures])
    }

    const stations = [...drafts.values()].map((draft) => {
      const gates = new Map([...draft.rows].map(([id, rows]) => [id, Ridership.combine(rows)]))
      const gateLines = Line.all.filter((line) => gates.has(line.id))
      const platforms = StationDirectory.platforms(draft.key, draft.plain, file.coordinates ?? {})
      const location = StationDirectory.locate(platforms, gateLines)
      // The station list knows every line that stops here, including ones whose riders tap at another line's gates.
      const otherLines = location
        ? platforms.flatMap((entry) => (entry.line && kilometresBetween(entry, location) < 1 ? [entry.line] : []))
        : []
      return new Station({ key: draft.key, names: draft.names, gates, otherLines, location })
    })
    return new StationDirectory(stations, file)
  }

  /** The station list's entries for one station: a position for each line that stops there. */
  private static platforms(key: string, name: string, coordinates: NonNullable<RawStationFile['coordinates']>): Platform[] {
    const alsoListedAs = Object.keys(SAME_STATION).filter((other) => SAME_STATION[other] === name)
    const listed = [name, OLD_NAMES[name], name.replace(/역$/, ''), `${name}역`].find((candidate) => candidate && coordinates[candidate])
    const entries = [listed, ...alsoListedAs]
      .flatMap((each) => (each && coordinates[each]) || [])
      .map(([railway, lat, lng]) => ({ line: Line.forRailway(railway, name), lat, lng }))
    // Two different stations share this name, so each keeps only its own lines.
    if (!SHARED_NAMES.has(name)) return entries
    return entries.filter((entry) => (entry.line?.id === 'gj') === key.endsWith('@gj'))
  }

  /** Where a station is: the middle of its platforms on the lines its gates belong to. */
  private static locate(platforms: Platform[], gateLines: readonly Line[]): LatLng | null {
    if (!platforms.length) return null
    const atOurGates = platforms.filter((entry) => entry.line && gateLines.includes(entry.line))
    const chosen = atOurGates.length ? atOurGates : platforms
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

  /**
   * For each line: the busiest station it stops at, and the boardings at its own
   * gates through the day. The line with the busiest station comes first.
   */
  lineSummaries(hour: number | null): LineSummary[] {
    return this.lines
      .map((line) => {
        const stations = this.on(line)
        const on = Array.from({ length: 24 }, (_, h) => stations.reduce((total, st) => total + (st.gatesOn(line)?.on[h] ?? 0), 0))
        const [top, ...next] = [...stations].sort((a, b) => b.ridership.total(hour) - a.ridership.total(hour))
        return { line, stations: stations.length, on, top, topCount: top.ridership.total(hour), next: next.slice(0, 2) }
      })
      .sort((a, b) => b.topCount - a.topCount)
  }
}
