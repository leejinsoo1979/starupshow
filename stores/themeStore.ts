import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

export type AccentColor =
  | 'blue'
  | 'purple'
  | 'green'
  | 'orange'
  | 'pink'
  | 'cyan'
  | 'red'
  | 'yellow'

export const accentColors: { id: AccentColor; name: string; color: string; hoverColor: string; rgb: string }[] = [
  { id: 'blue', name: '블루', color: '#3b82f6', hoverColor: '#2563eb', rgb: '59, 130, 246' },
  { id: 'purple', name: '퍼플', color: '#8b5cf6', hoverColor: '#7c3aed', rgb: '139, 92, 246' },
  { id: 'green', name: '그린', color: '#22c55e', hoverColor: '#16a34a', rgb: '34, 197, 94' },
  { id: 'orange', name: '오렌지', color: '#f97316', hoverColor: '#ea580c', rgb: '249, 115, 22' },
  { id: 'pink', name: '핑크', color: '#ec4899', hoverColor: '#db2777', rgb: '236, 72, 153' },
  { id: 'cyan', name: '시안', color: '#06b6d4', hoverColor: '#0891b2', rgb: '6, 182, 212' },
  { id: 'red', name: '레드', color: '#ef4444', hoverColor: '#dc2626', rgb: '239, 68, 68' },
  { id: 'yellow', name: '옐로우', color: '#eab308', hoverColor: '#ca8a04', rgb: '234, 179, 8' },
]

interface ThemeState {
  mode: ThemeMode
  accentColor: AccentColor
  themeColor: AccentColor // alias for backwards compatibility
  setMode: (mode: ThemeMode) => void
  setAccentColor: (color: AccentColor) => void
  toggleMode: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      accentColor: 'blue',
      themeColor: 'blue', // alias for backwards compatibility
      setMode: (mode) => set({ mode }),
      setAccentColor: (accentColor) => set({ accentColor, themeColor: accentColor }),
      toggleMode: () => {
        const currentMode = get().mode
        const newMode = currentMode === 'dark' ? 'light' : 'dark'
        set({ mode: newMode })
      },
    }),
    {
      name: 'theme-storage',
    }
  )
)
