import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Team {
  id: string
  name: string
  description: string
  industry: string
  teamSize: string
  createdAt: string
  memberCount: number
}

interface TeamStore {
  teams: Team[]
  addTeam: (team: Omit<Team, 'id' | 'createdAt' | 'memberCount'>) => Team
  removeTeam: (id: string) => void
  updateTeam: (id: string, data: Partial<Team>) => void
  incrementMemberCount: (id: string) => void
  decrementMemberCount: (id: string) => void
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
      teams: [],

      addTeam: (teamData) => {
        const newTeam: Team = {
          ...teamData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          memberCount: 0,
        }
        set((state) => ({
          teams: [...state.teams, newTeam],
        }))
        return newTeam
      },

      removeTeam: (id) => {
        set((state) => ({
          teams: state.teams.filter((team) => team.id !== id),
        }))
      },

      updateTeam: (id, data) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id ? { ...team, ...data } : team
          ),
        }))
      },

      incrementMemberCount: (id) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id ? { ...team, memberCount: team.memberCount + 1 } : team
          ),
        }))
      },

      decrementMemberCount: (id) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id ? { ...team, memberCount: Math.max(0, team.memberCount - 1) } : team
          ),
        }))
      },
    }),
    {
      name: 'team-storage',
    }
  )
)
