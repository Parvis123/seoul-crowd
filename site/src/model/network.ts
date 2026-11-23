import { type LatLng, kilometresBetween } from '@/model/geo'
import { type Journey, walkMinutes } from '@/model/journey'
import type { Place, PlaceDirectory } from '@/model/place'
import type { Station, StationDirectory } from '@/model/station'
import { baseName, fold, isInitials } from '@/model/text'

export type SearchResults = { places: Place[]; stations: Station[] }

/**
 * Places and stations together: which places are named after which stations,
 * where things are, and one search across both.
 * The station figures load separately, so `stations` can be null for a moment.
 */
export class Network {
  readonly places: PlaceDirectory
  readonly stations: StationDirectory | null
  private readonly stationsByPlace = new Map<string, Station[]>()
  private readonly placesByStation = new Map<string, Place[]>()

  constructor(places: PlaceDirectory, stations: StationDirectory | null) {
    this.places = places
    this.stations = stations
    if (!stations) return
    for (const place of places.places) {
      const found = Network.stationNamesIn(place.officialName)
        .map((name) => [name, name.replace(/역$/, ''), `${name}역`].map((key) => stations.get(key)).find(Boolean))
        .filter((station): station is Station => station !== undefined)
      this.stationsByPlace.set(place.code, [...new Set(found)])
      for (const station of found) {
        this.placesByStation.set(station.key, [...(this.placesByStation.get(station.key) ?? []), place])
      }
    }
  }

  /**
   * The station names inside a place name. "신논현역·논현역" gives two,
   * "홍대입구역(2호선)" gives one, and a park gives none.
   */
  private static stationNamesIn(placeName: string): string[] {
    return placeName.includes('역') ? placeName.split('·').map(baseName) : []
  }

  /** The stations a place is named after. */
  stationsFor(place: Place): Station[] {
    return this.stationsByPlace.get(place.code) ?? []
  }

  /** The crowd places named after a station. */
  placesFor(station: Station): Place[] {
    return this.placesByStation.get(station.key) ?? []
  }

  /** Where a place is. For now only places named after a station have a position. */
  locationOf(place: Place): LatLng | null {
    return this.stationsFor(place).find((station) => station.location)?.location ?? null
  }

  /**
   * What is closest to a point: the nearest few places and the nearest few
   * stations in one list, nearest first, each with its distance in kilometres.
   */
  near(point: LatLng, limit = 4): { item: Place | Station; km: number }[] {
    const nearest = <T extends Place | Station>(items: readonly T[], where: (item: T) => LatLng | null) =>
      items
        .flatMap((item) => {
          const location = where(item)
          return location ? [{ item: item as Place | Station, km: kilometresBetween(point, location) }] : []
        })
        .sort((a, b) => a.km - b.km)
        .slice(0, limit)
    return [
      ...nearest(this.places.places, (place) => this.locationOf(place)),
      ...nearest(this.stations?.stations ?? [], (station) => station.location),
    ].sort((a, b) => a.km - b.km)
  }

  /**
   * How to get to a place or station by subway, from a station or from a point
   * on the map. From a point, the walk to each of the nearest few stations is
   * tried and the quickest whole trip wins. Null when there is no way by subway.
   */
  journeyTo(target: Place | Station, origin: Station | LatLng): Journey | null {
    const directory = this.stations
    if (!directory) return null
    const ends = target.kind === 'station' ? [target] : this.stationsFor(target)
    const starts =
      'kind' in origin
        ? [{ station: origin, walk: 0 }]
        : this.near(origin, 3).flatMap((each) => (each.item.kind === 'station' ? [{ station: each.item, walk: walkMinutes(each.km) }] : []))
    let best: Journey | null = null
    for (const start of starts) {
      for (const end of ends) {
        const journey = directory.journey(start.station, end)?.withWalks(start.walk, 0)
        if (journey && (!best || journey.minutes < best.minutes)) best = journey
      }
    }
    return best
  }

  /**
   * Finds places and stations by name in either language, forgiving spaces,
   * hyphens and nicknames ("hongdae"), and Korean first consonants ("ㅎㄷ").
   * Best matches first, then the busiest.
   */
  search(text: string, limit = 6): SearchResults {
    const typed = text.trim()
    const query = fold(typed)
    const queryInitials = isInitials(typed.replace(/\s/g, '')) ? typed.replace(/\s/g, '') : null
    if (!query && !queryInitials) return { places: [], stations: [] }

    const best = <T extends { match(query: string, queryInitials: string | null): number | null }>(
      items: readonly T[],
      size: (item: T) => number,
    ) =>
      items
        .map((item) => ({ item, score: item.match(query, queryInitials) }))
        .filter((hit): hit is { item: T; score: number } => hit.score !== null)
        .sort((a, b) => a.score - b.score || size(b.item) - size(a.item))
        .slice(0, limit)
        .map((hit) => hit.item)

    return {
      places: best(this.places.places, (place) => place.people),
      stations: best(this.stations?.stations ?? [], (station) => station.ridership.total()),
    }
  }
}
