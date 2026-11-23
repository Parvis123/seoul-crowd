import { LevelStrip } from '@/components/level-strip'
import { formatPeople, useLanguage } from '@/lib/i18n'
import { CrowdLevel, type PlaceDirectory } from '@/model/place'

const NAMED = 3

/**
 * The page's answer in one sentence: how many places are crowded right now,
 * which ones, and how all of them split by crowd level.
 */
export function Headline({ places }: { places: PlaceDirectory }) {
  const { lang, s } = useLanguage()
  const crowded = places.at(CrowdLevel.crowded)
  const nearly = places.at(CrowdLevel.slightlyCrowded)
  // Name the crowded places, or failing that the ones closest to it.
  const [level, named] = crowded.length ? [CrowdLevel.crowded, crowded] : [CrowdLevel.slightlyCrowded, nearly]
  const most = places.mostPeople
  const ahead = places.crowdedAhead

  return (
    <section>
      <p className="text-sm text-muted-foreground tabular-nums">{s.asOf(places.newestClock ?? '')}</p>
      <h1 className="mt-2 max-w-3xl font-display text-4xl leading-[1.08] text-balance break-keep sm:text-5xl lg:text-6xl">
        {crowded.length ? s.headlineCrowded(crowded.length) : nearly.length ? s.headlineNearly(nearly.length) : s.headlineNone}
      </h1>
      <p className="mt-4 max-w-2xl text-pretty break-keep text-muted-foreground">
        {named.length > 0 &&
          `${s.ledeNames(
            s.levels[level.korean],
            named.slice(0, NAMED).map((place) => place.name(lang)),
            Math.max(0, named.length - NAMED),
          )} `}
        {most && s.statusTop(most.name(lang), formatPeople(lang, most.people))}
        {ahead.length > 0 &&
          ` ${s.ledeAhead(
            ahead.slice(0, 2).map(({ place, when }) => s.aheadName(place.name(lang), s.hour(when.hour))),
            Math.max(0, ahead.length - 2),
          )}`}
      </p>
      <LevelStrip places={places} className="mt-6" />
    </section>
  )
}
