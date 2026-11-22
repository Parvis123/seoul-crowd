import { type Figures, SERVICE_HOURS } from '@/lib/stations'

const W = 96
const H = 24
const PAD = 3.5

/**
 * The shape of a station's day, first train to last. Each one is drawn to its
 * own height, so it shows when the station is busy, not how busy.
 * The dot marks the hour chosen on the slider.
 */
export function DaySpark({ figures, hour }: { figures: Figures; hour: number | null }) {
  const values = SERVICE_HOURS.map((h) => figures.on[h] + figures.off[h])
  const max = Math.max(1, ...values)
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (values.length - 1)
  const y = (value: number) => H - PAD - (value / max) * (H - 2 * PAD)
  const line = values.map((value, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(value).toFixed(1)}`).join('')
  const at = hour === null ? -1 : SERVICE_HOURS.indexOf(hour)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" className="text-muted-foreground">
      <path d={`${line}L${x(values.length - 1)},${H - PAD}L${x(0)},${H - PAD}Z`} fill="currentColor" opacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {at >= 0 && <circle cx={x(at)} cy={y(values[at])} r={3} fill="var(--heat)" stroke="var(--card)" strokeWidth={1.5} />}
    </svg>
  )
}
