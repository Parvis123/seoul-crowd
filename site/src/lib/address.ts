import { useMemo, useSyncExternalStore } from 'react'

// The page keeps what you are looking at in its address, so any view can be
// sent to someone: ?tab=stations&line=6, ?place=POI007, ?station=합정&lang=ko.

const CHANGED = 'address-changed'

function subscribe(notify: () => void) {
  window.addEventListener('popstate', notify)
  window.addEventListener(CHANGED, notify)
  return () => {
    window.removeEventListener('popstate', notify)
    window.removeEventListener(CHANGED, notify)
  }
}

const read = () => window.location.search

/** A history entry made by opening a panel carries this, so closing the panel can step back over it. */
type Mark = { panel?: boolean } | null

/**
 * Changes parts of the address. A null value removes that part.
 * `push` adds a history entry, so the browser's Back button undoes the change.
 */
export function setAddress(changes: Record<string, string | null>, options: { push?: boolean; panel?: boolean } = {}) {
  const params = new URLSearchParams(window.location.search)
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) params.delete(key)
    else params.set(key, value)
  }
  const query = params.toString()
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  if (options.push) window.history.pushState({ panel: options.panel } satisfies Mark, '', url)
  else window.history.replaceState(window.history.state, '', url)
  window.dispatchEvent(new Event(CHANGED))
}

/** True when the current history entry was made by opening a panel. */
export const openedPanel = () => (window.history.state as Mark)?.panel === true

/** Reads parts of the address, and re-renders when it changes. */
export function useAddress() {
  const search = useSyncExternalStore(subscribe, read)
  return useMemo(() => new URLSearchParams(search), [search])
}
