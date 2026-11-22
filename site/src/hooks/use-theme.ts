import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

function stored(): Theme | null {
  try {
    const value = localStorage.getItem('theme')
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function system(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Follows the visitor's system setting until they pick a theme themselves.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? system())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (!stored()) setTheme(system())
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Private browsing can block storage. The choice still applies for this visit.
    }
    setTheme(next)
  }

  return { theme, toggle }
}
