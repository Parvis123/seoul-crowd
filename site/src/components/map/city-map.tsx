import 'maplibre-gl/dist/maplibre-gl.css'

import { useQuery } from '@tanstack/react-query'
import type { Point } from 'geojson'
import { LocateFixed, Minus, Plus, Scan, TriangleAlert } from 'lucide-react'
import { Map as MapLibre, type MapMouseEvent, type StyleSpecification, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useTheme } from 'next-themes'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'

import { LevelBadge } from '@/components/level-badge'
import { LineBadge } from '@/components/line-badge'
import { BASEMAP_URL, type Theme, styleFor } from '@/components/map/basemap'
import {
  type Item,
  LAYER,
  PLACE_LAYERS,
  SOURCE,
  STATION_LAYERS,
  addOverlay,
  emptyCollection,
  hereFeature,
  routeFeatures,
  idOf,
  placeFeatures,
  setData,
  sizeAt,
  stationFeatures,
} from '@/components/map/overlay'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatNumber, formatRange, useLanguage } from '@/lib/i18n'
import type { LatLng } from '@/model/geo'
import type { Network } from '@/model/network'

// The map library does its heavy work in a background worker, and has to be told where the bundler put it.
setWorkerUrl(workerUrl)

// [west, south], [east, north]
const SEOUL: [[number, number], [number, number]] = [
  [126.76, 37.425],
  [127.19, 37.705],
]
// As far as the lines run, so the map cannot be dragged off to another country.
const REGION: [[number, number], [number, number]] = [
  [125.9, 36.5],
  [128.2, 38.4],
]

// Shown when the streets cannot be loaded: this site's marks on a plain ground.
const plainStyle = (theme: Theme): StyleSpecification => ({
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': theme === 'dark' ? '#0d1220' : '#eef0f5' } }],
})

