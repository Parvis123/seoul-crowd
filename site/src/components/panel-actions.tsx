import { Link2, Star } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n'
import { usePins } from '@/lib/pins'

/** The two buttons at the top of a side panel: pin it, and copy a link to it. */
export function PanelActions({ id }: { id: string }) {
  const { s } = useLanguage()
  const pins = usePins()
  const pinned = pins.isPinned(id)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success(s.linkCopied)
    } catch {
      toast.error(s.linkCopyFailed)
    }
  }

  return (
    <div className="absolute top-3 right-12 flex gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => pins.toggle(id)}
        aria-pressed={pinned}
        aria-label={pinned ? s.unpin : s.pin}
        title={pinned ? s.unpin : s.pin}
      >
        <Star className={pinned ? 'fill-heat text-heat' : ''} />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={copy} aria-label={s.copyLink} title={s.copyLink}>
        <Link2 />
      </Button>
    </div>
  )
}
