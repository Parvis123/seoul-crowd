import { useEffect, useState } from 'react'

import { NowList } from '@/components/now-list'
import { ThemeToggle } from '@/components/theme-toggle'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/hooks/use-theme'
import { loadWeekly, newestReading, rankNow, type Weekly } from '@/lib/data'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: Weekly }

function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

function App() {
  const { theme, toggle } = useTheme()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    loadWeekly(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [])

  const ranked = state.status === 'ready' ? rankNow(state.data.places) : []
  const newest = state.status === 'ready' ? newestReading(state.data.places) : null

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seoul crowd</h1>
          <p className="mt-1 text-muted-foreground">
            Where it's busy and where it's quiet, across {ranked.length || 121} places in Seoul.
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggle} />
      </header>

      <section className="mt-8" aria-label="Right now">
        {state.status === 'error' && (
          <p className="rounded-lg border p-4">
            The readings didn't load. Check your connection and reload the page.
          </p>
        )}

        {state.status === 'loading' && (
          <div className="grid gap-4 md:grid-cols-2">
            <LoadingCard />
            <LoadingCard />
          </div>
        )}

        {state.status === 'ready' && ranked.length === 0 && (
          <p className="rounded-lg border p-4">
            There are no readings yet. They appear after the collector's next run.
          </p>
        )}

        {state.status === 'ready' && ranked.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <NowList
                title="Busiest right now"
                description="Estimated people in the area"
                places={ranked.slice(0, 5)}
              />
              <NowList
                title="Quietest right now"
                description="Estimated people in the area"
                places={ranked.slice(-5).reverse()}
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Last reading {newest} Seoul time. Ranked by the city's crowd level, then by number of
              people. Data: Seoul Open Data Plaza, Seoul real-time city data.
            </p>
          </>
        )}
      </section>
    </main>
  )
}

export default App
