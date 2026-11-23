import { usePins } from '@/lib/pins'
import type { Network } from '@/model/network'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

/** The reader's pinned places and stations, in the order they pinned them. */
export function usePinned(network: Network | null): (Place | Station)[] {
  const { ids } = usePins()
  if (!network) return []
  return ids.flatMap((id) => {
    const item = id.startsWith('place:') ? network.places.get(id.slice('place:'.length)) : network.stations?.get(id.slice('station:'.length))
    return item ? [item] : []
  })
}
