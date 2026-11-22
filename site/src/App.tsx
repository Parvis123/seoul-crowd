import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AllPlaces } from '@/components/all-places'
import { NowList } from '@/components/now-list'
import { PlaceSheet } from '@/components/place-sheet'
import { Summary } from '@/components/summary'
import { ThemeMenu } from '@/components/theme-menu'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Current, type Weekly, byBusiest, currentPlaces, loadWeekly, newestReading } from '@/lib/data'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: Weekly }

function App() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    loadWeekly(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const data = await loadWeekly()
      setState({ status: 'ready', data })
      toast.success('Readings updated')
    } catch {
      toast.error("The readings didn't update. Try again in a minute.")
    } finally {
      setRefreshing(false)
    }
  }, [])

  const places = useMemo(() => (state.status === 'ready' ? currentPlaces(state.data.places) : []), [state])
  const ranked = useMemo(() => [...places].sort(byBusiest), [places])
  const newest = newestReading(places)
  const selectedPlace = places.find((p) => p.code === selected) ?? null
  const select = (place: Current) => setSelected(place.code)

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Seoul crowd</h1>
            <p className="mt-1 text-muted-foreground">Where it's busy and where it's quiet, right now.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={refresh}
              disabled={refreshing || state.status === 'loading'}
              aria-label="Update readings"
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Update readings</span>
            </Button>
            <ThemeMenu />
          </div>
        </header>

        {state.status === 'error' && (
          <Alert variant="destructive" className="mt-8">
            <TriangleAlert />
            <AlertTitle>The readings didn't load</AlertTitle>
            <AlertDescription>Check your connection, then reload the page.</AlertDescription>
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
            <AlertTitle>No readings yet</AlertTitle>
            <AlertDescription>They appear after the collector's next run, within 20 minutes.</AlertDescription>
          </Alert>
        )}

        {state.status === 'ready' && places.length > 0 && (
          <>
            <section className="mt-8" aria-label="Summary">
              <Summary places={places} newest={newest} />
            </section>

            <Tabs defaultValue="now" className="mt-8">
              <TabsList>
                <TabsTrigger value="now">Right now</TabsTrigger>
                <TabsTrigger value="all">All {places.length} places</TabsTrigger>
              </TabsList>
              <TabsContent value="now" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <NowList
                    title="Busiest"
                    description="By the city's crowd level, then by people"
                    places={ranked.slice(0, 5)}
                    onSelect={select}
                  />
                  <NowList
                    title="Quietest"
                    description="Bars compare each place with the busiest one right now"
                    places={ranked.slice(-5).reverse()}
                    onSelect={select}
                  />
                </div>
              </TabsContent>
              <TabsContent value="all" className="mt-4">
                <AllPlaces places={places} onSelect={select} />
              </TabsContent>
            </Tabs>

            <p className="mt-8 text-sm text-muted-foreground">
              People counts are the city's estimates from mobile phone data. Data: Seoul Open Data Plaza, Seoul
              real-time city data.
            </p>
          </>
        )}
      </main>
      <PlaceSheet place={selectedPlace} onClose={() => setSelected(null)} />
      <Toaster />
    </>
  )
}

export default App
