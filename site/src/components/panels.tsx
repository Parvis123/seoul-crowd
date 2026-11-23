import { Suspense, lazy } from 'react'

import { PanelSkeleton } from '@/components/page-skeleton'
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
  onClose,
  onSelect,
}: {
  network: Network | null
  place: Place | null
  station: Station | null
  onClose: () => void
  onSelect: (item: Place | Station) => void
}) {
  return (
    // If someone arrives by a link to a panel, its outline shows while the code for it loads.
    <Suspense fallback={place || station ? <PanelSkeleton /> : null}>
      <PlaceSheet place={place} stations={place && network ? network.stationsFor(place) : []} onClose={onClose} onOpenStation={onSelect} />
      {network?.stations && (
        <StationSheet
          station={station}
          directory={network.stations}
          places={station ? network.placesFor(station) : []}
          onClose={onClose}
          onOpenPlace={onSelect}
        />
      )}
    </Suspense>
  )
}
