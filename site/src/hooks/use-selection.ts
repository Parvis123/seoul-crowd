import { useEffect } from 'react'

import { openedPanel, setAddress, useAddress } from '@/lib/address'
import { useLanguage } from '@/lib/i18n'
import type { Network } from '@/model/network'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

export const TABS = ['now', 'all', 'stations'] as const
export type Tab = (typeof TABS)[number]

/**
 * What the reader has open: which tab, and which place or station in the side
 * panel. All of it lives in the address (?tab=, ?place=, ?station=), so any
 * view can be linked to and the browser's Back button closes a panel.
 */
export function useSelection(network: Network | null) {
  const { lang, s } = useLanguage()
  const address = useAddress()
  const tab: Tab = TABS.find((each) => each === address.get('tab')) ?? 'now'
  const panelOpen = address.has('place') || address.has('station')

  // Looked up again on every render, so an open panel follows fresh readings.
  const place = network?.places.get(address.get('place') ?? '') ?? null
  const station = network?.stations?.get(address.get('station') ?? '') ?? null

  // The browser tab names what is open, which is also what a bookmark or shared link is called.
  const openName = (place ?? station)?.name(lang)
  useEffect(() => {
    document.title = openName ? `${openName} · ${s.title}` : s.title
  }, [openName, s])

  return {
    tab,
    setTab: (next: string) => setAddress({ tab: next === 'now' ? null : next }),
    place,
    station,
    /** Whichever of the two is open. */
    item: place ?? station,
    // Opening a panel adds a step to the browser's history. Moving from one panel to another does not.
    select: (item: Place | Station) =>
      setAddress(item.kind === 'place' ? { place: item.code, station: null } : { station: item.key, place: null }, {
        push: !panelOpen,
        panel: true,
      }),
    close: () => (openedPanel() ? window.history.back() : setAddress({ place: null, station: null })),
  }
}
