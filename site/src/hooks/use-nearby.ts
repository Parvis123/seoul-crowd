import { useState } from 'react'
import { toast } from 'sonner'

import { formatNumber, useLanguage } from '@/lib/i18n'
import { type LatLng, kilometresBetween } from '@/model/geo'
import type { Network } from '@/model/network'

const CITY_HALL: LatLng = { lat: 37.5663, lng: 126.9779 }
/** Further than this from City Hall, there is nothing on the map to call nearby. */
const NEARBY_KM = 45

/** Where the reader is, once they ask, and the places and stations closest to them. */
export function useNearby(network: Network | null) {
  const { lang, s } = useLanguage()
  const [here, setHere] = useState<LatLng | null>(null)

  const locate = () => {
    if (!('geolocation' in navigator)) return void toast.error(s.nearFailed)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const found = { lat: coords.latitude, lng: coords.longitude }
        if (kilometresBetween(found, CITY_HALL) > NEARBY_KM) toast.info(s.nearFar)
        else setHere(found)
      },
      (error) => toast.error(error.code === error.PERMISSION_DENIED ? s.nearDenied : s.nearFailed),
      { timeout: 10_000, maximumAge: 60_000 },
    )
  }

  return {
    here,
    locate,
    clear: () => setHere(null),
    /** Nearest first, or null until the reader has asked. */
    items: here && network ? network.near(here) : null,
    /** "240 m away" or "1.3 km away". */
    distance: (km: number) =>
      s.nearAway(km < 1 ? s.metres(Math.round((km * 1000) / 10) * 10) : s.kilometres(formatNumber(lang, Math.round(km * 10) / 10))),
  }
}

export type Nearby = ReturnType<typeof useNearby>
