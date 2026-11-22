import { Minus, Plus, Scan } from 'lucide-react'
import { type PointerEvent, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'

import { LevelBadge } from '@/components/level-badge'
import { LEVEL_COLOR, LEVEL_DOT } from '@/components/level-colors'
import { LineBadge } from '@/components/line-badge'
import { CITY, DISTRICTS, type Point, RIVER, project } from '@/components/map/projection'
import { useZoomPan } from '@/components/map/use-zoom-pan'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatNumber, formatRange, useLanguage } from '@/lib/i18n'
import type { Network } from '@/model/network'
import { CrowdLevel, type Place } from '@/model/place'
import type { Station } from '@/model/station'

type Item = Place | Station

/** Something drawn on the map. `radius` is in screen pixels, so it stays the same size when zooming. */
type Marker = { item: Item; id: string; point: Point; radius: number }

const idOf = (item: Item) => (item.kind === 'place' ? `place:${item.code}` : `station:${item.key}`)

// How many station names to write at each zoom, where 1 is the whole city in view.
const stationLabels = (zoom: number) => (zoom < 1.8 ? 0 : zoom < 3 ? 12 : zoom < 5 ? 45 : zoom < 8 ? 160 : Infinity)

/**
 * Seoul right now: places as glowing rings in their crowd-level colour, and
 * stations as dots in their line colour. Click either to open its panel.
 */
