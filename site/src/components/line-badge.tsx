import { useLanguage } from '@/lib/i18n'
import type { Line } from '@/model/line'

/**
 * A line's mark in the operator's own colour: the number for lines 1 to 9,
 * a plain disc for the named lines. Pass `named` to write the name beside it.
 */
export function LineBadge({ line, named = false }: { line: Line; named?: boolean }) {
  const { lang } = useLanguage()
  const name = line.name(lang)
  const disc = (
    <span
      // The name is either written beside the disc or given as its label.
      {...(named ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name, title: name })}
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] leading-none font-semibold ring-1 ring-white/20 ring-inset"
      style={{ background: line.color, color: line.ink }}
    >
      {line.digit}
    </span>
  )
  if (!named) return disc
  return (
    <span className="inline-flex items-center gap-1.5">
      {disc}
      <span>{name}</span>
    </span>
  )
}
