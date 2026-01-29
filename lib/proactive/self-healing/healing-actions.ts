/**
 * Self-Healing - Healing Actions
 *
 * 치유 액션 정의 및 레지스트리
 * - 액션 타입별 구현
 * - 액션 파라미터 검증
 * - 리스크 레벨 관리
 */

import type { HealingAction, HealingActionType } from '../types'

// ============================================================================
// Action Registry
// ============================================================================

/**
 * 액션 타입별 메타데이터
 */
export const HEALING_ACTION_REGISTRY: Record<
  HealingActionType,
  {
    name: string
    nameKr: string
    description: string
    descriptionKr: string
    defaultRiskLevel: HealingAction['riskLevel']
    requiresApproval: boolean
    estimatedDurationMs: number
  }
> = {
  retry_with_backoff: {
    name: 'Retry with Backoff',
    nameKr: '백오프 재시도',
    description: 'Retry the failed operation with exponential backoff',
    descriptionKr: '지수 백오프를 사용하여 실패한 작업 재시도',
    defaultRiskLevel: 'safe',
    requiresApproval: false,
    estimatedDurationMs: 30000,
  },
  refresh_connection: {
    name: 'Refresh Connection',
    nameKr: '연결 새로고침',
    description: 'Refresh the connection to external service',
    descriptionKr: '외부 서비스 연결 새로고침',
    defaultRiskLevel: 'safe',
    requiresApproval: false,
    estimatedDurationMs: 5000,
  },
  clear_cache: {
    name: 'Clear Cache',
    nameKr: '캐시 클리어',
    description: 'Clear cached data to free resources',
    descriptionKr: '리소스 확보를 위해 캐시 데이터 삭제',
    defaultRiskLevel: 'safe',
    requiresApproval: false,
    estimatedDurationMs: 3000,
  },
  reset_state: {
    name: 'Reset State',
    nameKr: '상태 리셋',
    description: 'Reset the agent state to a clean state',
    descriptionKr: '에이전트 상태를 깨끗한 상태로 리셋',
    defaultRiskLevel: 'medium',
    requiresApproval: true,
    estimatedDurationMs: 5000,
  },
  use_fallback: {
    name: 'Use Fallback',
    nameKr: '폴백 사용',
    description: 'Switch to fallback service or method',
    descriptionKr: '폴백 서비스 또는 방법으로 전환',
    defaultRiskLevel: 'low',
    requiresApproval: false,
    estimatedDurationMs: 2000,
  },
  notify_admin: {
    name: 'Notify Admin',
    nameKr: '관리자 알림',
    description: 'Send notification to administrator',
    descriptionKr: '관리자에게 알림 전송',
    defaultRiskLevel: 'safe',
    requiresApproval: false,
    estimatedDurationMs: 1000,
  },
  auto_restart: {
    name: 'Auto Restart',
    nameKr: '자동 재시작',
    description: 'Gracefully restart the agent process',
    descriptionKr: '에이전트 프로세스 안전 재시작',
    defaultRiskLevel: 'medium',
    requiresApproval: true,
    estimatedDurationMs: 15000,
  },
  custom: {
    name: 'Custom Action',
    nameKr: '커스텀 액션',
    description: 'Execute a custom healing action',
    descriptionKr: '커스텀 치유 액션 실행',
    defaultRiskLevel: 'medium',
    requiresApproval: true,
    estimatedDurationMs: 30000,
  },
}

// ============================================================================
// Action Builders
// ============================================================================

/**
 * 재시도 액션 생성
 */
export function createRetryAction(params?: {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
}): HealingAction {
  return {
    type: 'retry_with_backoff',
    params: {
      maxRetries: params?.maxRetries ?? 3,
      initialDelayMs: params?.initialDelayMs ?? 1000,
      maxDelayMs: params?.maxDelayMs ?? 30000,
    },
    description: `Retry up to ${params?.maxRetries ?? 3} times with backoff`,
    descriptionKr: `최대 ${params?.maxRetries ?? 3}회 백오프 재시도`,
    estimatedDurationMs: (params?.maxRetries ?? 3) * (params?.initialDelayMs ?? 1000) * 2,
    riskLevel: 'safe',
  }
}

/**
 * 연결 새로고침 액션 생성
 */
export function createRefreshConnectionAction(target: string): HealingAction {
  return {
    type: 'refresh_connection',
    params: { target },
    description: `Refresh connection to ${target}`,
    descriptionKr: `${target} 연결 새로고침`,
    estimatedDurationMs: 5000,
    riskLevel: 'safe',
  }
}

/**
 * 캐시 클리어 액션 생성
 */
