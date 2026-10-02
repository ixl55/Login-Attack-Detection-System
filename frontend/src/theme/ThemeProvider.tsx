import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { readPref, writePref } from '../lib/storage'

type Theme = 'dark' | 'light'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SOC dashboards default to dark; light is an explicit choice.
  const [theme, setTheme] = useState<Theme>(() => (readPref('lads.theme') === 'light' ? 'light' : 'dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      writePref('lads.theme', next)
      return next
    })
  }, [])

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
