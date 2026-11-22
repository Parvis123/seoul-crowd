import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AllPlaces } from '@/components/all-places'
import { LanguageToggle } from '@/components/language-toggle'
import { NowList } from '@/components/now-list'
import { PlaceSheet } from '@/components/place-sheet'
import { StationSheet } from '@/components/station-sheet'
import { Stations } from '@/components/stations'
import { Summary } from '@/components/summary'
import { ThemeMenu } from '@/components/theme-menu'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Current, type Weekly, byBusiest, currentPlaces, loadWeekly, newestReading } from '@/lib/data'
import { useLanguage } from '@/lib/i18n'
import { type Station, type StationFile, buildStations, loadStations, stationKeysForPlace } from '@/lib/stations'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: Weekly }
type StationState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; file: StationFile; stations: Station[] }

function App() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [stationState, setStationState] = useState<StationState>({ status: 'loading' })
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const { s } = useLanguage()

  useEffect(() => {
    const controller = new AbortController()
    loadWeekly(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [])

  // The station figures change once a day and the page works without them, so they load on their own.
  useEffect(() => {
    const controller = new AbortController()
    loadStations(controller.signal)
      .then((file) => setStationState({ status: 'ready', file, stations: buildStations(file) }))
      .catch((error) => {
        if (error.name !== 'AbortError') setStationState({ status: 'error' })
      })
    return () => controller.abort()
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const data = await loadWeekly()
      setState({ status: 'ready', data })
      toast.success(s.updated)
    } catch {
      toast.error(s.updateFailed)
    } finally {
      setRefreshing(false)
    }
  }, [s])

  const places = useMemo(() => (state.status === 'ready' ? currentPlaces(state.data.places) : []), [state])
  const ranked = useMemo(() => [...places].sort(byBusiest), [places])
  const newest = newestReading(places)
  const selectedPlace = places.find((p) => p.code === selected) ?? null

  // Places named after a station, and the other way round.
  const stationList = stationState.status === 'ready' ? stationState.stations : null
  const links = useMemo(() => {
    const byKey = new Map((stationList ?? []).map((station) => [station.key, station]))
    const known = new Set(byKey.keys())
    const stationsOf = new Map<string, Station[]>() // place code -> stations
    const placesOf = new Map<string, Current[]>() // station key -> places
    for (const place of places) {
      const found = stationKeysForPlace(place.name, known).map((key) => byKey.get(key)!)
      stationsOf.set(place.code, found)
      for (const station of found) placesOf.set(station.key, [...(placesOf.get(station.key) ?? []), place])
    }
    return { byKey, stationsOf, placesOf }
  }, [stationList, places])
  const openStation = selectedStation ? (links.byKey.get(selectedStation) ?? null) : null

  // Only one panel is open at a time.
  const select = (place: Current) => {
    setSelectedStation(null)
    setSelected(place.code)
  }
  const selectStation = (station: Station) => {
    setSelected(null)
    setSelectedStation(station.key)
  }

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h1>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                onClick={refresh}
                disabled={refreshing || state.status === 'loading'}
                aria-label={s.update}
              >
                <RefreshCw className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{s.update}</span>
              </Button>
              <LanguageToggle />
              <ThemeMenu />
            </div>
          </div>
          <p className="mt-1 text-muted-foreground">{s.tagline}</p>
        </header>

        {state.status === 'error' && (
          <Alert variant="destructive" className="mt-8">
            <TriangleAlert />
            <AlertTitle>{s.loadFailedTitle}</AlertTitle>
            <AlertDescription>{s.loadFailedBody}</AlertDescription>
          </Alert>
        )}

        {state.status === 'loading' && (
          <div className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        )}

        {state.status === 'ready' && places.length === 0 && (
          <Alert className="mt-8">
            <AlertTitle>{s.emptyTitle}</AlertTitle>
            <AlertDescription>{s.emptyBody}</AlertDescription>
          </Alert>
        )}

        {state.status === 'ready' && places.length > 0 && (
          <>
            <section className="mt-8">
              <Summary places={places} newest={newest} />
            </section>

            <Tabs defaultValue="now" className="mt-8">
              <TabsList>
                <TabsTrigger value="now">{s.tabNow}</TabsTrigger>
                <TabsTrigger value="all">{s.tabAll(places.length)}</TabsTrigger>
                <TabsTrigger value="stations">{s.tabStations}</TabsTrigger>
              </TabsList>
              <TabsContent value="now" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <NowList
                    title={s.busiest}
                    description={s.busiestHint}
                    places={ranked.slice(0, 5)}
                    onSelect={select}
                  />
                  <NowList
                    title={s.quietest}
                    description={s.quietestHint}
                    places={ranked.slice(-5).reverse()}
                    onSelect={select}
                  />
                </div>
              </TabsContent>
              <TabsContent value="all" className="mt-4">
                <AllPlaces places={places} onSelect={select} />
              </TabsContent>
              <TabsContent value="stations" className="mt-4">
                {stationState.status === 'loading' && <Skeleton className="h-96 rounded-xl" />}
                {stationState.status === 'error' && (
                  <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>{s.stationsLoadFailedTitle}</AlertTitle>
                    <AlertDescription>{s.loadFailedBody}</AlertDescription>
                  </Alert>
                )}
                {stationState.status === 'ready' && (
                  <Stations file={stationState.file} stations={stationState.stations} onSelect={selectStation} />
                )}
              </TabsContent>
            </Tabs>

            <p className="mt-8 text-sm text-muted-foreground">
              {s.footer} {s.stationsSource}
            </p>
          </>
        )}
      </main>
      <PlaceSheet
        place={selectedPlace}
        stations={selectedPlace ? (links.stationsOf.get(selectedPlace.code) ?? []) : []}
        onClose={() => setSelected(null)}
        onOpenStation={selectStation}
      />
      {stationState.status === 'ready' && (
        <StationSheet
          station={openStation}
          file={stationState.file}
          places={openStation ? (links.placesOf.get(openStation.key) ?? []) : []}
          onClose={() => setSelectedStation(null)}
          onOpenPlace={select}
        />
      )}
      <Toaster />
    </>
  )
}

export default App
