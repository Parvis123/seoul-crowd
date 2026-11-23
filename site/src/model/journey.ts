import { type LatLng, kilometresBetween } from '@/model/geo'
import type { Line, LineId } from '@/model/line'
import type { Route, Stop } from '@/model/route'
import type { Station } from '@/model/station'

// Getting from one station to another by subway. There is no timetable in the
// data, so times are estimates: each hop takes as long as its length suggests
// at the line's usual speed, plus a fixed allowance for waiting and changing.

/** Typical speed between stops, stops included, in km/h. */
const SPEED: Partial<Record<LineId, number>> = { '1': 40, gj: 42, sb: 40, gc: 50, gg: 55, sh: 42, arex: 60, ui: 28, sl: 28 }
const USUAL_SPEED = 35
/** Seconds lost at each stop beyond what the speed already allows for, as minutes. */
const STOP_MINUTES = 0.25
/** Standing on the platform for the first train. */
export const WAIT_MINUTES = 3
/** Walking between platforms and waiting for the next train. */
export const TRANSFER_MINUTES = 5
/** Walking pace on streets, which are longer than the straight line. */
const WALK_KMH = 4.8
const STREET_PER_STRAIGHT = 1.3

export const walkMinutes = (km: number) => (km * STREET_PER_STRAIGHT * 60) / WALK_KMH

/** One train ride with no change. */
export type Ride = {
  kind: 'ride'
  line: Line
  from: Station | null
  to: Station | null
  /** Station names as the station list writes them, for stops that are not stations the site knows. */
  fromName: string
  toName: string
  stops: number
  minutes: number
  /** True when riding in rising stop-number order: "down" on Lines 1 to 8, the inner loop on Line 2. */
  forward: boolean
  /** The last stop in the direction of travel, or null on the circle, where there is none. */
  toward: string | null
  points: LatLng[]
}
export type Change = { kind: 'change'; at: Station | null; name: string; minutes: number }
export type Leg = Ride | Change

/** A way to get somewhere: the rides and changes in order, and how long it all takes. */
export class Journey {
  readonly legs: readonly Leg[]
  /** Minutes on foot before the first station and after the last. */
  readonly walkBefore: number
  readonly walkAfter: number

  constructor(legs: readonly Leg[], walkBefore = 0, walkAfter = 0) {
    this.legs = legs
    this.walkBefore = walkBefore
    this.walkAfter = walkAfter
  }

  get rides(): Ride[] {
    return this.legs.filter((leg): leg is Ride => leg.kind === 'ride')
  }

  get changes(): number {
    return this.legs.filter((leg) => leg.kind === 'change').length
  }

  /** Door to door, with the wait for the first train. */
  get minutes(): number {
    return Math.round(this.walkBefore + WAIT_MINUTES + this.legs.reduce((total, leg) => total + leg.minutes, 0) + this.walkAfter)
  }

  /** The same journey with walks added at either end. */
  withWalks(before: number, after: number): Journey {
    return new Journey(this.legs, before, after)
  }
}

type Node = { id: string; line: Line; stop: Stop; station: Station | null; path: Stop[]; index: number; circle: boolean }
type Edge = { to: Node; minutes: number; ride: boolean; forward: boolean }

/** Finds the quickest way between two stations over the lines' stops. */
export class Router {
  private readonly nodes = new Map<string, Node>()
  private readonly edges = new Map<string, Edge[]>()
  private readonly byStation = new Map<string, Node[]>()

