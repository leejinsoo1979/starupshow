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

// Pattern Analyzer
export {
  analyzePatterns,
  getActivePatterns,
  onMemorySaved,
  onLearningCreated,
} from './pattern-analyzer'

// Suggestion Generator
export {
  generateFromPattern,
  generateReversePrompt,
  generateRelationshipNudge,
  generateErrorAlert,
  generateSkillSuggestion,
  generateBatchSuggestions,
} from './suggestion-generator'

// Trigger Evaluator
export {
  evaluateTriggers,
  evaluateTaskCompletion,
  evaluateWorkflowCompletion,
  evaluateScheduledTriggers,
} from './trigger-evaluator'

// Self-Healing
export {
  // Diagnosis
  diagnose,
  diagnosePotentialIssues,
  determineIssueType,
  determineSeverity,
  // Healing Actions
  HEALING_ACTION_REGISTRY,
  createRetryAction,
  createRefreshConnectionAction,
  createClearCacheAction,
  createResetStateAction,
  createUseFallbackAction,
  createNotifyAdminAction,
  createAutoRestartAction,
  validateHealingAction,
  canExecuteWithoutApproval,
  prioritizeActions,
  // Healing Executor
  startHealingSession,
  approveHealingSession,
  rejectHealingSession,
  quickHeal,
  getHealingStatus,
  getActiveHealingSessions,
} from './self-healing'

// Realtime Subscription
export {
  subscribeToProactiveEvents,
  unsubscribeFromProactiveEvents,
  createProactiveSubscriptionEffect,
  type ProactiveRealtimeCallbacks,
  type ProactiveSubscription,
} from './realtime-subscription'
