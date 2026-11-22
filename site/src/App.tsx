import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useNetwork, usePlaces, useStations } from '@/api/queries'
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
import { useLanguage } from '@/lib/i18n'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

/** What the side panel is showing. Only one thing is open at a time. */
type Selection = { kind: 'place'; code: string } | { kind: 'station'; key: string } | null

function App() {
  const { s } = useLanguage()
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
              <Button variant="outline" onClick={refresh} disabled={places.isFetching} aria-label={s.update}>
                <RefreshCw className={places.isFetching ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{s.update}</span>
              </Button>
              <LanguageToggle />
              <ThemeMenu />
            </div>
          </div>
          <p className="mt-1 text-muted-foreground">{s.tagline}</p>
        </header>

        {places.isError && !network && (
          <Alert variant="destructive" className="mt-8">
            <TriangleAlert />
            <AlertTitle>{s.loadFailedTitle}</AlertTitle>
            <AlertDescription>{s.loadFailedBody}</AlertDescription>
          </Alert>
        )}

        {places.isPending && (
          <div className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
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
              <Summary places={network.places} />
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
              {s.footer} {s.stationsSource}
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
