import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type Lang, useLanguage } from '@/lib/i18n'

export function LanguageToggle() {
  const { lang, setLang, s } = useLanguage()
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={lang}
      onValueChange={(value) => value && setLang(value as Lang)}
      aria-label={s.language}
    >
      <ToggleGroupItem value="en" lang="en" aria-label="English" className="px-2.5">
        EN
      </ToggleGroupItem>
      <ToggleGroupItem value="ko" lang="ko" aria-label="한국어" className="px-2.5">
        <span className="sm:hidden">한</span>
        <span className="hidden sm:inline">한국어</span>
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
