import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { LevelBadge } from '@/components/level-badge'
import { LineBadge } from '@/components/line-badge'
import { Button } from '@/components/ui/button'
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { formatNumber, formatRange, useLanguage } from '@/lib/i18n'
import type { Network } from '@/model/network'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * One search for everything on the page. It opens from the header, with "/",
 * or with Cmd or Ctrl and K, and choosing a result opens that place or station.
 */
export function SearchBox({ network, onSelect }: { network: Network | null; onSelect: (item: Place | Station) => void }) {
  const { lang, s } = useLanguage()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const slash = event.key === '/' && !isTyping(event.target)
      const commandK = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)
      if (!slash && !commandK) return
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const typed = text.trim() !== ''
  const results = useMemo(
    () => (network && typed ? network.search(text) : { places: network?.places.byPeople.slice(0, 5) ?? [], stations: [] }),
    [network, text, typed],
  )

  const choose = (item: Place | Station) => {
    setOpen(false)
    setText('')
    onSelect(item)
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label={s.searchOpen}
        className="justify-start gap-2 font-normal text-muted-foreground max-sm:size-8 max-sm:justify-center max-sm:px-0 sm:w-64"
      >
        <Search />
        <span className="max-sm:hidden">{s.searchOpen}</span>
        <kbd className="ml-auto rounded border px-1.5 font-sans text-xs max-sm:hidden">/</kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title={s.searchOpen} description={s.searchHint} className="sm:max-w-lg">
        <Command shouldFilter={false}>
          <CommandInput value={text} onValueChange={setText} placeholder={s.searchOpen} />
          <CommandList className="max-h-[min(26rem,60vh)]">
            {typed && <CommandEmpty>{s.searchEmpty}</CommandEmpty>}
            {results.places.length > 0 && (
              <CommandGroup heading={typed ? s.searchPlaces : s.searchBusiest}>
                {results.places.map((place) => (
                  <CommandItem key={place.code} value={`place:${place.code}`} onSelect={() => choose(place)}>
                    <span className="min-w-0 flex-1 truncate">{place.name(lang)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums max-sm:hidden">
                      {s.rangePeople(formatRange(lang, place.range))}
                    </span>
                    <LevelBadge level={place.level} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.stations.length > 0 && (
              <CommandGroup heading={s.searchStations}>
                {results.stations.map((station) => (
                  <CommandItem key={station.key} value={`station:${station.key}`} onSelect={() => choose(station)}>
                    <span className="min-w-0 truncate">{station.name(lang)}</span>
                    <span className="flex shrink-0 gap-1">
                      {station.lines.map((line) => (
                        <LineBadge key={line.id} line={line} />
                      ))}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                      {s.inAndOutPerDay(formatNumber(lang, station.ridership.total()))}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!typed && <p className="px-3 pt-1 pb-3 text-xs text-muted-foreground">{s.searchHint}</p>}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