export function createClearCacheAction(target: string = 'all', aggressive: boolean = false): HealingAction {
  return {
    type: 'clear_cache',
    params: { target, aggressive },
    description: aggressive ? `Aggressively clear ${target} cache` : `Clear ${target} cache`,
    descriptionKr: aggressive ? `${target} 캐시 적극적 정리` : `${target} 캐시 정리`,
    estimatedDurationMs: aggressive ? 5000 : 2000,
    riskLevel: aggressive ? 'low' : 'safe',
  }
}

/**
 * 상태 리셋 액션 생성
 */
export function createResetStateAction(scope: 'current_task' | 'agent' | 'all'): HealingAction {
  const riskLevels: Record<string, HealingAction['riskLevel']> = {
    current_task: 'low',
    agent: 'medium',
    all: 'high',
  }

  return {
    type: 'reset_state',
    params: { scope },
    description: `Reset ${scope} state`,
    descriptionKr: `${scope === 'current_task' ? '현재 태스크' : scope === 'agent' ? '에이전트' : '전체'} 상태 리셋`,
    estimatedDurationMs: scope === 'all' ? 10000 : 3000,
    riskLevel: riskLevels[scope] || 'medium',
  }
}

/**
 * 폴백 사용 액션 생성
 */
export function createUseFallbackAction(fallbackProvider: string): HealingAction {
  return {
    type: 'use_fallback',
    params: { fallbackProvider },
    description: `Switch to ${fallbackProvider} as fallback`,
    descriptionKr: `${fallbackProvider}을(를) 폴백으로 사용`,
    estimatedDurationMs: 2000,
    riskLevel: 'low',
  }
}

/**
 * 관리자 알림 액션 생성
 */
export function createNotifyAdminAction(severity: 'low' | 'medium' | 'high' | 'critical'): HealingAction {
  return {
    type: 'notify_admin',
    params: { severity },
    description: `Notify administrator (severity: ${severity})`,
    descriptionKr: `관리자에게 알림 (심각도: ${severity})`,
    estimatedDurationMs: 1000,
    riskLevel: 'safe',
  }
}

/**
 * 자동 재시작 액션 생성
 */
export function createAutoRestartAction(graceful: boolean = true): HealingAction {
  return {
    type: 'auto_restart',
    params: { graceful },
    description: graceful ? 'Gracefully restart agent' : 'Force restart agent',
    descriptionKr: graceful ? '에이전트 안전 재시작' : '에이전트 강제 재시작',
    estimatedDurationMs: graceful ? 15000 : 5000,
    riskLevel: graceful ? 'medium' : 'high',
  }
}

// ============================================================================
// Action Validation
// ============================================================================

/**
 * 액션 파라미터 검증
 */
export function validateHealingAction(action: HealingAction): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 타입 체크
  if (!action.type || !HEALING_ACTION_REGISTRY[action.type]) {
    errors.push(`Invalid action type: ${action.type}`)
  }

  // 파라미터 타입별 검증
  const params = action.params as any
  switch (action.type) {
    case 'retry_with_backoff':
      if (params?.maxRetries && (params.maxRetries < 1 || params.maxRetries > 10)) {
        errors.push('maxRetries must be between 1 and 10')
      }
      break

    case 'reset_state':
      if (!['current_task', 'agent', 'all'].includes(params?.scope as string)) {
        errors.push('scope must be one of: current_task, agent, all')
      }
      break

    case 'notify_admin':
      if (!['low', 'medium', 'high', 'critical'].includes(params?.severity as string)) {
        errors.push('severity must be one of: low, medium, high, critical')
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 액션 실행 가능 여부 확인
 */
export function canExecuteWithoutApproval(action: HealingAction): boolean {
  const registry = HEALING_ACTION_REGISTRY[action.type]
  if (!registry) return false

  // 레지스트리 기본값 체크
  if (registry.requiresApproval) return false

  // 리스크 레벨 체크
  if (action.riskLevel === 'high') return false

  return true
}

// ============================================================================
// Action Prioritization
// ============================================================================

/**
 * 액션 우선순위 결정
 */
export function prioritizeActions(actions: HealingAction[]): HealingAction[] {
  const priorityMap: Record<HealingActionType, number> = {
    notify_admin: 0, // 알림은 항상 가능
    clear_cache: 1, // 안전한 캐시 클리어
    refresh_connection: 2, // 연결 새로고침
    use_fallback: 3, // 폴백 사용
    retry_with_backoff: 4, // 재시도
    reset_state: 5, // 상태 리셋
    auto_restart: 6, // 재시작
    custom: 7, // 커스텀 (가장 마지막)
  }

  return [...actions].sort((a, b) => {
    // 리스크 레벨이 낮은 것 먼저
    const riskOrder: Record<string, number> = { safe: 0, low: 1, medium: 2, high: 3 }
    const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
    if (riskDiff !== 0) return riskDiff

    // 같은 리스크면 타입 우선순위로
    return priorityMap[a.type] - priorityMap[b.type]
  })
}
