import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/lib/i18n'

const ITEM = 'gap-2.5 py-2 pl-2.5'

export function ThemeMenu() {
  const { theme, setTheme } = useTheme()
  const { s } = useLanguage()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={s.themeChoose}>
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-44 p-1.5">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light" className={ITEM}>
            <Sun /> {s.themeLight}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className={ITEM}>
            <Moon /> {s.themeDark}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className={ITEM}>
            <Monitor /> {s.themeSystem}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
