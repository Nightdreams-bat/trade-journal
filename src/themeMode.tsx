// Light/dark theme preference. Local to this machine; failure to read/write
// storage is non-fatal — it just falls back to the light default.
// Lives in a context (rather than a bare hook) because the chart color
// palette (src/colors.ts) needs to be shared reactively by every chart
// component whenever the theme flips, not just the toggle button.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { LIGHT_COLORS, DARK_COLORS, type ColorPalette } from './colors'

export type ThemeMode = 'light' | 'dark'

const KEY = 'tj:theme'

function getStoredTheme(): ThemeMode {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function setStoredTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // private mode / storage disabled — the choice just won't persist
  }
}

interface ThemeContextValue {
  mode: ThemeMode
  toggle: () => void
  colors: ColorPalette
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getStoredTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
    setStoredTheme(mode)
  }, [mode])

  const toggle = () => setMode((m) => (m === 'light' ? 'dark' : 'light'))
  const colors = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS

  return <ThemeContext.Provider value={{ mode, toggle, colors }}>{children}</ThemeContext.Provider>
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode / useColors must be used within <ThemeProvider>')
  return ctx
}

export function useThemeMode(): [ThemeMode, () => void] {
  const { mode, toggle } = useThemeContext()
  return [mode, toggle]
}

export function useColors(): ColorPalette {
  return useThemeContext().colors
}
