import categories from '@/data/categories.json'
import type { Lang } from '@/lib/i18n'
import { fold, initials } from '@/model/text'

// ---------- the file the collector saves ----------

type RawReading = {
  time: string // Seoul local time, "YYYY-MM-DD HH:MM"
  level: string
  min: number
  max: number
}

type RawPlace = {
  name: string // the city's official Korean name
  label: string // English name
  code: string
  readings: number
  first_reading: string
  latest: RawReading | null
  grid: (number | null)[][] // [weekday, Monday first][hour] = average people
}

export type RawPlaceFile = { generated_at: string; places: RawPlace[] }

// ---------- the city's crowd level ----------

/** One of the city's four crowd levels. `korean` is the city's own word for it. */
export class CrowdLevel {
  /** 0 relaxed to 3 crowded. */
  readonly rank: 0 | 1 | 2 | 3
  readonly korean: string

  private constructor(rank: 0 | 1 | 2 | 3, korean: string) {
    this.rank = rank
    this.korean = korean
  }

  /** Quietest to busiest. */
  static readonly all: readonly CrowdLevel[] = [
    new CrowdLevel(0, '여유'),
    new CrowdLevel(1, '보통'),
    new CrowdLevel(2, '약간 붐빔'),
    new CrowdLevel(3, '붐빔'),
  ]

  static readonly slightlyCrowded = CrowdLevel.all[2]
  static readonly crowded = CrowdLevel.all[3]

  static from(korean: string): CrowdLevel {
    return CrowdLevel.all.find((level) => level.korean === korean) ?? CrowdLevel.all[0]
  }

}

// ---------- a place ----------

