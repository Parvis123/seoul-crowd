// The service worker: what makes the site installable and lets it open with no connection.
// It is plain JavaScript on purpose. The browser fetches this file by its fixed name, outside the build.
//
// Three rules, by what is being asked for:
//   1. The data files      -> the network first, and the last copy saved if that fails.
//   2. The built files     -> the saved copy first. Their names carry a hash, so a file never changes.
//   3. The page itself     -> the network first, so a new version shows up straight away.
// Map tiles and anything else from another site are left alone.

const SHELL = 'shell-v1'
const DATA = 'data-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => name !== SHELL && name !== DATA).map((name) => caches.delete(name)))
      await self.clients.claim()
    })(),
  )
})

async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    const saved = (await cache.match(request, { ignoreSearch: true })) ?? (fallback && (await cache.match(fallback)))
    if (saved) return saved
    throw error
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const saved = await cache.match(request)
  if (saved) return saved
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request, DATA))
    return
  }
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Any address on the site is the same page, so with no connection the saved front page stands in.
    event.respondWith(networkFirst(request, SHELL, self.registration.scope))
    return
  }
  event.respondWith(url.pathname.includes('/assets/') ? cacheFirst(request, SHELL) : networkFirst(request, SHELL))
})
