export type LatLng = { lat: number; lng: number }

/** Rough distance in kilometres. Good enough at the scale of one city. */
export function kilometresBetween(a: LatLng, b: LatLng): number {
  const north = (a.lat - b.lat) * 111
  const east = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(north, east)
}

export function centreOf(points: LatLng[]): LatLng {
  return {
    lat: points.reduce((total, p) => total + p.lat, 0) / points.length,
    lng: points.reduce((total, p) => total + p.lng, 0) / points.length,
  }
}
