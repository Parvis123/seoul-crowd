import type { Feature as GeoFeature, FeatureCollection, MultiLineString, Point } from 'geojson'
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibre } from 'maplibre-gl'

import type { Theme } from '@/components/map/basemap'
import type { Lang } from '@/lib/i18n'
import type { LatLng } from '@/model/geo'
import type { Network } from '@/model/network'
import type { Place } from '@/model/place'
import type { Route } from '@/model/route'
import type { Station } from '@/model/station'

// This site's own layers, drawn over the background map: stations as dots in
// their line colour, places as glowing rings in their crowd-level colour.

export type Item = Place | Station
export const idOf = (item: Item) => item.id

// The names get sources of their own. They are drawn with fonts fetched from the map service,
// and if those fail to arrive the library gives up on the whole source, which must not take the marks with it.
export const SOURCE = {
  routes: 'crowd-routes',
  here: 'crowd-here',
  stations: 'crowd-stations',
  places: 'crowd-places',
  selected: 'crowd-selected',
  stationNames: 'crowd-station-names',
  placeNames: 'crowd-place-names',
} as const
export const LAYER = {
  routes: 'crowd-routes',
  hereHalo: 'crowd-here-halo',
  here: 'crowd-here',
  glow: 'crowd-place-glow',
  stations: 'crowd-station-dots',
  rings: 'crowd-place-rings',
  selected: 'crowd-selected-ring',
  stationNames: 'crowd-station-names',
  topPlaceNames: 'crowd-place-names-top',
  placeNames: 'crowd-place-names',
} as const
export const PLACE_LAYERS = [LAYER.glow, LAYER.rings, LAYER.topPlaceNames, LAYER.placeNames]
export const STATION_LAYERS = [LAYER.routes, LAYER.stations, LAYER.stationNames]

// The crowd-level colours as the map library needs them. It cannot read the oklch()
// values in index.css, so these are the same four colours (--level-0 to --level-3) as hex.
const LEVEL_HEX: Record<Theme, string[]> = {
  light: ['#00a166', '#bc9c00', '#e56f00', '#e20c35'],
  dark: ['#2fcf8d', '#efcc36', '#ff9235', '#ff4b57'],
}

// Marks keep their size across the city view, then grow as you zoom into a neighbourhood.
const ZOOM_STOPS: [number, number][] = [
  [9, 0.5],
  [11, 1],
  [14, 1.9],
  [16.5, 3],
]

/** How much bigger than its base size a mark is drawn at a zoom level. Mirrors `radius` below. */
export function sizeAt(zoom: number): number {
  const stops = ZOOM_STOPS
  if (zoom <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [z0, f0] = stops[i - 1]
    const [z1, f1] = stops[i]
    if (zoom <= z1) return f0 + ((zoom - z0) / (z1 - z0)) * (f1 - f0)
  }
  return stops.at(-1)![1]
}

/** A circle radius from each feature's base `r`, scaled with zoom. */
const radius = (times = 1, plus = 0): ExpressionSpecification => [
  'interpolate',
  ['linear'],
  ['zoom'],
  ...ZOOM_STOPS.flatMap(([zoom, factor]) => [zoom, ['+', ['*', ['get', 'r'], factor * times], plus]]),
] as unknown as ExpressionSpecification

type Feature = GeoFeature<Point, Record<string, string | number | boolean>>
export type Points = FeatureCollection<Point>
const collection = (features: Feature[]): Points => ({ type: 'FeatureCollection', features })

/** One point for each station that has a position. Bigger stations come first so small ones are drawn on top. */
export function stationFeatures(stations: readonly Station[], lang: Lang) {
  const most = Math.max(1, ...stations.map((station) => station.ridership.total()))
  const features = stations
    .flatMap((station): Feature[] => {
      if (!station.location) return []
      return [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [station.location.lng, station.location.lat] },
          properties: {
            id: idOf(station),
            name: station.name(lang),
            color: station.mainLine.color,
            transfer: station.lines.length > 1,
            r: 1.8 + 5.2 * Math.sqrt(station.ridership.total() / most),
          },
        },
      ]
    })
    .sort((a, b) => (b.properties.r as number) - (a.properties.r as number))
  return collection(features)
}

/** One point for each place that has a position, coloured by its crowd level. */
/** The place rings. Give a step to draw them as the city expects them that many hours ahead. */
export function placeFeatures(network: Network, lang: Lang, theme: Theme, step = 0) {
  // Sizes are always measured against the biggest crowd right now, so a ring grows and shrinks as the forecast plays.
  const most = network.places.mostPeople?.people ?? 1
  // Most people first, so big rings are drawn under small ones.
  const features = network.places.byPeople.flatMap((place): Feature[] => {
    const location = network.locationOf(place)
    if (!location) return []
    return [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
        properties: {
          id: idOf(place),
          name: place.name(lang),
          color: LEVEL_HEX[theme][place.expected(step).level.rank],
          order: 0,
          r: 5 + 12 * Math.sqrt(Math.min(1.6, place.expected(step).people / most)),
        },
      },
    ]
  })
  // Counted among the places that are on the map: 0 is the biggest ring drawn.
  features.forEach((feature, order) => (feature.properties.order = order))
  return collection(features)
}

