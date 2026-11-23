import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Suspense, lazy, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useNetwork, usePlaces, useStations } from '@/api/queries'
import { AllPlaces } from '@/components/all-places'
import { Headline } from '@/components/headline'
import { HowItWorks } from '@/components/how-it-works'
import { ItemList } from '@/components/item-list'
import { LanguageToggle } from '@/components/language-toggle'
import { NowList } from '@/components/now-list'
import { RankedLists } from '@/components/ranked-lists'
import { SearchBox } from '@/components/search-box'
import { Stations } from '@/components/stations'
import { ThemeMenu } from '@/components/theme-menu'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { openedPanel, setAddress, useAddress } from '@/lib/address'
import { formatNumber, useLanguage } from '@/lib/i18n'
import { usePins } from '@/lib/pins'
import { type LatLng, kilometresBetween } from '@/model/geo'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

// The map library is large, so it loads on its own after the page appears.
const CityMap = lazy(() => import('@/components/map/city-map').then((module) => ({ default: module.CityMap })))
// So do the two side panels, which bring the chart library with them.
const PlaceSheet = lazy(() => import('@/components/place-sheet').then((module) => ({ default: module.PlaceSheet })))
const StationSheet = lazy(() => import('@/components/station-sheet').then((module) => ({ default: module.StationSheet })))

/** How many places the "fullest for their size" list shows before it says "and more". */
const FULLEST = 6

const TABS = ['now', 'all', 'stations'] as const
const CITY_HALL: LatLng = { lat: 37.5663, lng: 126.9779 }
/** Further than this from City Hall, there is nothing on the map to call nearby. */
const NEARBY_KM = 45

