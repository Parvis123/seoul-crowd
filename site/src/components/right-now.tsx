import { ItemList } from '@/components/item-list'
import { NowList } from '@/components/now-list'
import { RankedLists } from '@/components/ranked-lists'
import { Button } from '@/components/ui/button'
import type { Nearby } from '@/hooks/use-nearby'
import { usePinned } from '@/hooks/use-pinned'
import { useLanguage } from '@/lib/i18n'
import type { Network } from '@/model/network'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

/** How many places the "fullest for their size" list shows before it says "and more". */
const FULLEST = 6

/**
 * The "Right now" tab: what is near the reader and what they pinned, when they
 * have either, then the places fullest for their size and the ranked lists.
 */
export function RightNow({ network, nearby, onSelect }: { network: Network; nearby: Nearby; onSelect: (item: Place | Station) => void }) {
  const { s } = useLanguage()
  const pinned = usePinned(network)
  const fullest = network.places.aboveRelaxed
  const near = nearby.items

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {near && (
        <ItemList
          title={s.nearTitle}
          description={s.nearHint}
          items={near.map((each) => each.item)}
          note={(item) => nearby.distance(near.find((each) => each.item === item)?.km ?? 0)}
          action={
            <Button variant="ghost" size="sm" onClick={nearby.clear}>
              {s.nearClear}
            </Button>
          }
          onSelect={onSelect}
        />
      )}
      {pinned.length > 0 && <ItemList title={s.pinnedTitle} description={s.pinnedHint} items={pinned} onSelect={onSelect} />}
      {fullest.length > 0 && (
        <NowList
          className="md:col-span-2"
          wide
          title={s.fullest}
          description={s.fullestHint}
          places={fullest.slice(0, FULLEST)}
          footnote={fullest.length > FULLEST ? s.fullestMore(fullest.length - FULLEST) : undefined}
          onSelect={onSelect}
        />
      )}
      <RankedLists places={network.places} onSelect={onSelect} />
    </div>
  )
}
