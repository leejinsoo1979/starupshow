/**
 * Proactive Engine
 *
 * 능동적 에이전트 시스템
 * - 제안 생성 (Suggestions)
 * - 패턴 학습 (Patterns)
 * - 자가치유 (Self-Healing)
 * - 하트비트 (Heartbeat)
 */

// Types
export * from './types'

// Store
export {
  useProactiveStore,
  selectSuggestions,
  selectHealingRecords,
  selectPatterns,
  selectRecentHeartbeats,
  selectIsLoading,
  selectError,
  selectSettings,
  selectPendingSuggestions,
  selectPendingHealingRecords,
  selectPendingSuggestionsCount,
  selectPendingHealingCount,
} from './proactive-store'

// Heartbeat Service
export {
  runHeartbeat,
  runBatchHeartbeat,
  onEvent,
  onConversationComplete,
  onTaskComplete,
  onWorkflowComplete,
} from './heartbeat-service'
