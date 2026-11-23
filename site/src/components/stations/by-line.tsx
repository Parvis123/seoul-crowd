import { LineBadge } from '@/components/line-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatNumber, useLanguage } from '@/lib/i18n'
import type { Line } from '@/model/line'
import type { LineSummary } from '@/model/station'

/** Every line with its busiest station and the two after it. Choosing a line opens its full list. */
export function ByLine({ summaries, onChoose }: { summaries: LineSummary[]; onChoose: (line: Line) => void }) {
  const { lang, s } = useLanguage()
  const most = Math.max(1, summaries[0]?.topCount ?? 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{s.byLineTitle}</CardTitle>
        <CardDescription>{s.byLineHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="-mx-2">
          {summaries.map((entry) => {
            const name = entry.top.name(lang)
            const total = formatNumber(lang, entry.topCount)
            return (
              <li key={entry.line.id}>
                <button
                  type="button"
                  onClick={() => onChoose(entry.line)}
                  aria-label={s.byLineRow(entry.line.name(lang), name, total)}
                  className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:grid-cols-[11rem_minmax(0,1.4fr)_minmax(0,1fr)_6rem]"
                >
                  <span className="flex items-center gap-2 text-sm text-muted-foreground max-sm:col-span-2">
                    <LineBadge line={entry.line} named />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{name}</span>
                    {entry.next.length > 0 && (
                      <span className="block truncate text-sm text-muted-foreground">
                        {s.byLineThen(entry.next.map((station) => station.name(lang)))}
                      </span>
                    )}
                  </span>
                  <Progress
                    value={(entry.topCount / most) * 100}
                    className="h-1.5 max-sm:order-last max-sm:col-span-2 [&>[data-slot=progress-indicator]]:bg-heat"
                    aria-hidden="true"
                  />
                  <span className="text-right tabular-nums">{total}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
