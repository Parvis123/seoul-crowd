import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { usePlaces } from '@/api/queries'
import { LanguageToggle } from '@/components/language-toggle'
import { SearchBox } from '@/components/search-box'
import { ThemeMenu } from '@/components/theme-menu'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n'
import type { Network } from '@/model/network'
import type { Place } from '@/model/place'
import type { Station } from '@/model/station'

/** The top bar: the site's name, search, refresh, language and theme. */
export function SiteHeader({ network, onSelect }: { network: Network | null; onSelect: (item: Place | Station) => void }) {
  const { s } = useLanguage()
  const places = usePlaces()

  const refresh = async () => {
    const result = await places.refetch()
    if (result.isSuccess) toast.success(s.updated)
    else toast.error(s.updateFailed)
  }

  return (
    <header className="flex items-center justify-between gap-3">
      <p className="font-display text-xl">{s.title}</p>
      <div className="flex shrink-0 gap-2">
        <SearchBox network={network} onSelect={onSelect} />
        <Button variant="outline" size="icon" onClick={refresh} disabled={places.isFetching} aria-label={s.update} title={s.update}>
          <RefreshCw className={places.isFetching ? 'animate-spin' : ''} />
        </Button>
        <LanguageToggle />
        <ThemeMenu />
      </div>
    </header>
  )
}
