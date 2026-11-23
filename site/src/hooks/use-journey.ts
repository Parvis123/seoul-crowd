import { useMemo } from 'react'

import { setAddress, useAddress } from '@/lib/address'
import type { LatLng } from '@/model/geo'
import type { Network } from '@/model/network'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

/**
 * Directions to whatever is open. Where the reader starts from is part of the
 * address (?from=here, or ?from= a station), so a route can be linked to.
 */
export function useJourney(network: Network | null, target: Place | Station | null, here: LatLng | null) {
  const from = useAddress().get('from')
  const fromStation = from && from !== 'here' ? (network?.stations?.get(from) ?? null) : null
  const origin: Station | LatLng | null = from === 'here' ? here : fromStation

  const journey = useMemo(() => (network && target && origin ? network.journeyTo(target, origin) : null), [network, target, origin])

  return {
    /** 'here', a station, or null when no start has been chosen. */
    from: from === 'here' ? ('here' as const) : fromStation,
    origin,
    journey,
    setFrom: (next: Station | 'here' | null) => setAddress({ from: next === null ? null : next === 'here' ? 'here' : next.key }),
  }
}

export type Directions = ReturnType<typeof useJourney>
