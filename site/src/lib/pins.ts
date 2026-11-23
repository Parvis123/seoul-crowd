import { useSyncExternalStore } from 'react'

// Pinned places and stations, kept in this browser only.

const KEY = 'seoul-crowd:pins'
const CHANGED = 'pins-changed'
const NONE: readonly string[] = []

let cached: { text: string | null; ids: readonly string[] } = { text: null, ids: NONE }

function read(): readonly string[] {
  let text: string | null = null
  try {
    text = localStorage.getItem(KEY)
  } catch {
    // Storage can be blocked. Pins then last for this visit only.
    return cached.ids
  }
  // The same text gives back the same list, which is what tells React nothing changed.
  if (text === cached.text) return cached.ids
  let ids: readonly string[] = NONE
  try {
    const parsed: unknown = JSON.parse(text ?? '[]')
    if (Array.isArray(parsed)) ids = parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    // Unreadable pins are treated as none.
  }
  cached = { text, ids }
  return ids
}

function write(ids: readonly string[]) {
  const text = JSON.stringify(ids)
  try {
    localStorage.setItem(KEY, text)
  } catch {
    cached = { text: null, ids }
  }
  window.dispatchEvent(new Event(CHANGED))
}

function subscribe(notify: () => void) {
  window.addEventListener('storage', notify) // another tab changed the pins
  window.addEventListener(CHANGED, notify)
  return () => {
    window.removeEventListener('storage', notify)
    window.removeEventListener(CHANGED, notify)
  }
}

/** The pinned ids, oldest first, with a way to pin or unpin one. Ids look like "place:POI007" or "station:합정". */
export function usePins() {
  const ids = useSyncExternalStore(subscribe, read)
  return {
    ids,
    isPinned: (id: string) => ids.includes(id),
    toggle: (id: string) => write(ids.includes(id) ? ids.filter((each) => each !== id) : [...ids, id]),
  }
}
