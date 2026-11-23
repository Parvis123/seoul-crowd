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

/** What the city adds about the moment of a reading. Older files, and some places, lack these. */
type RawNow = {
  /** The share of people there who are not regulars, as a percentage. */
  visitors?: number | null
  /** The share in each age band, as percentages: under 10, 10s, 20s ... 70 and over. */
  ages?: number[] | null
  /** The city's forecast for the coming hours. */
  forecast?: RawReading[]
}

type RawPlace = {
  name: string // the city's official Korean name
  label: string // English name
  code: string
  readings: number
  first_reading: string
  latest: (RawReading & RawNow) | null
  /** The usual number of people at this hour on earlier days of the same kind, and how many days that rests on. */
  usual?: { people: number; days: number } | null
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

// ---------- one hour of the forecast ----------

/** What the city expects at a place at one coming hour. */
export class Outlook {
  /** Seoul time, "YYYY-MM-DD HH:MM". */
  readonly time: string
  readonly level: CrowdLevel
  readonly range: { min: number; max: number }

  constructor(raw: RawReading) {
    this.time = raw.time
    this.level = CrowdLevel.from(raw.level)
    this.range = { min: raw.min, max: raw.max }
  }

  get people(): number {
    return (this.range.min + this.range.max) / 2
  }

  /** The hour of the day, 0 to 23. */
  get hour(): number {
    return Number(this.time.slice(11, 13))
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
  /** The city's forecast for the next hours, soonest first. Empty when it gave none. */
  readonly forecast: readonly Outlook[]
  /** The share of people there who are not regulars, 0 to 1, or null when unknown. */
  readonly visitorShare: number | null
  /** The share of people in each age band, 0 to 1: under 10, 10s, 20s ... 70 and over. */
  readonly ages: readonly number[] | null
  /** The usual number of people at this hour, and how many earlier days that average rests on. */
  readonly usual: { people: number; days: number } | null
  /** An average over fewer earlier days than this says too little to call anything unusual. */
  static readonly USUAL_NEEDS_DAYS = 3
  private readonly names: Record<Lang, string>
  private readonly terms: string[]
  private readonly koreanInitials: string

  constructor(raw: RawPlace & { latest: RawReading & RawNow }) {
    this.code = raw.code
    this.officialName = raw.name
    this.names = { ko: raw.name, en: tidy(raw.label) }
    this.category = (categories as Record<string, string>)[raw.name] ?? ''
    this.level = CrowdLevel.from(raw.latest.level)
    this.range = { min: raw.latest.min, max: raw.latest.max }
    this.time = raw.latest.time
    this.grid = raw.grid
    this.forecast = (raw.latest.forecast ?? []).map((hour) => new Outlook(hour))
    this.visitorShare = typeof raw.latest.visitors === 'number' ? raw.latest.visitors / 100 : null
    this.ages = raw.latest.ages?.length === 8 ? raw.latest.ages.map((share) => share / 100) : null
    this.usual = raw.usual ?? null
    this.terms = [raw.name, raw.label].map(fold)
    this.koreanInitials = initials(raw.name)
  }

  /** One id across places and stations, used by the map, pins and links. */
  get id(): string {
    return `place:${this.code}`
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

  /** How many of the people there are visitors and not regulars, or null when the city did not say. */
  get visitors(): number | null {
    return this.visitorShare === null ? null : this.people * this.visitorShare
  }

  /**
   * How far the place is from its usual for this hour: 0.25 is a quarter busier,
   * -0.5 is half as busy. Null until enough earlier days have been recorded.
   */
  get versusUsual(): number | null {
    if (!this.usual || this.usual.days < Place.USUAL_NEEDS_DAYS || this.usual.people <= 0) return null
    return (this.people - this.usual.people) / this.usual.people
  }

  /**
   * The place as the city expects it `step` hours on. Step 0 is the latest
   * reading. With no forecast for that hour, the place stays as it is now.
   */
  expected(step: number): { level: CrowdLevel; people: number; range: { min: number; max: number } } {
    const hour = step > 0 ? this.forecast[step - 1] : undefined
    return hour ? { level: hour.level, people: hour.people, range: hour.range } : { level: this.level, people: this.people, range: this.range }
  }

  /** The forecast hour with the highest crowd level, and of those the most people. Null with no forecast. */
  get peakAhead(): Outlook | null {
    if (!this.forecast.length) return null
    return this.forecast.reduce((best, hour) =>
      hour.level.rank > best.level.rank || (hour.level === best.level && hour.people > best.people) ? hour : best,
    )
  }

  /** The first coming hour the city expects to be crowded, if the place is not crowded already. */
  get crowdedAhead(): Outlook | null {
    if (this.level === CrowdLevel.crowded) return null
    return this.forecast.find((hour) => hour.level === CrowdLevel.crowded) ?? null
  }

  /** True on Saturday and Sunday, going by the latest reading. */
  get isWeekend(): boolean {
    const [y, mo, d] = this.time.slice(0, 10).split('-').map(Number)
    return [0, 6].includes(new Date(Date.UTC(y, mo - 1, d)).getUTCDay())
  }

  /**
   * The quietest and busiest hours between 08:00 and 22:00 on days like today
   * (weekdays, or the weekend). Null until every one of those hours has a reading.
   */
  get bestTime(): { quietest: number; busiest: number } | null {
    const rows = this.isWeekend ? this.grid.slice(5) : this.grid.slice(0, 5)
    const hours: { hour: number; people: number }[] = []
    for (let hour = 8; hour <= 22; hour++) {
      const values = rows.map((row) => row[hour]).filter((value): value is number => value !== null)
      if (!values.length) return null
      hours.push({ hour, people: values.reduce((total, value) => total + value, 0) / values.length })
    }
    const pick = (better: (a: number, b: number) => boolean) => hours.reduce((best, each) => (better(each.people, best.people) ? each : best)).hour
    return { quietest: pick((a, b) => a < b), busiest: pick((a, b) => a > b) }
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

  /** The places at one crowd level, most people first. Give a step to ask about that many hours ahead. */
  at(level: CrowdLevel, step = 0): Place[] {
    return this.places
      .filter((place) => place.expected(step).level === level)
      .sort((a, b) => b.expected(step).people - a.expected(step).people)
  }

  /** How many hours ahead the city's forecast runs. 0 when it gave none. */
  get forecastHours(): number {
    return Math.max(0, ...this.places.map((place) => place.forecast.length))
  }

  /** The clock time `step` hours into the forecast, "HH:00". Step 0 is the newest reading's own time. */
  clockAt(step: number): string | null {
    if (step === 0) return this.newestClock
    const hour = this.places.find((place) => place.forecast[step - 1])?.forecast[step - 1]
    return hour ? hour.time.slice(11) : null
  }

  /** When the newest reading was taken, as a moment in time. The file gives Seoul local time, which is nine hours ahead of UTC. */
  get readAt(): Date | null {
    return this.places.length ? new Date((Math.max(...this.places.map((place) => place.minutes)) - 9 * 60) * 60_000) : null
  }

  /** Places not crowded now that the city expects to be, soonest first. */
  get crowdedAhead(): { place: Place; when: Outlook }[] {
    return this.places
      .flatMap((place) => (place.crowdedAhead ? [{ place, when: place.crowdedAhead }] : []))
      .sort((a, b) => a.when.time.localeCompare(b.when.time) || b.place.people - a.place.people)
  }

  /** The most earlier days any place's usual rests on. It counts up as history builds. */
  get usualDays(): number {
    return Math.max(0, ...this.places.map((place) => place.usual?.days ?? 0))
  }

  /** How many places are at each crowd level, relaxed first. Give a step to ask about that many hours ahead. */
  levelCounts(step = 0): { level: CrowdLevel; count: number }[] {
    return CrowdLevel.all.map((level) => ({ level, count: this.places.filter((place) => place.expected(step).level === level).length }))
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
