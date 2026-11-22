import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { toast } from 'sonner'

import { useNetwork, usePlaces, useStations } from '@/api/queries'
import { AllPlaces } from '@/components/all-places'
import { LanguageToggle } from '@/components/language-toggle'
import { NowList } from '@/components/now-list'
import { PlaceSheet } from '@/components/place-sheet'
import { SearchBox } from '@/components/search-box'
import { StationSheet } from '@/components/station-sheet'
import { Stations } from '@/components/stations'
import { ThemeMenu } from '@/components/theme-menu'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPeople, useLanguage } from '@/lib/i18n'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

// The map library is large, so it loads on its own after the page appears.
const CityMap = lazy(() => import('@/components/map/city-map').then((module) => ({ default: module.CityMap })))

/** What the side panel is showing. Only one thing is open at a time. */
type Selection = { kind: 'place'; code: string } | { kind: 'station'; key: string } | null

function App() {
  const { lang, s } = useLanguage()
  const places = usePlaces()
  const stations = useStations()
  const network = useNetwork()
  const [selection, setSelection] = useState<Selection>(null)

  const refresh = async () => {
    const result = await places.refetch()
    if (result.isSuccess) toast.success(s.updated)
    else toast.error(s.updateFailed)
  }

  const select = (item: Place | Station) =>
    setSelection(item.kind === 'place' ? { kind: 'place', code: item.code } : { kind: 'station', key: item.key })
  const close = () => setSelection(null)

  // Looked up again on every render, so an open panel follows fresh readings.
  const openPlace = selection?.kind === 'place' ? (network?.places.get(selection.code) ?? null) : null
  const openStation = selection?.kind === 'station' ? (network?.stations?.get(selection.key) ?? null) : null
  const ranked = network?.places.ranked ?? []

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h1>
            <div className="flex shrink-0 gap-2">
              <SearchBox network={network} onSelect={select} />
              <Button variant="outline" size="icon" onClick={refresh} disabled={places.isFetching} aria-label={s.update} title={s.update}>
                <RefreshCw className={places.isFetching ? 'animate-spin' : ''} />
              </Button>
              <LanguageToggle />
              <ThemeMenu />
            </div>
          </div>
          <p className="mt-1 text-muted-foreground">
            {network && !network.places.isEmpty
              ? `${s.statusLine(network.places.newestClock ?? '', network.places.crowdedCount, network.places.places.length)} ${
                  network.places.mostPeople
                    ? s.statusTop(network.places.mostPeople.name(lang), formatPeople(lang, network.places.mostPeople.people))
                    : ''
                }`
              : s.tagline}
          </p>
        </header>

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
            <section className="mt-6">
              <Suspense fallback={<Skeleton className="h-[24rem] rounded-xl sm:h-[32rem] lg:h-[36rem]" />}>
                <CityMap network={network} selected={openPlace ?? openStation} onSelect={select} />
              </Suspense>
            </section>

            <Tabs defaultValue="now" className="mt-8">
              <TabsList>
                <TabsTrigger value="now">{s.tabNow}</TabsTrigger>
                <TabsTrigger value="all">{s.tabAll(network.places.places.length)}</TabsTrigger>
                <TabsTrigger value="stations">{s.tabStations}</TabsTrigger>
              </TabsList>
              <TabsContent value="now" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <NowList
                    title={s.busiest}
                    description={s.busiestHint}
                    places={ranked.slice(0, 5)}
                    share={(place) => network.places.share(place)}
                    onSelect={select}
                  />
                  <NowList
                    title={s.quietest}
                    description={s.quietestHint}
                    places={ranked.slice(-5).reverse()}
                    share={(place) => network.places.share(place)}
                    onSelect={select}
                  />
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

            <p className="mt-8 text-sm text-muted-foreground">
              {s.footer} {s.stationsSource} {s.mapSource}
            </p>
          </>
        )}
      </main>

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
      <Toaster />
    </>
  )
}

export default App
