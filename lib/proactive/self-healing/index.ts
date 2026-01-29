/**
 * Self-Healing Module
 *
 * 에이전트 자가치유 시스템
 * - 문제 진단
 * - 치유 액션
 * - 실행 및 HITL 승인
 */

// Diagnosis Engine
export {
  diagnose,
  diagnosePotentialIssues,
  determineIssueType,
  determineSeverity,
} from './diagnosis-engine'

// Healing Actions
export {
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
} from './healing-actions'

// Healing Executor
export {
  startHealingSession,
  approveHealingSession,
  rejectHealingSession,
  quickHeal,
  getHealingStatus,
  getActiveHealingSessions,
  type ExecutionResult,
  type HealingSession,
} from './healing-executor'