export const emptyCollection = collection([])

/** Each line as one feature: every path it runs, in its own colour. */
export function routeFeatures(routes: readonly Route[]): FeatureCollection<MultiLineString> {
  return {
    type: 'FeatureCollection',
    features: routes.map((route) => ({
      type: 'Feature',
      geometry: { type: 'MultiLineString', coordinates: route.paths.map((path) => path.map((point) => [point.lng, point.lat])) },
      properties: { color: route.line.color },
    })),
  }
}

/** The reader's own position, as a single point. */
export function hereFeature(here: LatLng | null): Points {
  if (!here) return emptyCollection
  return collection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [here.lng, here.lat] }, properties: { id: 'here', name: '', color: '', order: 0, r: 0 } }])
}

/** Adds this site's sources and layers to a freshly loaded style. Safe to call again after the style changes. */
export function addOverlay(map: MapLibre, theme: Theme) {
  const dark = theme === 'dark'
  const ink = dark ? '#eef2fb' : '#101828'
  const halo = dark ? '#0b1020' : '#ffffff'
  for (const id of Object.values(SOURCE)) {
    if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: emptyCollection })
  }
  const text = { 'text-color': ink, 'text-halo-color': halo, 'text-halo-width': 1.6 }
  const label = {
    'text-field': ['get', 'name'] as ExpressionSpecification,
    'text-font': ['Noto Sans Regular'],
    'text-anchor': 'left' as const,
    'text-justify': 'left' as const,
    'text-max-width': 12,
    'text-padding': 4,
  }

  // The lines sit under everything else, thin and a little see-through, so the dots stay the subject.
  map.addLayer({
    id: LAYER.routes,
    type: 'line',
    source: SOURCE.routes,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 12, 2, 15, 3.5],
      'line-opacity': dark ? 0.75 : 0.7,
    },
  })
  map.addLayer({
    id: LAYER.glow,
    type: 'circle',
    source: SOURCE.places,
    paint: { 'circle-radius': radius(2.8), 'circle-color': ['get', 'color'], 'circle-blur': 1, 'circle-opacity': dark ? 0.6 : 0.45 },
  })
  map.addLayer({
    id: LAYER.stations,
    type: 'circle',
    source: SOURCE.stations,
    paint: {
      'circle-radius': radius(),
      'circle-color': ['case', ['get', 'transfer'], dark ? '#f4f6fb' : '#ffffff', ['get', 'color']],
      'circle-stroke-color': ['case', ['get', 'transfer'], ['get', 'color'], dark ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)'],
      'circle-stroke-width': ['case', ['get', 'transfer'], 2, 0.75],
    },
  })
  map.addLayer({
    id: LAYER.rings,
    type: 'circle',
    source: SOURCE.places,
    paint: {
      'circle-radius': radius(),
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.14,
      'circle-stroke-color': ['get', 'color'],
      'circle-stroke-width': 1.75,
    },
  })
  map.addLayer({
    id: LAYER.selected,
    type: 'circle',
    source: SOURCE.selected,
    paint: { 'circle-radius': radius(1, 5), 'circle-opacity': 0, 'circle-stroke-color': ink, 'circle-stroke-width': 2 },
  })
  // Where the reader is, when they have asked: a blue dot over the marks.
  map.addLayer({
    id: LAYER.hereHalo,
    type: 'circle',
    source: SOURCE.here,
    paint: { 'circle-radius': 16, 'circle-color': '#3b82f6', 'circle-opacity': 0.22 },
  })
  map.addLayer({
    id: LAYER.here,
    type: 'circle',
    source: SOURCE.here,
    paint: { 'circle-radius': 6, 'circle-color': '#3b82f6', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 },
  })

  // Names are drawn with the background map's fonts. Without them (the plain fallback) the marks stand alone.
  if (!map.getStyle().glyphs) return
  map.addLayer({
    id: LAYER.stationNames,
    type: 'symbol',
    source: SOURCE.stationNames,
    minzoom: 12.3,
    layout: { ...label, 'text-size': 11.5, 'text-offset': [0.9, 0], 'symbol-sort-key': ['-', 0, ['get', 'r']] },
    paint: text,
  })
  // The five biggest rings are always named. The rest appear once there is room for them.
  map.addLayer({
    id: LAYER.placeNames,
    type: 'symbol',
    source: SOURCE.placeNames,
    minzoom: 12,
    filter: ['>=', ['get', 'order'], 5],
    layout: { ...label, 'text-size': 12, 'text-offset': [1.3, 0], 'symbol-sort-key': ['get', 'order'] },
    paint: text,
  })
  map.addLayer({
    id: LAYER.topPlaceNames,
    type: 'symbol',
    source: SOURCE.placeNames,
    filter: ['<', ['get', 'order'], 5],
    layout: { ...label, 'text-size': 12.5, 'text-offset': [1.4, 0], 'symbol-sort-key': ['get', 'order'] },
    paint: text,
  })
}

export function setData(map: MapLibre, source: string, data: Points | FeatureCollection<MultiLineString>) {
  ;(map.getSource(source) as GeoJSONSource | undefined)?.setData(data)
}
