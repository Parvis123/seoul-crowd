import { LevelStrip } from '@/components/level-strip'
import { LiveStamp } from '@/components/live-stamp'
import { formatPeople, useLanguage } from '@/lib/i18n'
import { CrowdLevel, type PlaceDirectory } from '@/model/place'

const NAMED = 3
export const HEADLINE = 'max-w-3xl font-display text-4xl leading-[1.08] text-balance break-keep sm:text-5xl lg:text-6xl'

/**
 * The page's answer in one sentence: how many places are crowded right now,
 * which ones, and how all of them split by crowd level. With a step, the same
 * for the city's forecast that many hours ahead.
 */
export function Headline({ places, step = 0 }: { places: PlaceDirectory; step?: number }) {
  const { lang, s } = useLanguage()
  const crowded = places.at(CrowdLevel.crowded, step)
  const nearly = places.at(CrowdLevel.slightlyCrowded, step)
  // Name the crowded places, or failing that the ones closest to it.
  const [level, named] = crowded.length ? [CrowdLevel.crowded, crowded] : [CrowdLevel.slightlyCrowded, nearly]
  const names =
    named.length > 0 &&
    s.ledeNames(
      s.levels[level.korean],
      named.slice(0, NAMED).map((place) => place.name(lang)),
      Math.max(0, named.length - NAMED),
    )
  const most = places.mostPeople
  const ahead = places.crowdedAhead
  const clock = places.clockAt(step) ?? ''

  return (
    <section>
      {step === 0 ? <LiveStamp places={places} /> : <p className="text-sm font-medium tabular-nums">{s.asOfForecast(clock)}</p>}
      <h1 className={`mt-2 ${HEADLINE}`}>
        {step > 0
          ? s.headlineForecast(crowded.length, clock)
          : crowded.length
            ? s.headlineCrowded(crowded.length)
            : nearly.length
              ? s.headlineNearly(nearly.length)
              : s.headlineNone}
      </h1>
      {/* A fixed floor on the height, so the map below does not jump as the forecast plays. */}
      <p className="mt-4 min-h-[3lh] max-w-2xl text-pretty break-keep text-muted-foreground sm:min-h-[2lh]">
        {names && `${names} `}
        {step === 0 && most && s.statusTop(most.name(lang), formatPeople(lang, most.people))}
        {step === 0 &&
          ahead.length > 0 &&
          ` ${s.ledeAhead(
            ahead.slice(0, 2).map(({ place, when }) => s.aheadName(place.name(lang), s.hour(when.hour))),
            Math.max(0, ahead.length - 2),
          )}`}
      </p>
      <LevelStrip places={places} step={step} className="mt-6" />
    </section>
  )
}