/** The background map's style, as OpenFreeMap serves it. It never changes within a visit. */
function useBasemap(theme: Theme) {
  return useQuery({
    queryKey: ['basemap', theme],
    queryFn: async ({ signal }) => {
      const response = await fetch(BASEMAP_URL[theme], { signal })
      if (!response.ok) throw new Error(`The map style returned ${response.status}`)
      return (await response.json()) as StyleSpecification
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** The map is drawn with WebGL 2. Without it there is nothing to show. */
function canDraw(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null
  } catch {
    return false
  }
}

/**
 * Seoul right now, on a real street map: places as glowing rings in their
 * crowd-level colour, stations as dots in their line colour. Click either to
 * open its panel.
 */
export function CityMap({
  network,
  selected,
  here,
  onSelect,
  onLocate,
}: {
  network: Network
  selected: Item | null
  /** Where the reader is, once they have asked to see what is near them. */
  here: LatLng | null
  onSelect: (item: Item) => void
  onLocate: () => void
}) {
  const { lang, s } = useLanguage()
  const theme: Theme = useTheme().resolvedTheme === 'light' ? 'light' : 'dark'
  const basemap = useBasemap(theme)

  const frame = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre | null>(null)
  // True until the reader moves the map. While it is, the map keeps the whole city in view as its frame changes size.
  const followsFrame = useRef(true)
  // Goes up each time a style finishes loading, which is when this site's layers have to be added again.
  const [styleLoads, setStyleLoads] = useState(0)
  const [failed] = useState(() => !canDraw())
  const [layers, setLayers] = useState(['places', 'stations'])
  const [hover, setHover] = useState<{ item: Item; left: number; top: number } | null>(null)

  const style = useMemo(
    () => (basemap.data ? styleFor(basemap.data, theme, lang) : basemap.isError ? plainStyle(theme) : null),
    [basemap.data, basemap.isError, theme, lang],
  )

  // ---------- what to draw ----------

  const items = useMemo(() => {
    const all: Item[] = [...network.places.places, ...(network.stations?.stations ?? [])]
    return new Map(all.map((item) => [idOf(item), item]))
  }, [network])

  const stationData = useMemo(() => stationFeatures(network.stations?.stations ?? [], lang), [network.stations, lang])
  const placeData = useMemo(() => placeFeatures(network, lang, theme), [network, lang, theme])
  const routeData = useMemo(() => routeFeatures(network.stations?.routes ?? []), [network.stations])

  // ---------- the map itself ----------

  const onStyleLoad = useEffectEvent(() => {
    if (mapRef.current) addOverlay(mapRef.current, theme)
    setStyleLoads((count) => count + 1)
  })

  /** The mark under the pointer. The pointer only has to be near it, not on it. */
  const pick = (map: MapLibre, x: number, y: number) => {
    const size = sizeAt(map.getZoom())
    const found = map.queryRenderedFeatures(
      [
        [x - 9, y - 9],
        [x + 9, y + 9],
      ],
      { layers: [LAYER.stations, LAYER.rings].filter((id) => map.getLayer(id)) },
    )
    let best: { item: Item; x: number; y: number } | null = null
    let bestMiss = 7 // pixels the pointer may be off by
    for (const feature of found) {
      const item = items.get(String(feature.properties.id))
      if (!item) continue
      const at = map.project((feature.geometry as Point).coordinates as [number, number])
      const edge = Math.hypot(at.x - x, at.y - y) - Number(feature.properties.r) * size
      // A station is a dot: anywhere on it is a hit. A place is a ring with a station often
      // inside it, so its line is a firm hit and its inside a weak one that a nearby dot beats.
      const miss = item.kind === 'station' ? edge : edge > -3 ? Math.abs(edge) : 3
      if (miss < bestMiss) {
        best = { item, x: at.x, y: at.y }
        bestMiss = miss
      }
    }
    return best
  }

  const onMove = useEffectEvent((event: MapMouseEvent) => {
    const map = event.target
    const hit = pick(map, event.point.x, event.point.y)
    map.getCanvas().style.cursor = hit ? 'pointer' : ''
    if (hit?.item === hover?.item) return
    // Keep the tooltip inside the frame: beside the mark, or above it near the bottom edge.
    const { clientWidth, clientHeight } = map.getContainer()
    setHover(
      hit && {
        item: hit.item,
        left: Math.min(Math.max(hit.x + 14, 8), Math.max(8, clientWidth - 230)),
        top: hit.y + 14 > clientHeight - 90 ? hit.y - 78 : hit.y + 14,
      },
    )
  })

  const onClick = useEffectEvent((event: MapMouseEvent) => {
    const hit = pick(event.target, event.point.x, event.point.y)
    if (hit) onSelect(hit.item)
  })

  // The gesture hints are fixed when the map is made, so they are written in the language at that moment.
  const makeMap = useEffectEvent((container: HTMLDivElement, first: StyleSpecification) => {
    const map = new MapLibre({
      container,
      style: first,
      bounds: SEOUL,
      fitBoundsOptions: { padding: 16 },
      maxBounds: REGION,
      minZoom: 8,
      maxZoom: 17,
      dragRotate: false,
      pitchWithRotate: false,
      // The page scrolls under the map, so a plain wheel or one finger is left to the page.
      cooperativeGestures: true,
      attributionControl: { compact: true },
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': s.mapZoomHintCtrl,
        'CooperativeGesturesHandler.MacHelpText': s.mapZoomHintCmd,
        'CooperativeGesturesHandler.MobileHelpText': s.mapHintTouch,
      },
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.on('style.load', onStyleLoad)
    map.on('mousemove', onMove)
    map.on('click', onClick)
    map.on('movestart', (event) => {
      setHover(null)
      // Only a drag, pinch or scroll carries the browser's own event.
      if ('originalEvent' in event && event.originalEvent) followsFrame.current = false
    })
    // A page can lay itself out after the map is made. Until the reader takes over, fit the city again.
    map.on('resize', () => followsFrame.current && map.fitBounds(SEOUL, { padding: 16, duration: 0 }))
    map.getCanvas().addEventListener('mouseleave', () => setHover(null))
    return map
  })

  useEffect(() => {
    if (!style || !frame.current || failed) return
    if (mapRef.current) mapRef.current.setStyle(style, { diff: false })
    else mapRef.current = makeMap(frame.current, style)
  }, [style, failed])

  useEffect(
    () => () => {
      mapRef.current?.remove()
      mapRef.current = null
    },
    [],
  )

  // ---------- keeping the map in step with the page ----------

  useEffect(() => {
    const map = mapRef.current
    if (!map || styleLoads === 0) return
    setData(map, SOURCE.stations, stationData)
    setData(map, SOURCE.stationNames, stationData)
    setData(map, SOURCE.places, placeData)
    setData(map, SOURCE.placeNames, placeData)
    setData(map, SOURCE.routes, routeData)
  }, [styleLoads, stationData, placeData, routeData])

  // The reader's own position: mark it and move there.
  useEffect(() => {
    const map = mapRef.current
    if (!map || styleLoads === 0) return
    setData(map, SOURCE.here, hereFeature(here))
  }, [styleLoads, here])
  useEffect(() => {
    if (!here || !mapRef.current) return
    followsFrame.current = false
    mapRef.current.easeTo({ center: [here.lng, here.lat], zoom: Math.max(mapRef.current.getZoom(), 13.5), duration: 700 })
  }, [here])

  useEffect(() => {
    const map = mapRef.current
    if (!map || styleLoads === 0) return
    const show = (ids: string[], on: boolean) =>
      ids.forEach((id) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'))
    show(PLACE_LAYERS, layers.includes('places'))
    show(STATION_LAYERS, layers.includes('stations'))
  }, [styleLoads, layers])

  const selectedId = selected ? idOf(selected) : null
  useEffect(() => {
    const map = mapRef.current
    if (!map || styleLoads === 0) return
    const feature = [...stationData.features, ...placeData.features].find((each) => each.properties?.id === selectedId)
    setData(map, SOURCE.selected, feature ? { type: 'FeatureCollection', features: [feature] } : emptyCollection)
  }, [styleLoads, selectedId, stationData, placeData])

  // When something is chosen elsewhere on the page, bring it into view.
  const bringIntoView = useEffectEvent(() => {
    const map = mapRef.current
    if (!map || !selected || !frame.current) return
    const location = selected.kind === 'place' ? network.locationOf(selected) : selected.location
    if (!location) return
    // On a wide screen the panel covers the right of the map, so aim for the middle of what is left.
    const box = frame.current.getBoundingClientRect()
    const covered = window.innerWidth >= 640 ? Math.max(0, box.right - (window.innerWidth - 576)) : 0
    followsFrame.current = false
    map.easeTo({
      center: [location.lng, location.lat],
      zoom: Math.max(map.getZoom(), 13.2),
      offset: [-Math.min(covered, box.width * 0.7) / 2, 0],
      duration: 600,
    })
  })
  useEffect(() => {
    bringIntoView()
  }, [selectedId])

  const zoom = (by: 1 | -1) => {
    followsFrame.current = false
    mapRef.current?.zoomTo(mapRef.current.getZoom() + by)
  }

  const placed = placeData.features.length
  const total = network.places.places.length

  return (
    <figure>
      <div className="relative h-[24rem] overflow-hidden rounded-xl border bg-(--map-bg) sm:h-[32rem] lg:h-[36rem]">
        {/* The map library sets its own positioning on this element, so it is given a size rather than pinned. */}
        <div ref={frame} role="application" aria-label={s.mapLabel} className="size-full" />

        {failed && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <TriangleAlert className="size-4 shrink-0" />
            {s.mapUnavailable}
          </div>
        )}

        {/* What is drawn */}
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          spacing={0}
          value={layers}
          onValueChange={setLayers}
          aria-label={s.layersLabel}
          className="absolute top-3 left-3 rounded-lg bg-card"
        >
          <ToggleGroupItem value="places" className="gap-1.5 px-2.5">
            <span className="size-2.5 rounded-full border-[1.5px] border-current" aria-hidden="true" />
            {s.layerPlaces}
          </ToggleGroupItem>
          <ToggleGroupItem value="stations" className="gap-1.5 px-2.5">
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {s.layerStations}
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <Button variant="outline" size="icon-sm" className="bg-card" onClick={() => zoom(1)} aria-label={s.zoomIn}>
            <Plus />
          </Button>
          <Button variant="outline" size="icon-sm" className="bg-card" onClick={() => zoom(-1)} aria-label={s.zoomOut}>
            <Minus />
          </Button>
          <Button variant="outline" size="icon-sm" className="bg-card" onClick={onLocate} aria-label={s.nearMe} title={s.nearMe}>
            <LocateFixed className={here ? 'text-blue-500' : ''} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="bg-card"
            onClick={() => {
              followsFrame.current = true
              mapRef.current?.fitBounds(SEOUL, { padding: 16 })
            }}
            aria-label={s.zoomReset}
          >
            <Scan />
          </Button>
        </div>

        {hover && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-max max-w-64 rounded-lg border bg-popover px-3 py-2 text-sm shadow-md"
            style={{ left: hover.left, top: hover.top }}
          >
            <div className="font-medium">{hover.item.name(lang)}</div>
            {hover.item.kind === 'place' ? (
              <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                <LevelBadge level={hover.item.level} />
                <span className="tabular-nums">{s.rangePeople(formatRange(lang, hover.item.range))}</span>
              </div>
            ) : (
              <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                <span className="flex gap-1">
                  {hover.item.lines.map((line) => (
                    <LineBadge key={line.id} line={line} />
                  ))}
                </span>
                <span className="tabular-nums">{s.inAndOutPerDay(formatNumber(lang, hover.item.ridership.total()))}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        {s.legendPlaces} {s.legendStations} {placed < total && s.placesOnMap(placed, total)}{' '}
        {basemap.isError && s.mapStreetsFailed}
      </figcaption>
    </figure>
  )
}
