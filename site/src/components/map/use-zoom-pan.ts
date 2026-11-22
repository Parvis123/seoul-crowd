import { select } from 'd3-selection'
import 'd3-transition'
import { type ZoomBehavior, type ZoomTransform, zoom, zoomIdentity } from 'd3-zoom'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import type { Point } from '@/components/map/projection'

type Box = { x: number; y: number; width: number; height: number }

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Drag, pinch and button zooming for an SVG map.
 *
 * The moving layer's transform is written straight to the element, so
 * dragging does not re-render React. Only the zoom level is kept in state,
 * because markers and labels are sized by it.
 */
export function useZoomPan(
  svgRef: RefObject<SVGSVGElement | null>,
  layerRef: RefObject<SVGGElement | null>,
  /** The area to show at the start, in map units. */
  home: Box,
) {
  const behavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transform = useRef<ZoomTransform>(zoomIdentity)
  const touched = useRef(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [k, setK] = useState(1)

  /** The zoom and position that fit `home` in the frame. */
  const homeTransform = useCallback(
    (width: number, height: number) => {
      const scale = Math.min(width / home.width, height / home.height) * 0.94
      return zoomIdentity
        .translate(width / 2 - (home.x + home.width / 2) * scale, height / 2 - (home.y + home.height / 2) * scale)
        .scale(scale)
    },
    [home],
  )

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const instance = zoom<SVGSVGElement, unknown>()
      .filter((event: Event) => {
        // The page scrolls under the map, so a plain wheel or one finger must not be captured.
        // Pinching a trackpad arrives as a wheel event with ctrlKey set.
        if (event instanceof WheelEvent) return event.ctrlKey || event.metaKey
        if ('touches' in event) return (event as TouchEvent).touches.length >= 2
        return !(event as MouseEvent).button
      })
      .on('zoom', (event) => {
        transform.current = event.transform
        layerRef.current?.setAttribute('transform', event.transform.toString())
        if (event.sourceEvent) touched.current = true
        setK(event.transform.k)
      })
    behavior.current = instance
    select(svg).call(instance).on('dblclick.zoom', null)

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(svg)
    return () => {
      observer.disconnect()
      select(svg).on('.zoom', null)
    }
  }, [svgRef, layerRef])

  // Fit the city whenever the frame changes size, until the reader has moved the map themselves.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !behavior.current || size.width === 0 || touched.current) return
    const fit = homeTransform(size.width, size.height)
    behavior.current.scaleExtent([fit.k * 0.4, fit.k * 16])
    select(svg).call(behavior.current.transform, fit)
  }, [size, homeTransform, svgRef])

  const moveTo = useCallback(
    (next: ZoomTransform) => {
      const svg = svgRef.current
      if (!svg || !behavior.current) return
      touched.current = true
      select(svg)
        .transition()
        .duration(reducedMotion() ? 0 : 450)
        .call(behavior.current.transform, next)
    },
    [svgRef],
  )

  const zoomBy = useCallback(
    (factor: number) => {
      const svg = svgRef.current
      if (!svg || !behavior.current) return
      touched.current = true
      select(svg)
        .transition()
        .duration(reducedMotion() ? 0 : 200)
        .call(behavior.current.scaleBy, factor)
    },
    [svgRef],
  )

  const reset = useCallback(() => {
    moveTo(homeTransform(size.width, size.height))
    touched.current = false
  }, [moveTo, homeTransform, size])

  /** Brings a point to the middle of the frame (or `offsetX` pixels left of it), zooming in if far out. */
  const flyTo = useCallback(
    (point: Point, offsetX = 0) => {
      const scale = Math.max(transform.current.k, homeTransform(size.width, size.height).k * 2.6)
      moveTo(zoomIdentity.translate(size.width / 2 - offsetX - point.x * scale, size.height / 2 - point.y * scale).scale(scale))
    },
    [moveTo, homeTransform, size],
  )

  /** Turns a position in the frame into map units. */
  const toMap = useCallback((x: number, y: number): Point => {
    const [mx, my] = transform.current.invert([x, y])
    return { x: mx, y: my }
  }, [])

  /** Turns map units into a position in the frame. */
  const toFrame = useCallback((point: Point): Point => {
    const [x, y] = transform.current.apply([point.x, point.y])
    return { x, y }
  }, [])

  const homeK = size.width ? homeTransform(size.width, size.height).k : 1
  return { k, homeK, size, zoomBy, reset, flyTo, toMap, toFrame }
}
