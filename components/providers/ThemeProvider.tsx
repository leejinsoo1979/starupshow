'use client'

import { useEffect, useState } from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { useThemeStore, accentColors } from '@/stores/themeStore'

function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  const { accentColor, mode } = useThemeStore()
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync zustand theme mode with next-themes
  useEffect(() => {
    if (!mounted) return
    setTheme(mode)
  }, [mode, mounted, setTheme])

  // Apply accent color CSS variables
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const selectedAccent = accentColors.find((c) => c.id === accentColor)
    if (selectedAccent) {
      root.style.setProperty('--accent-color', selectedAccent.color)
      root.style.setProperty('--accent-color-hover', selectedAccent.hoverColor)
      root.style.setProperty('--accent-color-rgb', selectedAccent.rgb)
    }
  }, [accentColor, mounted])

  return <>{children}</>
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      storageKey="theme-mode"
    >
      <ThemeSyncProvider>
        {children}
      </ThemeSyncProvider>
    </NextThemesProvider>
  )
}
