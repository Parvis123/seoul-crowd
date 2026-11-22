import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Theme } from '@/hooks/use-theme'

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Button variant="outline" size="icon" onClick={onToggle} aria-label={`Switch to ${next} mode`}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
