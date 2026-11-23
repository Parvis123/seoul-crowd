import { ArrowLeftRight, CircleDot, ExternalLink, Footprints, LocateFixed, MapPin } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { useCrowding } from '@/api/queries'
import { LineBadge } from '@/components/line-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Directions as DirectionsState } from '@/hooks/use-journey'
import { useLanguage } from '@/lib/i18n'
import { TrainCrowding } from '@/model/crowding'
import type { Ride } from '@/model/journey'
import type { Network } from '@/model/network'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

/** One step of the route: an icon in a rail down the left, and what to do. */
function Step({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  )
}

/**
 * How to get to the open place or station by subway: pick a start, then read
 * the rides and changes with an estimated time. Links hand over to a map app
 * for the exact door-to-door trip.
 */
export function Directions({
  network,
  target,
  directions,
  here,
  onLocate,
}: {
  network: Network
  target: Place | Station
  directions: DirectionsState
  /** True once the reader's position is known. */
  here: boolean
  onLocate: () => void
}) {
  const { lang, s } = useLanguage()
  const crowding = useCrowding()
  const [text, setText] = useState('')
  const { from, journey } = directions
  const matches = text.trim() ? network.search(text, 5).stations.filter((station) => station !== target) : []
  const nameOf = (station: Station | null, fallback: string) => station?.name(lang) ?? fallback

  // Somewhere a map app can aim for: the station itself, or the station a place is named after.
  const spot = target.kind === 'station' ? target.location : network.locationOf(target)
  const label = encodeURIComponent(target.name('ko'))
  const kakao = spot ? `https://map.kakao.com/link/to/${label},${spot.lat},${spot.lng}` : `https://map.kakao.com/link/search/${label}`
  const google = `https://www.google.com/maps/dir/?api=1&destination=${spot ? `${spot.lat},${spot.lng}` : label}&travelmode=transit`

  const heading = (ride: Ride) => {
    if (ride.toward) return s.routeToward(network.stations?.stopName(ride.line, ride.toward, lang) ?? ride.toward)
    return ride.forward ? s.routeInner : s.routeOuter
  }
  // How full that train usually is at this hour, where Seoul Metro's figures cover it.
  const fullNow = (ride: Ride) =>
    crowding && ride.from ? crowding.at(ride.line, ride.from, ride.forward ? 'on' : 'back', TrainCrowding.today(), crowding.slotAt()) : null

  const reachable = target.kind === 'station' || network.stationsFor(target).length > 0
  const first = journey?.rides[0]
  const last = journey?.rides.at(-1)

  return (
    <section className="space-y-3">
      <h3 className="font-medium">{s.routeTitle}</h3>

      {reachable && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={from === 'here' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              if (!here) onLocate()
              directions.setFrom('here')
            }}
          >
            <LocateFixed />
            {s.routeFromHere}
          </Button>
          <div className="relative min-w-40 flex-1">
            <Input
              value={from && from !== 'here' ? from.name(lang) : text}
              onChange={(event) => {
                if (from) directions.setFrom(null)
                setText(event.target.value)
              }}
              placeholder={s.routeFromStation}
              aria-label={s.routeSearch}
              className="h-8"
            />
            {matches.length > 0 && !from && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border bg-popover p-1 shadow-md">
                {matches.map((station) => (
                  <li key={station.key}>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      onClick={() => {
                        directions.setFrom(station)
                        setText('')
                      }}
                    >
                      <span className="truncate">{station.name(lang)}</span>
                      <span className="flex shrink-0 gap-1">
                        {station.lines.map((line) => (
                          <LineBadge key={line.id} line={line} />
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {from && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                directions.setFrom(null)
                setText('')
              }}
            >
              {s.routeClear}
            </Button>
          )}
        </div>
      )}

      {!reachable && <p className="text-sm text-muted-foreground">{s.routeNoStation}</p>}
      {reachable && !from && <p className="text-sm text-muted-foreground">{s.routeAsk}</p>}
      {reachable && from && directions.origin && !journey && <p className="text-sm text-muted-foreground">{s.routeNone}</p>}
      {journey && journey.legs.length === 0 && journey.walkBefore === 0 && <p className="text-sm text-muted-foreground">{s.routeSame}</p>}

      {journey && first && last && (
        <div className="rounded-lg border p-4">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-display text-3xl">{s.routeTotal(journey.minutes)}</span>
            <span className="text-sm text-muted-foreground">{s.routeChanges(journey.changes)}</span>
          </p>
          <ol className="mt-4 space-y-3 text-sm">
            {journey.walkBefore > 0 && <Step icon={<Footprints />}>{s.routeWalk(Math.round(journey.walkBefore), nameOf(first.from, first.fromName))}</Step>}
            {journey.walkBefore === 0 && <Step icon={<CircleDot />}>{s.routeBoard(nameOf(first.from, first.fromName))}</Step>}
            {journey.legs.map((leg, index) =>
              leg.kind === 'change' ? (
                <Step key={index} icon={<ArrowLeftRight />}>
                  {s.routeChange(nameOf(leg.at, leg.name), Math.round(leg.minutes))}
                </Step>
              ) : (
                <Step key={index} icon={<LineBadge line={leg.line} />}>
                  <p className="font-medium">
                    {leg.line.name(lang)}, {heading(leg)}
                  </p>
                  <p className="text-muted-foreground tabular-nums">{s.routeRide(leg.stops, Math.round(leg.minutes))}</p>
                  {fullNow(leg) !== null && <p className="text-muted-foreground tabular-nums">{s.routeFullNow(Math.round(fullNow(leg) as number))}</p>}
                </Step>
              ),
            )}
            <Step icon={<MapPin />}>{s.routeArrive(nameOf(last.to, last.toName))}</Step>
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">{s.routeHint}</p>
        </div>
      )}

      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {[
          [kakao, s.routeKakao],
          [google, s.routeGoogle],
        ].map(([href, text]) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground [&>svg]:size-3.5"
          >
            {text}
            <ExternalLink aria-hidden="true" />
          </a>
        ))}
      </p>
    </section>
  )
}
