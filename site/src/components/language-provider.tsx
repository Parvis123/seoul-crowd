import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { setAddress } from '@/lib/address'
import { type Lang, LanguageContext, STRINGS } from '@/lib/i18n'

function initial(): Lang {
  // A link can ask for a language: ?lang=ko
  const asked = new URLSearchParams(window.location.search).get('lang')
  if (asked === 'en' || asked === 'ko') return asked
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
        // Once someone picks a language, links they copy carry it.
        setAddress({ lang: next })
        setLangState(next)
      },
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
