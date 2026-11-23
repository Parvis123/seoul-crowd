import { NowList } from '@/components/now-list'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { setAddress, useAddress } from '@/lib/address'
import { formatPeople, formatRange, useLanguage } from '@/lib/i18n'
import { Measure } from '@/model/measure'
import { Place, type PlaceDirectory } from '@/model/place'

const SHOWN = 5

/**
 * The top and bottom of the places on one measure, chosen by the reader:
 * people, visitors, or how far from each place's own usual.
 */
export function RankedLists({ places, onSelect }: { places: PlaceDirectory; onSelect: (place: Place) => void }) {
  const { lang, s } = useLanguage()
  const address = useAddress()
  const available = Measure.all.filter((measure) => measure.covers(places.places))
  // Against usual is what "busy" means to most people, so it leads once there is enough history for it.
  const preferred = available.includes(Measure.usual) ? Measure.usual : Measure.people
  const asked = Measure.get(address.get('by'))
  const measure = asked && available.includes(asked) ? asked : preferred

  const ranked = measure.rank(places.places)
  const top = ranked.slice(0, SHOWN)
  const bottom = ranked.slice(-SHOWN).reverse()
  const value = (place: Place) => measure.of(place) ?? 0
  const percent = (fraction: number) => Math.round(fraction * 100)

  const text = {
    people: { most: s.mostPeople, mostHint: s.mostPeopleHint, least: s.fewestPeople, leastHint: s.fewestPeopleHint, bar: s.barLabel },
    visitors: { most: s.mostVisitors, mostHint: s.mostVisitorsHint, least: s.fewestVisitors, leastHint: s.fewestVisitorsHint, bar: s.visitorsBarLabel },
    usual: { most: s.busierThanUsual, mostHint: s.busierHint, least: s.quieterThanUsual, leastHint: s.quieterHint, bar: s.usualBarLabel },
  }[measure.id]

  const detail = (place: Place) => {
    if (measure === Measure.visitors) return s.visitorsDetail(formatPeople(lang, value(place)), percent(place.visitorShare ?? 0))
    if (measure === Measure.usual)
      return s.usualDetail(percent(value(place)), formatPeople(lang, place.people), formatPeople(lang, place.usual?.people ?? 0))
    return s.rangePeople(formatRange(lang, place.range))
  }
  // Each list's bars compare with that list's own extreme, so the first row is always full.
  const share = (list: Place[]) => {
    const most = Math.max(1e-9, ...list.map((place) => Math.abs(value(place))))
    return (place: Place) => Math.round((Math.abs(value(place)) / most) * 100)
  }

  return (
    <div className="md:col-span-2">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span id="rank-by" className="text-sm text-muted-foreground">
          {s.measureLabel}
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={measure.id}
          onValueChange={(id) => id && setAddress({ by: id === preferred.id ? null : id })}
          aria-labelledby="rank-by"
        >
          {Measure.all.map((each) => (
            <ToggleGroupItem key={each.id} value={each.id} disabled={!available.includes(each)} className="px-3">
              {s.measures[each.id]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {!available.includes(Measure.usual) && (
          <span className="text-sm text-muted-foreground">{s.usualLocked(places.usualDays, Place.USUAL_NEEDS_DAYS)}</span>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <NowList title={text.most} description={text.mostHint} places={top} detail={detail} share={share(top)} barLabel={text.bar} onSelect={onSelect} />
        <NowList
          title={text.least}
          description={text.leastHint}
          places={bottom}
          detail={detail}
          // "Fewest" of a head count has nothing worth a bar. "Quieter than usual" does: how far below.
          share={measure === Measure.usual ? share(bottom) : undefined}
          barLabel={text.bar}
          onSelect={onSelect}
        />
      </div>
    </div>
  )
}
