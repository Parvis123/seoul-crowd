import type { Place } from '@/model/place'

/**
 * A way to rank places. "Busy" means different things: the most people, the
 * most visitors, or the furthest above a place's own usual. Each measure says
 * which one it is, so a list never mixes two.
 */
export class Measure {
  readonly id: 'people' | 'visitors' | 'usual'
  private readonly read: (place: Place) => number | null

  private constructor(id: Measure['id'], read: (place: Place) => number | null) {
    this.id = id
    this.read = read
  }

  /** Everyone in the area, residents at home included. */
  static readonly people = new Measure('people', (place) => place.people)
  /** People who are not regulars there. */
  static readonly visitors = new Measure('visitors', (place) => place.visitors)
  /** How far above or below the place's own usual for this hour, as a fraction. */
  static readonly usual = new Measure('usual', (place) => place.versusUsual)

  static readonly all: readonly Measure[] = [Measure.people, Measure.visitors, Measure.usual]

  static get(id: string | null): Measure | null {
    return Measure.all.find((measure) => measure.id === id) ?? null
  }

  /** The place's value on this measure, or null when the data to work it out is missing. */
  of(place: Place): number | null {
    return this.read(place)
  }

  /** The places that have this measure, highest first. */
  rank(places: readonly Place[]): Place[] {
    return places
      .filter((place) => this.read(place) !== null)
      .sort((a, b) => (this.read(b) as number) - (this.read(a) as number))
  }

  /** True when at least half the places have this measure, which is enough for a ranking to mean something. */
  covers(places: readonly Place[]): boolean {
    return places.length > 0 && places.filter((place) => this.read(place) !== null).length * 2 >= places.length
  }
}
