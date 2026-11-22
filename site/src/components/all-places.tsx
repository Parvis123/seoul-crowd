import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { LevelBadge } from '@/components/level-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Current } from '@/lib/data'
import { formatRange, placeNames, useLanguage } from '@/lib/i18n'

type SortKey = 'name' | 'category' | 'rank' | 'people'

export function AllPlaces({ places, onSelect }: { places: Current[]; onSelect: (place: Current) => void }) {
  const { lang, s } = useLanguage()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; down: boolean }>({ key: 'people', down: true })

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = places.filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (q === '' || p.label.toLowerCase().includes(q) || p.name.includes(q)),
    )
    const dir = sort.down ? -1 : 1
    return filtered.sort((a, b) => {
      if (sort.key === 'name')
        return placeNames(a, lang).primary.localeCompare(placeNames(b, lang).primary, lang) * dir
      if (sort.key === 'category')
        return (s.categories[a.category] ?? '').localeCompare(s.categories[b.category] ?? '', lang) * dir
      if (sort.key === 'rank') return (a.rank - b.rank || a.people - b.people) * dir
      return (a.people - b.people) * dir
    })
  }, [places, query, category, sort, lang, s])

  const header = (key: SortKey, label: string, className = '') => {
    const active = sort.key === key
    const Icon = !active ? ArrowUpDown : sort.down ? ArrowDown : ArrowUp
    return (
      <TableHead className={className} aria-sort={active ? (sort.down ? 'descending' : 'ascending') : 'none'}>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2.5"
          onClick={() => setSort({ key, down: active ? !sort.down : key === 'people' || key === 'rank' })}
        >
          {label}
          <Icon data-icon="inline-end" className={active ? '' : 'text-muted-foreground'} />
        </Button>
      </TableHead>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <InputGroup className="lg:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={s.searchPlaceholder}
            aria-label={s.searchLabel}
          />
        </InputGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={category}
          onValueChange={(value) => setCategory(value || 'all')}
          className="flex-wrap"
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
                {header('rank', s.colLevel)}
                {header('people', s.colPeople, 'pr-4 text-right [&>button]:-mr-2.5 [&>button]:ml-0')}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((place) => {
                const names = placeNames(place, lang)
                return (
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
                    <TableCell className="max-w-44 pl-4 sm:max-w-64 lg:max-w-96">
                      <div className="truncate font-medium">{names.primary}</div>
                      <div className="truncate text-muted-foreground" lang={names.secondaryLang}>
                        {names.secondary}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {s.categories[place.category] ?? ''}
                    </TableCell>
                    <TableCell>
                      <LevelBadge level={place.latest.level} />
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">{formatRange(lang, place.latest)}</TableCell>
                  </TableRow>
                )
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    {s.noMatch}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
