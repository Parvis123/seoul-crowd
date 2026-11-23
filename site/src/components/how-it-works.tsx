import { useLanguage } from '@/lib/i18n'

const REPOSITORY = 'https://github.com/Parvis123/seoul-crowd'

/** A plain account of where the numbers come from and what they leave out. */
export function HowItWorks() {
  const { s } = useLanguage()
  return (
    <section aria-labelledby="how-title" className="mt-16 border-t pt-10">
      <h2 id="how-title" className="font-display text-3xl">
        {s.howTitle}
      </h2>
      <dl className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
        {s.how.map((part) => (
          <div key={part.title}>
            <dt className="font-medium">{part.title}</dt>
            <dd className="mt-1.5 text-pretty break-keep text-muted-foreground">{part.body}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-7">
        <a
          href={REPOSITORY}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
        >
          {s.howCode}
        </a>
      </p>
    </section>
  )
}
