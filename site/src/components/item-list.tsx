import type { ReactNode } from 'react'

import { LevelBadge } from '@/components/level-badge'
import { LineBadge } from '@/components/line-badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber, formatRange, useLanguage } from '@/lib/i18n'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

type Item = Place | Station

/** A short list that mixes places and stations, such as the reader's pins or what is near them. */
export function ItemList({
  title,
  description,
  items,
  note,
  action,
  onSelect,
}: {
  title: string
  description: string
  items: Item[]
  /** Extra words for a row, such as how far away it is. */
  note?: (item: Item) => string
  /** A button for the card's top corner. */
  action?: ReactNode
  onSelect: (item: Item) => void
}) {
  const { lang, s } = useLanguage()
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>
        <ul className="-mx-2 gap-x-6 md:columns-2">
          {items.map((item) => (
            <li key={item.id} className="break-inside-avoid">
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="block w-full cursor-pointer rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{item.name(lang)}</span>
                  {item.kind === 'place' ? (
                    <LevelBadge level={item.level} />
                  ) : (
                    <span className="flex shrink-0 gap-1">
                      {item.lines.map((line) => (
                        <LineBadge key={line.id} line={line} />
                      ))}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground tabular-nums">
                  {item.kind === 'place'
                    ? s.rangePeople(formatRange(lang, item.range))
                    : s.inAndOutPerDay(formatNumber(lang, item.ridership.total()))}
                  {note && ` · ${note(item)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