export function CityMap({
  network,
  selected,
  onSelect,
}: {
  network: Network
  selected: Item | null
  onSelect: (item: Item) => void
}) {
  const { lang, s } = useLanguage()
  const svgRef = useRef<SVGSVGElement>(null)
  const layerRef = useRef<SVGGElement>(null)
  const { k, homeK, size, zoomBy, reset, flyTo, toMap, toFrame } = useZoomPan(svgRef, layerRef, CITY)
  const [layers, setLayers] = useState(['places', 'stations'])
  // The marker under the pointer, with where its tooltip goes in the frame.
  const [hover, setHover] = useState<{ marker: Marker; at: Point } | null>(null)
  const dragging = useRef(false)

  const places = useMemo(() => {
    const most = network.places.mostPeople?.people ?? 1
    return network.places.places.flatMap((place): Marker[] => {
      const location = network.locationOf(place)
      if (!location) return []
      return [{ item: place, id: idOf(place), point: project(location), radius: 5 + 12 * Math.sqrt(place.people / most) }]
    })
  }, [network])

  const stations = useMemo(() => {
    const list = network.stations?.stations ?? []
    const most = Math.max(1, ...list.map((station) => station.ridership.total()))
    return list
      .flatMap((station): Marker[] => {
        if (!station.location) return []
        const radius = 1.8 + 5.2 * Math.sqrt(station.ridership.total() / most)
        return [{ item: station, id: idOf(station), point: project(station.location), radius }]
      })
      .sort((a, b) => b.radius - a.radius)
  }, [network.stations])

  const showPlaces = layers.includes('places')
  const showStations = layers.includes('stations')
  const visible = useMemo(
    () => [...(showStations ? stations : []), ...(showPlaces ? places : [])],
    [places, stations, showPlaces, showStations],
  )

  // On a narrow frame the city is small, so the marks shrink with it rather than pile up.
  const shrink = Math.min(1, Math.max(0.55, size.width / 900))
  const radiusOf = (marker: Marker) => marker.radius * shrink

  /** The marker under a position in the frame. The pointer only has to be near it, not on it. */
  const markerAt = (x: number, y: number): Marker | null => {
    const at = toMap(x, y)
    let best: Marker | null = null
    let bestMiss = 7 // pixels the pointer may be off by
    for (const marker of visible) {
      const pixels = Math.hypot(marker.point.x - at.x, marker.point.y - at.y) * k
      const edge = pixels - radiusOf(marker)
      // A station is a dot: anywhere on it is a hit. A place is a ring with a station often
      // inside it, so its line is a firm hit and its inside a weak one that a nearby dot beats.
      const miss = marker.item.kind === 'station' ? edge : edge > -3 ? Math.abs(edge) : 3
      if (miss < bestMiss) {
        best = marker
        bestMiss = miss
      }
    }
    return best
  }

  const framePosition = (event: { clientX: number; clientY: number }) => {
    const box = svgRef.current!.getBoundingClientRect()
    return [event.clientX - box.left, event.clientY - box.top] as const
  }

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || dragging.current) return
    const next = markerAt(...framePosition(event))
    if (next?.id !== hover?.marker.id) setHover(next && { marker: next, at: toFrame(next.point) })
  }

  // When something is chosen elsewhere on the page, bring it into view.
  const selectedId = selected ? idOf(selected) : null
  const bringIntoView = useEffectEvent(() => {
    if (!selected || !svgRef.current) return
    const location = selected.kind === 'place' ? network.locationOf(selected) : selected.location
    if (!location) return
    // On a wide screen the panel covers the right of the map, so aim for the middle of what is left.
    const box = svgRef.current.getBoundingClientRect()
    const covered = window.innerWidth >= 640 ? Math.max(0, box.right - (window.innerWidth - 576)) : 0
    flyTo(project(location), covered / 2)
  })
  useEffect(() => {
    bringIntoView()
  }, [selectedId])

  const zoomLevel = k / homeK
  const labels = useMemo(() => {
    // Names are placed most important first, and one that would run into an earlier one is left out.
    const out: Marker[] = []
    const boxes: { left: number; right: number; top: number; bottom: number }[] = []
    const add = (marker: Marker) => {
      const name = marker.item.name(lang)
      // Close enough to the drawn width: Korean letters are about twice as wide as Latin ones.
      const width = [...name].reduce((total, char) => total + (char.charCodeAt(0) > 0x2e80 ? 11.5 : 6.4), 0)
      const left = marker.point.x * k + marker.radius * shrink + 5
      const box = { left: left - 4, right: left + width + 4, top: marker.point.y * k - 9, bottom: marker.point.y * k + 9 }
      if (boxes.some((b) => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top)) return
      boxes.push(box)
      out.push(marker)
    }
    if (showPlaces) {
      const ranked = [...places].sort((a, b) => (a.item as Place).level.rank - (b.item as Place).level.rank || a.radius - b.radius).reverse()
      ranked.slice(0, zoomLevel < 1.8 ? 5 : zoomLevel < 3 ? 14 : Infinity).forEach(add)
    }
    if (showStations) stations.slice(0, stationLabels(zoomLevel)).forEach(add)
    return out
  }, [places, stations, showPlaces, showStations, zoomLevel, k, lang, shrink])

  const selectedMarker = selectedId ? visible.find((marker) => marker.id === selectedId) : undefined
  const px = (pixels: number) => pixels / k // screen pixels as map units

  return (
    <figure>
      <div className="relative h-[24rem] overflow-hidden rounded-xl border bg-(--map-bg) sm:h-[32rem] lg:h-[36rem]">
        <svg
          ref={svgRef}
          role="img"
          aria-label={s.mapLabel}
          className={`size-full touch-pan-y select-none ${hover ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
          onPointerMove={onPointerMove}
          onPointerDown={() => {
            dragging.current = true
            setHover(null)
          }}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => {
            dragging.current = false
            setHover(null)
          }}
          onClick={(event) => {
            const marker = markerAt(...framePosition(event))
            if (marker) onSelect(marker.item)
          }}
        >
          <defs>
            {CrowdLevel.all.map((level) => (
              <radialGradient key={level.rank} id={`glow-${level.rank}`}>
                <stop offset="0%" stopColor={LEVEL_COLOR[level.rank]} stopOpacity={0.55} />
                <stop offset="55%" stopColor={LEVEL_COLOR[level.rank]} stopOpacity={0.16} />
                <stop offset="100%" stopColor={LEVEL_COLOR[level.rank]} stopOpacity={0} />
              </radialGradient>
            ))}
          </defs>

          <g ref={layerRef}>
            <g fill="var(--map-land)" stroke="var(--map-border)" strokeWidth={px(1)} strokeLinejoin="round">
              {DISTRICTS.map((district) => (
                <path key={district.name} d={district.path} />
              ))}
            </g>
            <path d={RIVER} fill="none" stroke="var(--map-water)" strokeWidth={20} strokeLinejoin="round" strokeLinecap="round" />

            {showPlaces &&
              places.map((marker) => (
                <circle
                  key={`glow-${marker.id}`}
                  cx={marker.point.x}
                  cy={marker.point.y}
                  r={px(radiusOf(marker) * 2.6)}
                  fill={`url(#glow-${(marker.item as Place).level.rank})`}
                />
              ))}

            {showStations &&
              stations.map((marker) => {
                const station = marker.item as Station
                const transfer = station.lines.length > 1
                return (
                  <circle
                    key={marker.id}
                    cx={marker.point.x}
                    cy={marker.point.y}
                    r={px(radiusOf(marker))}
                    fill={transfer ? 'var(--map-transfer)' : station.mainLine.color}
                    stroke={transfer ? station.mainLine.color : 'var(--map-dot-edge)'}
                    strokeWidth={px(transfer ? 1.75 : 0.75)}
                  />
                )
              })}

            {showPlaces &&
              places.map((marker) => {
                const color = LEVEL_COLOR[(marker.item as Place).level.rank]
                return (
                  <circle
                    key={marker.id}
                    cx={marker.point.x}
                    cy={marker.point.y}
                    r={px(radiusOf(marker))}
                    fill={color}
                    fillOpacity={0.12}
                    stroke={color}
                    strokeWidth={px(1.75)}
                  />
                )
              })}

            {selectedMarker && (
              <circle
                cx={selectedMarker.point.x}
                cy={selectedMarker.point.y}
                r={px(radiusOf(selectedMarker) + 5)}
                fill="none"
                stroke="var(--foreground)"
                strokeWidth={px(2)}
              />
            )}

            <g
              fontSize={px(11.5)}
              fill="var(--foreground)"
              stroke="var(--map-bg)"
              strokeWidth={px(3)}
              strokeLinejoin="round"
              paintOrder="stroke"
              className="pointer-events-none font-medium"
              aria-hidden="true"
            >
              {labels.map((marker) => (
                <text key={marker.id} x={marker.point.x + px(radiusOf(marker) + 5)} y={marker.point.y} dominantBaseline="central">
                  {marker.item.name(lang)}
                </text>
              ))}
            </g>
          </g>
        </svg>

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
          <Button variant="outline" size="icon-sm" className="bg-card" onClick={() => zoomBy(1.6)} aria-label={s.zoomIn}>
            <Plus />
          </Button>
          <Button variant="outline" size="icon-sm" className="bg-card" onClick={() => zoomBy(1 / 1.6)} aria-label={s.zoomOut}>
            <Minus />
          </Button>
          <Button variant="outline" size="icon-sm" className="bg-card" onClick={reset} aria-label={s.zoomReset}>
            <Scan />
          </Button>
        </div>

        {/* How to read the colours. The rest of the key is written under the map. */}
        <ul className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-1 rounded-lg border bg-card/90 px-3 py-2 text-xs backdrop-blur-sm">
          {CrowdLevel.all.map((level) => (
            <li key={level.rank} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${LEVEL_DOT[level.rank]}`} aria-hidden="true" />
              {s.levels[level.korean]}
            </li>
          ))}
        </ul>

        {hover && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-max max-w-64 rounded-lg border bg-popover px-3 py-2 text-sm shadow-md"
            style={{
              left: Math.min(Math.max(hover.at.x + 14, 8), Math.max(8, size.width - 230)),
              top: hover.at.y + 14 > size.height - 90 ? hover.at.y - 78 : hover.at.y + 14,
            }}
          >
            <div className="font-medium">{hover.marker.item.name(lang)}</div>
            {hover.marker.item.kind === 'place' ? (
              <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                <LevelBadge level={hover.marker.item.level} />
                <span className="tabular-nums">{s.rangePeople(formatRange(lang, hover.marker.item.range))}</span>
              </div>
            ) : (
              <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                <span className="flex gap-1">
                  {hover.marker.item.lines.map((line) => (
                    <LineBadge key={line.id} line={line} />
                  ))}
                </span>
                <span className="tabular-nums">{s.inAndOutPerDay(formatNumber(lang, hover.marker.item.ridership.total()))}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        {s.legendPlaces} {s.legendStations}{' '}
        {places.length < network.places.places.length && s.placesOnMap(places.length, network.places.places.length)}{' '}
        <span className="pointer-fine:hidden">{s.mapHintTouch}</span>
        <span className="pointer-coarse:hidden">{s.mapHintMouse}</span>
      </figcaption>
    </figure>
  )
}