  /** `stationOf` says which station a stop on a line is, or null for a stop the site has no figures for. */
  constructor(routes: readonly Route[], stationOf: (line: Line, name: string) => Station | null) {
    const link = (a: Node, b: Node, minutes: number, ride: boolean, forward: boolean) =>
      this.edges.set(a.id, [...(this.edges.get(a.id) ?? []), { to: b, minutes, ride, forward }])

    for (const route of routes) {
      const speed = SPEED[route.line.id] ?? USUAL_SPEED
      route.paths.forEach((path, pathIndex) => {
        const circle = route.circle && pathIndex === 0
        let before: Node | null = null
        path.forEach((stop, index) => {
          // A stop that two paths share (a junction) is one node, so a train can run on from one to the other.
          const id = `${route.line.id}|${stop.name}`
          let node = this.nodes.get(id)
          if (!node) {
            node = { id, line: route.line, stop, station: stationOf(route.line, stop.name), path, index, circle }
            this.nodes.set(id, node)
            if (node.station) this.byStation.set(node.station.key, [...(this.byStation.get(node.station.key) ?? []), node])
          }
          if (before && before !== node) {
            const minutes = Math.max(1, (kilometresBetween(before.stop.at, stop.at) * 60) / speed + STOP_MINUTES)
            link(before, node, minutes, true, true)
            // Trains run both ways, except round a one-way loop.
            if (!(before.stop.oneWay && stop.oneWay)) link(node, before, minutes, true, false)
          }
          before = node
        })
      })
    }
    // Changing lines inside a station.
    for (const platforms of this.byStation.values()) {
      for (const a of platforms) for (const b of platforms) if (a.line !== b.line) link(a, b, TRANSFER_MINUTES, false, true)
    }
  }

  /** True when the station is on a line this can route over. */
  reaches(station: Station): boolean {
    return this.byStation.has(station.key)
  }

  /** The quickest journey between two stations, or null when the lines do not connect them. */
  between(from: Station, to: Station): Journey | null {
    const starts = this.byStation.get(from.key) ?? []
    if (!starts.length || !this.byStation.has(to.key)) return null
    if (from === to) return new Journey([])

    // Dijkstra's algorithm. The network is a few hundred stops, so a plain scan for the nearest is quick enough.
    const best = new Map<string, number>(starts.map((node) => [node.id, 0]))
    const cameBy = new Map<string, { from: Node; edge: Edge }>()
    const open = new Set(starts)
    const done = new Set<string>()
    let arrived: Node | null = null
    while (open.size) {
      let node: Node | null = null
      for (const each of open) if (!node || (best.get(each.id) as number) < (best.get(node.id) as number)) node = each
      if (!node) break
      open.delete(node)
      done.add(node.id)
      if (node.station === to) {
        arrived = node
        break
      }
      for (const edge of this.edges.get(node.id) ?? []) {
        if (done.has(edge.to.id)) continue
        const cost = (best.get(node.id) as number) + edge.minutes
        if (cost < (best.get(edge.to.id) ?? Infinity)) {
          best.set(edge.to.id, cost)
          cameBy.set(edge.to.id, { from: node, edge })
          open.add(edge.to)
        }
      }
    }
    if (!arrived) return null

    // Walk back from the end, then fold the hops into rides and changes.
    const hops: { from: Node; edge: Edge }[] = []
    for (let at: Node = arrived; cameBy.has(at.id); at = (cameBy.get(at.id) as { from: Node }).from) hops.unshift(cameBy.get(at.id) as { from: Node; edge: Edge })
    const legs: Leg[] = []
    for (const { from: start, edge } of hops) {
      const last = legs[legs.length - 1]
      if (!edge.ride) {
        legs.push({ kind: 'change', at: start.station, name: start.stop.name, minutes: edge.minutes })
      } else if (last?.kind === 'ride' && last.line === edge.to.line) {
        last.to = edge.to.station
        last.toName = edge.to.stop.name
        last.stops += 1
        last.minutes += edge.minutes
        last.points.push(edge.to.stop.at)
      } else {
        const end = edge.forward ? edge.to.path[edge.to.path.length - 1] : edge.to.path[0]
        legs.push({
          kind: 'ride',
          line: edge.to.line,
          from: start.station,
          to: edge.to.station,
          fromName: start.stop.name,
          toName: edge.to.stop.name,
          stops: 1,
          minutes: edge.minutes,
          forward: edge.forward,
          toward: edge.to.circle ? null : end.name,
          points: [start.stop.at, edge.to.stop.at],
        })
      }
    }
    return new Journey(legs)
  }
}
