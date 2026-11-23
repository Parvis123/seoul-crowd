import { useNow } from '@/hooks/use-now'
import { useLanguage } from '@/lib/i18n'
import type { PlaceDirectory } from '@/model/place'

/** After this long without a new reading, the page stops calling itself live. */
const STALE_MINUTES = 60

/** "Live 11:20 in Seoul, updated 6 min ago", with a dot that beats while the readings are fresh. */
export function LiveStamp({ places }: { places: PlaceDirectory }) {
  const { s } = useLanguage()
  const now = useNow()
  const readAt = places.readAt
  const minutes = readAt ? Math.max(0, Math.floor((now - readAt.getTime()) / 60_000)) : 0
  const fresh = minutes < STALE_MINUTES

  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground tabular-nums">
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        <span className="relative flex size-2" aria-hidden="true">
          {fresh && <span className="absolute inline-flex size-full animate-ping rounded-full bg-level-0 opacity-60 motion-reduce:hidden" />}
          <span className={`relative inline-flex size-2 rounded-full ${fresh ? 'bg-level-0' : 'bg-muted-foreground/50'}`} />
        </span>
        {fresh && s.live}
      </span>
      <span>
        {s.asOf(places.newestClock ?? '')}, {fresh ? s.updatedAgo(minutes) : s.updatedLongAgo(Math.round(minutes / 60))}
      </span>
    </p>
  )
}
