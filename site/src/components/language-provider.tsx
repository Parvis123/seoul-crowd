import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { type Lang, LanguageContext, STRINGS } from '@/lib/i18n'

function initial(): Lang {
  try {
    const stored = localStorage.getItem('lang')
    if (stored === 'en' || stored === 'ko') return stored
  } catch {
    // Storage can be blocked. Fall through to the browser's language.
  }
  return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = STRINGS[lang].title
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      s: STRINGS[lang],
      setLang: (next: Lang) => {
        try {
          localStorage.setItem('lang', next)
        } catch {
          // The choice still applies for this visit.
        }
        setLangState(next)
      },
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
