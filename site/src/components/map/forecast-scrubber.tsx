import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useLanguage } from '@/lib/i18n'
import type { PlaceDirectory } from '@/model/place'

/** How long each forecast hour stays on screen while playing. */
const HOUR_MS = 900

/**
 * Steps the map through the city's forecast: drag to an hour, or press play
 * to watch the next twelve. Step 0 is now.
 */
export function ForecastScrubber({ places, step, onStep }: { places: PlaceDirectory; step: number; onStep: (step: number) => void }) {
  const { s } = useLanguage()
  const hours = places.forecastHours
  const [playing, setPlaying] = useState(false)

  // After the last hour it rests there for one beat, then comes back to now and stops.
  const advance = useEffectEvent(() => {
    if (step >= hours) {
      setPlaying(false)
      onStep(0)
    } else onStep(step + 1)
  })
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(advance, HOUR_MS)
    return () => window.clearInterval(id)
  }, [playing])

  if (hours === 0) return null
  const label = step === 0 ? s.scrubNow : (places.clockAt(step) ?? '')

  return (
    <div className="absolute bottom-3 left-3 flex w-[min(24rem,calc(100%-4.5rem))] items-center gap-2.5 rounded-lg border bg-card/90 py-1.5 pr-3 pl-1.5 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          // Pressing play at the end starts again from now.
          if (!playing && step >= hours) onStep(0)
          setPlaying(!playing)
        }}
        aria-label={playing ? s.scrubPause : s.scrubPlay}
        title={playing ? s.scrubPause : s.scrubPlay}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Slider
        className="flex-1"
        value={[step]}
        min={0}
        max={hours}
        step={1}
        onValueChange={([next]) => {
          setPlaying(false)
          onStep(next)
        }}
        thumbLabel={s.scrubLabel}
        thumbValueText={label}
      />
      <span className="w-11 text-right text-sm font-medium tabular-nums">{label}</span>
      {step > 0 && !playing && (
        <Button variant="ghost" size="icon-sm" onClick={() => onStep(0)} aria-label={s.scrubBack} title={s.scrubBack}>
          <RotateCcw />
        </Button>
      )}
    </div>
  )
}
