import { Suspense, lazy } from 'react'

import { Directions } from '@/components/directions'
import { PanelSkeleton } from '@/components/page-skeleton'
import type { Directions as DirectionsState } from '@/hooks/use-journey'
import type { Nearby } from '@/hooks/use-nearby'
import type { Network } from '@/model/network'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

// The two side panels bring the chart library with them, so they load on their own after the page appears.
const PlaceSheet = lazy(() => import('@/components/place-sheet').then((module) => ({ default: module.PlaceSheet })))
const StationSheet = lazy(() => import('@/components/station-sheet').then((module) => ({ default: module.StationSheet })))

/** The side panel for whichever place or station is open. */
export function Panels({
  network,
  place,
  station,
  directions,
  nearby,
  onClose,
  onSelect,
}: {
  network: Network | null
  place: Place | null
  station: Station | null
  directions: DirectionsState
  nearby: Nearby
  onClose: () => void
  onSelect: (item: Place | Station) => void
}) {
  const target = place ?? station
  const route = network && target && (
    <Directions network={network} target={target} directions={directions} here={nearby.here !== null} onLocate={nearby.locate} />
  )
  return (
    // If someone arrives by a link to a panel, its outline shows while the code for it loads.
    <Suspense fallback={place || station ? <PanelSkeleton /> : null}>
      <PlaceSheet place={place} stations={place && network ? network.stationsFor(place) : []} onClose={onClose} onOpenStation={onSelect} directions={route} />
      {network?.stations && (
        <StationSheet
          station={station}
          directory={network.stations}
          places={station ? network.placesFor(station) : []}
          onClose={onClose}
          onOpenPlace={onSelect}
          directions={route}
        />
      )}
    </Suspense>
  )
}