function App() {
  const { lang, s } = useLanguage()
  const places = usePlaces()
  const stations = useStations()
  const network = useNetwork()
  const pins = usePins()
  // What is open lives in the address (?place=, ?station=, ?tab=), so any view can be linked to.
  const address = useAddress()
  const tab = TABS.find((each) => each === address.get('tab')) ?? 'now'
  const [here, setHere] = useState<LatLng | null>(null)

  const refresh = async () => {
    const result = await places.refetch()
    if (result.isSuccess) toast.success(s.updated)
    else toast.error(s.updateFailed)
  }

  const panelOpen = address.has('place') || address.has('station')
  // Opening a panel adds a step to the browser's history, so Back closes it. Moving from one panel to another does not.
  const select = (item: Place | Station) =>
    setAddress(item.kind === 'place' ? { place: item.code, station: null } : { station: item.key, place: null }, {
      push: !panelOpen,
      panel: true,
    })
  const close = () => (openedPanel() ? window.history.back() : setAddress({ place: null, station: null }))

  // Looked up again on every render, so an open panel follows fresh readings.
  const openPlace = network?.places.get(address.get('place') ?? '') ?? null
  const openStation = network?.stations?.get(address.get('station') ?? '') ?? null

  // The browser tab names what is open, which is also what a bookmark or shared link is called.
  const openName = (openPlace ?? openStation)?.name(lang)
  useEffect(() => {
    document.title = openName ? `${openName} · ${s.title}` : s.title
  }, [openName, s])

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
  const nearby = here && network ? network.near(here) : null
  const distance = (km: number) =>
    s.nearAway(km < 1 ? s.metres(Math.round((km * 1000) / 10) * 10) : s.kilometres(formatNumber(lang, Math.round(km * 10) / 10)))

  const pinned = network
    ? pins.ids.flatMap((id) => {
        const item = id.startsWith('place:') ? network.places.get(id.slice(6)) : network.stations?.get(id.slice(8))
        return item ? [item] : []
      })
    : []
  const fullest = network?.places.aboveRelaxed ?? []

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-center justify-between gap-3">
          <p className="font-display text-xl">{s.title}</p>
          <div className="flex shrink-0 gap-2">
            <SearchBox network={network} onSelect={select} />
            <Button variant="outline" size="icon" onClick={refresh} disabled={places.isFetching} aria-label={s.update} title={s.update}>
              <RefreshCw className={places.isFetching ? 'animate-spin' : ''} />
            </Button>
            <LanguageToggle />
            <ThemeMenu />
          </div>
        </header>

        <div className="mt-10 sm:mt-14">
          {network && !network.places.isEmpty ? (
            <Headline places={network.places} />
          ) : (
            <h1 className="max-w-3xl font-display text-4xl leading-[1.08] text-balance break-keep sm:text-5xl lg:text-6xl">
              {s.tagline}
            </h1>
          )}
        </div>

        {places.isError && !network && (
          <Alert variant="destructive" className="mt-8">
            <TriangleAlert />
            <AlertTitle>{s.loadFailedTitle}</AlertTitle>
            <AlertDescription>{s.loadFailedBody}</AlertDescription>
          </Alert>
        )}

        {places.isPending && (
          <div className="mt-6 space-y-8">
            <Skeleton className="h-[24rem] rounded-xl sm:h-[32rem] lg:h-[36rem]" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        )}

        {network?.places.isEmpty && (
          <Alert className="mt-8">
            <AlertTitle>{s.emptyTitle}</AlertTitle>
            <AlertDescription>{s.emptyBody}</AlertDescription>
          </Alert>
        )}

        {network && !network.places.isEmpty && (
          <>
            <section className="mt-8">
              <Suspense fallback={<Skeleton className="h-[24rem] rounded-xl sm:h-[32rem] lg:h-[36rem]" />}>
                <CityMap network={network} selected={openPlace ?? openStation} here={here} onSelect={select} onLocate={locate} />
              </Suspense>
            </section>

            <Tabs value={tab} onValueChange={(next) => setAddress({ tab: next === 'now' ? null : next })} className="mt-8">
              <TabsList>
                <TabsTrigger value="now">{s.tabNow}</TabsTrigger>
                <TabsTrigger value="all">{s.tabAll(network.places.places.length)}</TabsTrigger>
                <TabsTrigger value="stations">{s.tabStations}</TabsTrigger>
              </TabsList>
              <TabsContent value="now" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {nearby && (
                    <ItemList
                      title={s.nearTitle}
                      description={s.nearHint}
                      items={nearby.map((each) => each.item)}
                      note={(item) => distance(nearby.find((each) => each.item === item)?.km ?? 0)}
                      action={
                        <Button variant="ghost" size="sm" onClick={() => setHere(null)}>
                          {s.nearClear}
                        </Button>
                      }
                      onSelect={select}
                    />
                  )}
                  {pinned.length > 0 && <ItemList title={s.pinnedTitle} description={s.pinnedHint} items={pinned} onSelect={select} />}
                  {fullest.length > 0 && (
                    <NowList
                      className="md:col-span-2"
                      wide
                      title={s.fullest}
                      description={s.fullestHint}
                      places={fullest.slice(0, FULLEST)}
                      footnote={fullest.length > FULLEST ? s.fullestMore(fullest.length - FULLEST) : undefined}
                      onSelect={select}
                    />
                  )}
                  <RankedLists places={network.places} onSelect={select} />
                </div>
              </TabsContent>
              <TabsContent value="all" className="mt-4">
                <AllPlaces places={network.places.places} onSelect={select} />
              </TabsContent>
              <TabsContent value="stations" className="mt-4">
                {stations.isPending && <Skeleton className="h-96 rounded-xl" />}
                {stations.isError && (
                  <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>{s.stationsLoadFailedTitle}</AlertTitle>
                    <AlertDescription>{s.loadFailedBody}</AlertDescription>
                  </Alert>
                )}
                {network.stations && <Stations directory={network.stations} onSelect={select} />}
              </TabsContent>
            </Tabs>

            <HowItWorks />

            <p className="mt-10 text-sm text-muted-foreground">
              {s.footer} {s.stationsSource} {s.mapSource}
            </p>
          </>
        )}
      </main>

      <Suspense fallback={null}>
        <PlaceSheet
          place={openPlace}
          stations={openPlace && network ? network.stationsFor(openPlace) : []}
          onClose={close}
          onOpenStation={select}
        />
        {network?.stations && (
          <StationSheet
            station={openStation}
            directory={network.stations}
            places={openStation ? network.placesFor(openStation) : []}
            onClose={close}
            onOpenPlace={select}
          />
        )}
      </Suspense>
      <Toaster />
    </>
  )
}

export default App
