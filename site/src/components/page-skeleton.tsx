import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/lib/i18n'

/** The size of the map, shared with the map itself so nothing jumps when it arrives. */
export const MAP_SIZE = 'h-[24rem] rounded-xl sm:h-[32rem] lg:h-[40rem]'

/** A list card's outline: a title, a hint and five rows. */
function ListSkeleton({ bars = false }: { bars?: boolean }) {
  return (
    <div className="space-y-5 rounded-xl border p-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      {Array.from({ length: 5 }, (_, row) => (
        <div key={row} className="flex gap-3">
          <Skeleton className="size-4 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4" style={{ width: `${55 - row * 6}%` }} />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-28" />
            {bars && <Skeleton className="h-1.5 rounded-full" style={{ width: `${100 - row * 14}%` }} />}
          </div>
        </div>
      ))}
    </div>
  )
}

/** The whole page in outline, shown while the first readings load. It has the page's own shape, so the real thing drops into place. */
export function PageSkeleton() {
  const { s } = useLanguage()
  return (
    <div role="status" aria-label={s.loading} className="mt-10 sm:mt-14">
      {/* the headline: when, the sentence, the detail, the strip and its key */}
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-10 w-[min(34rem,92%)] sm:h-12 lg:h-14" />
      <Skeleton className="mt-2.5 h-10 w-[min(22rem,64%)] sm:h-12 lg:h-14" />
      <Skeleton className="mt-5 h-4 w-[min(36rem,88%)]" />
      <Skeleton className="mt-6 h-2.5 rounded-full" />
      <div className="mt-3 flex flex-wrap gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>

      <Skeleton className={`mt-8 ${MAP_SIZE}`} />

      <div className="mt-8 flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ListSkeleton bars />
        <ListSkeleton />
      </div>
    </div>
  )
}

/** A table in outline, for the Stations tab while its figures load. */
export function TableSkeleton({ rows = 9 }: { rows?: number }) {
  const { s } = useLanguage()
  return (
    <div role="status" aria-label={s.loading} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-8" style={{ width: i === 0 ? '5rem' : '2.25rem' }} />
        ))}
      </div>
      <div className="rounded-xl border">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-6 border-b px-4 py-3.5 last:border-b-0">
            <Skeleton className="h-4" style={{ width: `${22 - (row % 4) * 3}%` }} />
            <Skeleton className="h-5 w-24 max-sm:hidden" />
            <Skeleton className="ml-auto h-4 w-16" />
            <Skeleton className="h-4 w-16 max-sm:hidden" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** A side panel in outline, while its code loads. */
export function PanelSkeleton() {
  const { s } = useLanguage()
  return (
    <div
      role="status"
      aria-label={s.loading}
      className="fixed inset-y-0 right-0 z-50 w-full space-y-6 border-l bg-popover p-6 shadow-lg sm:max-w-xl"
    >
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-44" />
      <Skeleton className="h-36" />
    </div>
  )
}
