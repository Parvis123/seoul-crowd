import { TriangleAlert } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'

import { useNetwork, usePlaces, useStations } from '@/api/queries'
import { AllPlaces } from '@/components/all-places'
import { HEADLINE, Headline } from '@/components/headline'
import { HowItWorks } from '@/components/how-it-works'
import { MAP_SIZE, PageSkeleton, TableSkeleton } from '@/components/page-skeleton'
import { Panels } from '@/components/panels'
import { RightNow } from '@/components/right-now'
import { SiteHeader } from '@/components/site-header'
import { Stations } from '@/components/stations'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNearby } from '@/hooks/use-nearby'
import { useSelection } from '@/hooks/use-selection'
import { useLanguage } from '@/lib/i18n'

// The map library is large, so it loads on its own after the page appears.
const CityMap = lazy(() => import('@/components/map/city-map').then((module) => ({ default: module.CityMap })))

/**
 * The page. It only arranges the parts: the data comes from the query hooks,
 * what is open from `useSelection`, and each section is its own component.
 */
function App() {
  const { s } = useLanguage()
  const places = usePlaces()
  const stations = useStations()
  const network = useNetwork()
  const open = useSelection(network)
  const nearby = useNearby(network)
  // How many hours into the city's forecast the map and headline are showing. 0 is now.
  const [step, setStep] = useState(0)
  const ready = network && !network.places.isEmpty ? network : null

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <SiteHeader network={network} onSelect={open.select} />

        {places.isPending && <PageSkeleton />}

        {places.isError && !network && (
          <>
            <h1 className={`mt-10 sm:mt-14 ${HEADLINE}`}>{s.tagline}</h1>
            <Alert variant="destructive" className="mt-8">
              <TriangleAlert />
              <AlertTitle>{s.loadFailedTitle}</AlertTitle>
              <AlertDescription>{s.loadFailedBody}</AlertDescription>
            </Alert>
          </>
        )}

        {network?.places.isEmpty && (
          <>
            <h1 className={`mt-10 sm:mt-14 ${HEADLINE}`}>{s.tagline}</h1>
            <Alert className="mt-8">
              <AlertTitle>{s.emptyTitle}</AlertTitle>
              <AlertDescription>{s.emptyBody}</AlertDescription>
            </Alert>
          </>
        )}

        {ready && (
          <div className="animate-in duration-500 fade-in">
            <div className="mt-10 sm:mt-14">
              <Headline places={ready.places} step={step} />
            </div>

            <section className="mt-8">
              <Suspense fallback={<Skeleton className={MAP_SIZE} />}>
                <CityMap
                  network={ready}
                  selected={open.item}
                  here={nearby.here}
                  step={step}
                  onStep={setStep}
                  onSelect={open.select}
                  onLocate={nearby.locate}
                />
              </Suspense>
            </section>

            <Tabs value={open.tab} onValueChange={open.setTab} className="mt-8">
              <TabsList>
                <TabsTrigger value="now">{s.tabNow}</TabsTrigger>
                <TabsTrigger value="all">{s.tabAll(ready.places.places.length)}</TabsTrigger>
                <TabsTrigger value="stations">{s.tabStations}</TabsTrigger>
              </TabsList>
              <TabsContent value="now" className="mt-4">
                <RightNow network={ready} nearby={nearby} onSelect={open.select} />
              </TabsContent>
              <TabsContent value="all" className="mt-4">
                <AllPlaces places={ready.places.places} onSelect={open.select} />
              </TabsContent>
              <TabsContent value="stations" className="mt-4">
                {stations.isPending && <TableSkeleton />}
                {stations.isError && (
                  <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>{s.stationsLoadFailedTitle}</AlertTitle>
                    <AlertDescription>{s.loadFailedBody}</AlertDescription>
                  </Alert>
                )}
                {ready.stations && <Stations directory={ready.stations} onSelect={open.select} />}
              </TabsContent>
            </Tabs>

            <HowItWorks />

            <p className="mt-10 text-sm text-muted-foreground">
              {s.footer} {s.stationsSource} {s.mapSource}
            </p>
          </div>
        )}
      </main>

      <Panels network={network} place={open.place} station={open.station} onClose={open.close} onSelect={open.select} />
      <Toaster />
    </>
  )
}

export default App
