import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type Column = {
  id: string
  value: number
  axis: string // the label under the column, or '' for none
  text: string // what the column says on hover, on focus and to a screen reader
  /** A background class for this column. Left out, the tallest column is picked out and the rest are grey. */
  tone?: string
}

/**
 * A small column chart with the tallest column picked out, for "when is it busiest".
 * Pass `peakValue` to print the tallest column's figure above it.
 */
export function Columns({ items, label, peakValue }: { items: Column[]; label: string; peakValue?: string }) {
  const max = Math.max(1, ...items.map((item) => item.value))
  const peak = items.reduce((best, item) => (item.value > best.value ? item : best), items[0])
  return (
    <TooltipProvider delayDuration={80}>
      <div role="group" aria-label={label}>
        <div className="flex h-28 items-end gap-0.5 border-b border-border pt-5">
          {items.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={item.text}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center focus-visible:outline-none"
                >
                  <span
                    className={`relative w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-ring ${
                      item.tone ?? (item === peak ? 'bg-heat' : 'bg-muted-foreground/30')
                    }`}
                    style={{ height: `${Math.max(1.5, (item.value / max) * 100)}%` }}
                  >
                    {item === peak && peakValue && (
                      <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-medium whitespace-nowrap text-foreground">
                        {peakValue}
                      </span>
                    )}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{item.text}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="mt-1 flex gap-0.5 text-[11px] text-muted-foreground tabular-nums" aria-hidden="true">
          {items.map((item) => (
            <span key={item.id} className="flex min-w-0 flex-1 justify-center">
              <span className="shrink-0 whitespace-nowrap">{item.axis}</span>
            </span>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