/** The city's English names, with their spacing and capitals put right. */
const tidy = (label: string) =>
  label
    .replace(/(\S)\(/g, '$1 (')
    .replace('SeokchonhosuLake', 'Seokchon Lake')
    .replace('HongDae', 'Hongdae')

/** One of the city's 121 places, with its latest reading and the history collected so far. */
export class Place {
  readonly kind = 'place'
  readonly code: string
  /** The city's Korean name for the kind of place, such as 공원. */
  readonly category: string
  readonly level: CrowdLevel
  /** The city's estimate of how many people are there. */
  readonly range: { min: number; max: number }
  /** When the latest reading was taken, Seoul time, "YYYY-MM-DD HH:MM". */
  readonly time: string
  /** Average people for each [weekday, Monday first][hour], or null where nothing is recorded yet. */
  readonly grid: readonly (readonly (number | null)[])[]
  /** The Korean name as the city writes it, which is what links a place to its stations. */
  readonly officialName: string
  private readonly names: Record<Lang, string>
  private readonly terms: string[]
  private readonly koreanInitials: string

  constructor(raw: RawPlace & { latest: RawReading }) {
    this.code = raw.code
    this.officialName = raw.name
    this.names = { ko: raw.name, en: tidy(raw.label) }
    this.category = (categories as Record<string, string>)[raw.name] ?? ''
    this.level = CrowdLevel.from(raw.latest.level)
    this.range = { min: raw.latest.min, max: raw.latest.max }
    this.time = raw.latest.time
    this.grid = raw.grid
    this.terms = [raw.name, raw.label].map(fold)
    this.koreanInitials = initials(raw.name)
  }

  name(lang: Lang): string {
    return this.names[lang]
  }

  /** The name in the other language, for the small line in the panel. */
  otherName(lang: Lang): { text: string; lang: Lang } {
    const other: Lang = lang === 'ko' ? 'en' : 'ko'
    return { text: this.names[other], lang: other }
  }

  /** The middle of the city's estimated range. */
  get people(): number {
    return (this.range.min + this.range.max) / 2
  }

  /** The time of the latest reading, "HH:MM". */
  get clock(): string {
    return this.time.slice(11)
  }

  /** The latest reading as minutes, for comparing readings. */
  get minutes(): number {
    const [y, mo, d, h, mi] = this.time.split(/[- :]/).map(Number)
    return Date.UTC(y, mo - 1, d, h, mi) / 60000
  }

  /** How many of the week's 168 hours have a reading so far. */
  get hoursRecorded(): number {
    return this.grid.flat().filter((value) => value !== null).length
  }

  /** The most people recorded in any hour of the week. */
  get weekPeak(): number {
    return Math.max(0, ...this.grid.flat().filter((value): value is number => value !== null))
  }

  /** Average people for each hour of the day, across the weekdays that have a reading. */
  get typicalDay(): { hour: number; people: number | null }[] {
    return Array.from({ length: 24 }, (_, hour) => {
      const values = this.grid.map((row) => row[hour]).filter((value): value is number => value !== null)
      return { hour, people: values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : null }
    })
  }

  /** How well a folded search query fits. See `Station.match`. */
  match(query: string, queryInitials: string | null): number | null {
    if (queryInitials) return this.koreanInitials.includes(queryInitials) ? 3 : null
    if (this.terms.includes(query)) return 0
    if (this.terms.some((term) => term.startsWith(query))) return 1
    return this.terms.some((term) => term.includes(query)) ? 2 : null
  }

  /**
   * Most crowded for its size first: the city's own crowd level, with the
   * estimated number of people as the tie-breaker. A small market can come
   * before a big district that holds ten times the people.
   */
  static byCrowding(a: Place, b: Place): number {
    return b.level.rank - a.level.rank || b.people - a.people
  }

  /** Most people first, whatever the size of the place. */
  static byPeople(a: Place, b: Place): number {
    return b.people - a.people
  }
}

// ---------- every place ----------

/** The places that have a recent reading, built from the collector's file. */
export class PlaceDirectory {
  readonly places: readonly Place[]
  private readonly byCode: Map<string, Place>

  private constructor(places: readonly Place[]) {
    this.places = places
    this.byCode = new Map(places.map((place) => [place.code, place]))
  }

  static fromFile(file: RawPlaceFile): PlaceDirectory {
    const all = file.places
      .filter((raw): raw is RawPlace & { latest: RawReading } => raw.latest !== null)
      .map((raw) => new Place(raw))
    // A place the collector could not reach keeps an old reading. Leave those out.
    const newest = Math.max(...all.map((place) => place.minutes))
    return new PlaceDirectory(all.filter((place) => newest - place.minutes <= 90))
  }

  get(code: string): Place | undefined {
    return this.byCode.get(code)
  }

  get isEmpty(): boolean {
    return this.places.length === 0
  }

  /** Most people first. */
  get byPeople(): Place[] {
    return [...this.places].sort(Place.byPeople)
  }

  /** The places the city rates above relaxed, most crowded for their size first. */
  get aboveRelaxed(): Place[] {
    return this.places.filter((place) => place.level.rank > 0).sort(Place.byCrowding)
  }

  /** The places at one crowd level, most people first. */
  at(level: CrowdLevel): Place[] {
    return this.places.filter((place) => place.level === level).sort(Place.byPeople)
  }

  /** How many places are at each crowd level, relaxed first. */
  get levelCounts(): { level: CrowdLevel; count: number }[] {
    return CrowdLevel.all.map((level) => ({ level, count: this.places.filter((place) => place.level === level).length }))
  }

  /** The time of the newest reading, "HH:MM". */
  get newestClock(): string | null {
    return this.places.length ? this.places.reduce((a, b) => (b.time > a.time ? b : a)).clock : null
  }

  get mostPeople(): Place | undefined {
    return this.places.length ? this.places.reduce((a, b) => (b.people > a.people ? b : a)) : undefined
  }


  /** A place's people as a percentage of the place with the most people right now. */
  share(place: Place): number {
    const most = this.mostPeople?.people ?? 0
    return most > 0 ? Math.max(1, Math.round((place.people / most) * 100)) : 0
  }
}
