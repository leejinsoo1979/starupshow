/**
 * Proactive Engine - Zustand Store
 *
 * 능동적 에이전트 상태 관리
 * - 제안 목록 관리
 * - 자가치유 기록 관리
 * - 패턴 관리
 * - 하트비트 로그
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  ProactiveSuggestion,
  ProactivePattern,
  AgentHealingRecord,
  HeartbeatLog,
  ProactiveSettings,
  SuggestionStatus,
  HealingStatus,
  CreateSuggestionInput,
} from './types'

// ============================================================================
// Initial States
// ============================================================================

const initialSettings: ProactiveSettings = {
  heartbeatIntervalMinutes: 15,
  autoApproveHealing: false,
  suggestionExpiryHours: 48,
  maxPendingSuggestions: 20,
  enableRealtimeTriggers: true,
  enableNotifications: true,
}

// ============================================================================
// Store Interface
// ============================================================================

interface ProactiveStore {
  // State
  suggestions: ProactiveSuggestion[]
  healingRecords: AgentHealingRecord[]
  patterns: ProactivePattern[]
  recentHeartbeats: HeartbeatLog[]
  isLoading: boolean
  error: string | null
  settings: ProactiveSettings

  // Computed
  pendingSuggestionsCount: number
  pendingHealingCount: number

  // Suggestion Actions
  setSuggestions: (suggestions: ProactiveSuggestion[]) => void
  addSuggestion: (suggestion: ProactiveSuggestion) => void
  addSuggestions: (suggestions: ProactiveSuggestion[]) => void
  updateSuggestion: (id: string, updates: Partial<ProactiveSuggestion>) => void
  setSuggestionStatus: (id: string, status: SuggestionStatus) => void
  acceptSuggestion: (id: string, actionResult?: Record<string, unknown>) => void
  dismissSuggestion: (id: string) => void
  expireSuggestions: () => void
  removeSuggestion: (id: string) => void
  clearSuggestions: () => void
  getSuggestionsByAgent: (agentId: string) => ProactiveSuggestion[]
  getPendingSuggestions: () => ProactiveSuggestion[]

  // Healing Actions
  setHealingRecords: (records: AgentHealingRecord[]) => void
  addHealingRecord: (record: AgentHealingRecord) => void
  updateHealingRecord: (id: string, updates: Partial<AgentHealingRecord>) => void
  setHealingStatus: (id: string, status: HealingStatus) => void
  approveHealing: (id: string, approvedBy: string) => void
  rejectHealing: (id: string) => void
  completeHealing: (id: string, result: AgentHealingRecord['healingResult']) => void
  removeHealingRecord: (id: string) => void
  getPendingHealingRecords: () => AgentHealingRecord[]

  // Pattern Actions
  setPatterns: (patterns: ProactivePattern[]) => void
  addPattern: (pattern: ProactivePattern) => void
  updatePattern: (id: string, updates: Partial<ProactivePattern>) => void
  incrementPatternOccurrence: (id: string) => void
  deactivatePattern: (id: string) => void
  removePattern: (id: string) => void
  getActivePatterns: (agentId: string) => ProactivePattern[]

  // Heartbeat Actions
  addHeartbeatLog: (log: HeartbeatLog) => void
  clearHeartbeatLogs: () => void

  // Settings Actions
  updateSettings: (updates: Partial<ProactiveSettings>) => void

  // Utility Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void

  // Fetch Actions (API integration)
  fetchSuggestions: (agentId?: string) => Promise<void>
  fetchHealingRecords: (agentId?: string) => Promise<void>
  fetchPatterns: (agentId?: string) => Promise<void>
}

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// ============================================================================
// Store Implementation
// ============================================================================

export const useProactiveStore = create<ProactiveStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // Initial State
          suggestions: [],
          healingRecords: [],
          patterns: [],
          recentHeartbeats: [],
          isLoading: false,
          error: null,
          settings: initialSettings,

          // Computed (as getters)
          get pendingSuggestionsCount() {
            return get().suggestions.filter((s) => s.status === 'pending').length
          },

          get pendingHealingCount() {
            return get().healingRecords.filter(
              (r) => r.status === 'detected' || r.status === 'awaiting_approval'
            ).length
          },

          // ========================================================================
          // Suggestion Actions
          // ========================================================================

          setSuggestions: (suggestions: ProactiveSuggestion[]) => {
            set((state) => {
              state.suggestions = suggestions
            })
          },

          addSuggestion: (suggestion: ProactiveSuggestion) => {
            set((state) => {
              // Check max pending limit
              const pendingCount = state.suggestions.filter((s) => s.status === 'pending').length
              if (pendingCount >= state.settings.maxPendingSuggestions) {
                // Remove oldest pending suggestion
                const oldestPending = state.suggestions
                  .filter((s) => s.status === 'pending')
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
                if (oldestPending) {
                  state.suggestions = state.suggestions.filter((s) => s.id !== oldestPending.id)
                }
              }
              state.suggestions.unshift(suggestion)
            })
          },

          addSuggestions: (suggestions: ProactiveSuggestion[]) => {
            suggestions.forEach((s) => get().addSuggestion(s))
          },

          updateSuggestion: (id: string, updates: Partial<ProactiveSuggestion>) => {
            set((state) => {
              const suggestion = state.suggestions.find((s) => s.id === id)
              if (suggestion) {
                Object.assign(suggestion, updates)
              }
            })
          },

          setSuggestionStatus: (id: string, status: SuggestionStatus) => {
            set((state) => {
              const suggestion = state.suggestions.find((s) => s.id === id)
              if (suggestion) {
                suggestion.status = status
                if (status === 'delivered' && !suggestion.deliveredAt) {
                  suggestion.deliveredAt = new Date().toISOString()
                }
                if (['accepted', 'dismissed', 'executed'].includes(status) && !suggestion.respondedAt) {
                  suggestion.respondedAt = new Date().toISOString()
                }
              }
            })
          },

          acceptSuggestion: (id: string, actionResult?: Record<string, unknown>) => {
            set((state) => {
              const suggestion = state.suggestions.find((s) => s.id === id)
              if (suggestion) {
                suggestion.status = 'accepted'
                suggestion.respondedAt = new Date().toISOString()
                if (actionResult) {
                  suggestion.actionResult = actionResult
                }
              }
            })
          },

          dismissSuggestion: (id: string) => {
            get().setSuggestionStatus(id, 'dismissed')
          },

          expireSuggestions: () => {
            const now = new Date()
            set((state) => {
              state.suggestions.forEach((suggestion) => {
                if (suggestion.status === 'pending' && suggestion.expiresAt) {
                  if (new Date(suggestion.expiresAt) < now) {
                    suggestion.status = 'expired'
                  }
                }
              })
            })
          },

          removeSuggestion: (id: string) => {
            set((state) => {
              state.suggestions = state.suggestions.filter((s) => s.id !== id)
            })
          },

          clearSuggestions: () => {
            set((state) => {
              state.suggestions = []
            })
          },

          getSuggestionsByAgent: (agentId: string) => {
            return get().suggestions.filter((s) => s.agentId === agentId)
          },

          getPendingSuggestions: () => {
            return get().suggestions.filter((s) => s.status === 'pending')
          },

          // ========================================================================
          // Healing Actions
          // ========================================================================

          setHealingRecords: (records: AgentHealingRecord[]) => {
            set((state) => {
              state.healingRecords = records
            })
          },

          addHealingRecord: (record: AgentHealingRecord) => {
            set((state) => {
              state.healingRecords.unshift(record)
            })
          },

          updateHealingRecord: (id: string, updates: Partial<AgentHealingRecord>) => {
            set((state) => {
              const record = state.healingRecords.find((r) => r.id === id)
              if (record) {
                Object.assign(record, updates)
              }
            })
          },

          setHealingStatus: (id: string, status: HealingStatus) => {
            set((state) => {
              const record = state.healingRecords.find((r) => r.id === id)
              if (record) {
                record.status = status
                if (status === 'healed' || status === 'failed' || status === 'escalated') {
                  record.resolvedAt = new Date().toISOString()
                }
              }
            })
          },

          approveHealing: (id: string, approvedBy: string) => {
            set((state) => {
              const record = state.healingRecords.find((r) => r.id === id)
              if (record) {
                record.approvedBy = approvedBy
                record.approvedAt = new Date().toISOString()
                record.status = 'healing'
              }
            })
          },

          rejectHealing: (id: string) => {
            get().setHealingStatus(id, 'escalated')
          },

          completeHealing: (id: string, result: AgentHealingRecord['healingResult']) => {
            set((state) => {
              const record = state.healingRecords.find((r) => r.id === id)
              if (record) {
                record.healingResult = result
                record.status = result?.success ? 'healed' : 'failed'
                record.resolvedAt = new Date().toISOString()
              }
            })
          },

          removeHealingRecord: (id: string) => {
            set((state) => {
              state.healingRecords = state.healingRecords.filter((r) => r.id !== id)
            })
          },

          getPendingHealingRecords: () => {
            return get().healingRecords.filter(
              (r) => r.status === 'detected' || r.status === 'awaiting_approval'
            )
          },

          // ========================================================================
          // Pattern Actions
          // ========================================================================

          setPatterns: (patterns: ProactivePattern[]) => {
            set((state) => {
              state.patterns = patterns
            })
          },

          addPattern: (pattern: ProactivePattern) => {
            set((state) => {
              state.patterns.push(pattern)
            })
          },

          updatePattern: (id: string, updates: Partial<ProactivePattern>) => {
            set((state) => {
              const pattern = state.patterns.find((p) => p.id === id)
              if (pattern) {
                Object.assign(pattern, updates)
                pattern.updatedAt = new Date().toISOString()
              }
            })
          },

          incrementPatternOccurrence: (id: string) => {
            set((state) => {
              const pattern = state.patterns.find((p) => p.id === id)
              if (pattern) {
                pattern.occurrenceCount += 1
                pattern.lastOccurrenceAt = new Date().toISOString()
                // Increase confidence with more occurrences (max 95)
                pattern.confidenceScore = Math.min(95, pattern.confidenceScore + 2)
              }
            })
          },

          deactivatePattern: (id: string) => {
            set((state) => {
              const pattern = state.patterns.find((p) => p.id === id)
              if (pattern) {
                pattern.isActive = false
              }
            })
          },

          removePattern: (id: string) => {
            set((state) => {
              state.patterns = state.patterns.filter((p) => p.id !== id)
            })
          },

          getActivePatterns: (agentId: string) => {
            return get().patterns.filter((p) => p.agentId === agentId && p.isActive)
          },

          // ========================================================================
          // Heartbeat Actions
          // ========================================================================

          addHeartbeatLog: (log: HeartbeatLog) => {
            set((state) => {
              state.recentHeartbeats.unshift(log)
              // Keep only last 50 heartbeats
              if (state.recentHeartbeats.length > 50) {
                state.recentHeartbeats = state.recentHeartbeats.slice(0, 50)
              }
            })
          },

          clearHeartbeatLogs: () => {
            set((state) => {
              state.recentHeartbeats = []
            })
          },

          // ========================================================================
          // Settings Actions
          // ========================================================================

          updateSettings: (updates: Partial<ProactiveSettings>) => {
            set((state) => {
              Object.assign(state.settings, updates)
            })
          },

          // ========================================================================
          // Utility Actions
          // ========================================================================

          setLoading: (loading: boolean) => {
            set((state) => {
              state.isLoading = loading
            })
          },

          setError: (error: string | null) => {
            set((state) => {
              state.error = error
            })
          },

          reset: () => {
            set((state) => {
              state.suggestions = []
              state.healingRecords = []
              state.patterns = []
              state.recentHeartbeats = []
              state.isLoading = false
              state.error = null
            })
          },

          // ========================================================================
          // Fetch Actions (API Integration)
          // ========================================================================

          fetchSuggestions: async (agentId?: string) => {
            get().setLoading(true)
            get().setError(null)

            try {
              const params = new URLSearchParams()
              if (agentId) params.set('agentId', agentId)
              params.set('status', 'pending')

              const response = await fetch(`/api/proactive/suggestions?${params}`)
              if (!response.ok) throw new Error('Failed to fetch suggestions')

              const data = await response.json()
              get().setSuggestions(data.suggestions)
            } catch (error) {
              get().setError(error instanceof Error ? error.message : 'Failed to fetch suggestions')
            } finally {
              get().setLoading(false)
            }
          },

          fetchHealingRecords: async (agentId?: string) => {
            get().setLoading(true)
            get().setError(null)

            try {
              const params = new URLSearchParams()
              if (agentId) params.set('agentId', agentId)

              const response = await fetch(`/api/proactive/healing?${params}`)
              if (!response.ok) throw new Error('Failed to fetch healing records')

              const data = await response.json()
              get().setHealingRecords(data.records)
            } catch (error) {
              get().setError(error instanceof Error ? error.message : 'Failed to fetch healing records')
            } finally {
              get().setLoading(false)
            }
          },

          fetchPatterns: async (agentId?: string) => {
            get().setLoading(true)
            get().setError(null)

            try {
              const params = new URLSearchParams()
              if (agentId) params.set('agentId', agentId)

              const response = await fetch(`/api/proactive/patterns?${params}`)
              if (!response.ok) throw new Error('Failed to fetch patterns')

              const data = await response.json()
              get().setPatterns(data.patterns)
            } catch (error) {
              get().setError(error instanceof Error ? error.message : 'Failed to fetch patterns')
            } finally {
              get().setLoading(false)
            }
          },
        })),
        {
          name: 'proactive-store',
          partialize: (state) => ({
            settings: state.settings,
          }),
        }
      )
    ),
    { name: 'proactive-store' }
  )
)

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectSuggestions = (state: ProactiveStore) => state.suggestions
export const selectHealingRecords = (state: ProactiveStore) => state.healingRecords
export const selectPatterns = (state: ProactiveStore) => state.patterns
export const selectRecentHeartbeats = (state: ProactiveStore) => state.recentHeartbeats
export const selectIsLoading = (state: ProactiveStore) => state.isLoading
export const selectError = (state: ProactiveStore) => state.error
export const selectSettings = (state: ProactiveStore) => state.settings

export const selectPendingSuggestions = (state: ProactiveStore) => state.getPendingSuggestions()
export const selectPendingHealingRecords = (state: ProactiveStore) => state.getPendingHealingRecords()
export const selectPendingSuggestionsCount = (state: ProactiveStore) =>
  state.suggestions.filter((s) => s.status === 'pending').length
export const selectPendingHealingCount = (state: ProactiveStore) =>
  state.healingRecords.filter((r) => r.status === 'detected' || r.status === 'awaiting_approval').length
