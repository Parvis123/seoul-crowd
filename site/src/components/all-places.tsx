import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'

import { LevelBadge } from '@/components/level-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatRange, useLanguage } from '@/lib/i18n'
import type { Place } from '@/model/place'

type SortKey = 'name' | 'category' | 'level' | 'people'

export function AllPlaces({ places, onSelect }: { places: readonly Place[]; onSelect: (place: Place) => void }) {
  const { lang, s } = useLanguage()
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; down: boolean }>({ key: 'people', down: true })

  const rows = useMemo(() => {
    const dir = sort.down ? -1 : 1
    return places
      .filter((place) => category === 'all' || place.category === category)
      .sort((a, b) => {
        if (sort.key === 'name') return a.name(lang).localeCompare(b.name(lang), lang) * dir
        if (sort.key === 'category') {
          return (s.categories[a.category] ?? '').localeCompare(s.categories[b.category] ?? '', lang) * dir
        }
        if (sort.key === 'level') return (a.level.rank - b.level.rank || a.people - b.people) * dir
        return (a.people - b.people) * dir
      })
  }, [places, category, sort, lang, s])

  const header = (key: SortKey, label: string, className = '') => {
    const active = sort.key === key
    const Icon = !active ? ArrowUpDown : sort.down ? ArrowDown : ArrowUp
    return (
      <TableHead className={className} aria-sort={active ? (sort.down ? 'descending' : 'ascending') : 'none'}>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2.5"
          onClick={() => setSort({ key, down: active ? !sort.down : key === 'people' || key === 'level' })}
        >
          {label}
          <Icon data-icon="inline-end" className={active ? '' : 'text-muted-foreground'} />
        </Button>
      </TableHead>
    )
  }

  return (
    <div className="space-y-4">
      <div className="max-sm:-mx-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:[scrollbar-width:none]">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={category}
          onValueChange={(value) => setCategory(value || 'all')}
          className="flex-wrap max-sm:flex-nowrap"
          aria-label={s.filterLabel}
        >
          <ToggleGroupItem value="all">{s.filterAll}</ToggleGroupItem>
          {Object.entries(s.categories).map(([value, label]) => (
            <ToggleGroupItem key={value} value={value}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                {header('name', s.colPlace, 'pl-4')}
                {header('category', s.colKind, 'hidden md:table-cell')}
                {header('level', s.colLevel)}
                {header('people', s.colPeople, 'pr-4 text-right [&>button]:-mr-2.5 [&>button]:ml-0')}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((place) => (
                <TableRow
                  key={place.code}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => onSelect(place)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(place)
                    }
                  }}
                >
                  <TableCell className="max-w-44 truncate py-3 pl-4 font-medium sm:max-w-64 lg:max-w-96">
                    {place.name(lang)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {s.categories[place.category] ?? ''}
                  </TableCell>
                  <TableCell>
                    <LevelBadge level={place.level} />
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{formatRange(lang, place.range)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
