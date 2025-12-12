import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Startup, Team } from '@/types'

interface AuthState {
  user: User | null
  currentStartup: Startup | null
  currentTeam: Team | null
  isLoading: boolean
  setUser: (user: User | null) => void
  updateUser: (updates: Partial<User>) => void
  setCurrentStartup: (startup: Startup | null) => void
  setCurrentTeam: (team: Team | null) => void
  setIsLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      currentStartup: null,
      currentTeam: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      setCurrentStartup: (startup) => set({ currentStartup: startup }),
      setCurrentTeam: (team) => set({ currentTeam: team }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      logout: () => set({ user: null, currentStartup: null, currentTeam: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ currentStartup: state.currentStartup, currentTeam: state.currentTeam }),
    }
  )
)
