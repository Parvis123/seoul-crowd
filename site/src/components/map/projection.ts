import seoul from '@/data/seoul-map.json'
import type { LatLng } from '@/model/geo'

// A flat projection that is true to scale at Seoul's latitude. One unit is
// about 37 metres, which makes the city roughly 1,000 units wide.
const ORIGIN = { lat: 37.71, lng: 126.76 }
const UNITS_PER_DEGREE = 3000
const SHRINK_EAST = Math.cos((37.55 * Math.PI) / 180)

export type Point = { x: number; y: number }

export function project({ lat, lng }: LatLng): Point {
  return { x: (lng - ORIGIN.lng) * SHRINK_EAST * UNITS_PER_DEGREE, y: (ORIGIN.lat - lat) * UNITS_PER_DEGREE }
}

const toPath = (points: number[][], close: boolean) =>
  points
    .map(([lng, lat], i) => {
      const { x, y } = project({ lat, lng })
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join('') + (close ? 'Z' : '')

/** Seoul's 25 districts as SVG paths. */
export const DISTRICTS = seoul.districts.map((district) => ({
  name: district.name,
  path: district.rings.map((ring) => toPath(ring, true)).join(''),
}))

/** The middle of the Han river, drawn as a thick line. */
export const RIVER = toPath(seoul.river, false)

/** The box that holds the whole city. */
export const CITY = (() => {
  const points = seoul.districts.flatMap((d) => d.rings.flat()).map(([lng, lat]) => project({ lat, lng }))
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
})()

export const MAP_SOURCE = seoul.source
