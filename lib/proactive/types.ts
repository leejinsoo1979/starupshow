/**
 * Proactive Engine - Type Definitions
 *
 * 능동적 에이전트 시스템의 핵심 타입 정의
 * - 제안 생성 (Suggestions)
 * - 패턴 학습 (Patterns)
 * - 자가치유 (Self-Healing)
 * - 하트비트 (Heartbeat)
 */

// ============================================================================
// Suggestion Types (능동적 제안)
// ============================================================================

export type SuggestionType =
  | 'task_reminder'        // 반복 작업 리마인더
  | 'proactive_offer'      // 선제적 제안 ("이거 해드릴까요?")
  | 'relationship_nudge'   // 관계 유지 알림 ("5일간 대화 없음")
  | 'skill_suggestion'     // 스킬 추천 ("이 도구가 도움될 것 같아요")
  | 'self_improvement'     // 자기 개선 ("성공률 하락, 검토 필요")
  | 'error_alert'          // 에러 알림
  | 'insight_share'        // 인사이트 공유 ("새로 배운 것")

export type SuggestionPriority = 'low' | 'medium' | 'high' | 'urgent'

export type SuggestionStatus =
  | 'pending'              // 대기 중
  | 'delivered'            // 전달됨
  | 'accepted'             // 수락됨
  | 'dismissed'            // 무시됨
  | 'expired'              // 만료됨
  | 'executed'             // 실행됨

export interface SuggestedAction {
  type: 'create_task' | 'send_message' | 'run_workflow' | 'open_document' | 'schedule_meeting' | 'custom'
  params: Record<string, unknown>
  label: string            // UI 표시용 ("태스크 생성하기")
  labelKr: string          // 한글 레이블
}

export interface ProactiveSuggestion {
  id: string
  agentId: string
  userId?: string

  // 제안 내용
  suggestionType: SuggestionType
  title: string
  titleKr: string
  message: string
  messageKr: string
  context: Record<string, unknown>

  // 출처
  sourcePatternId?: string
  sourceMemoryIds: string[]
  sourceLearningIds: string[]

  // 우선순위 & 타이밍
  priority: SuggestionPriority
  scheduledAt?: string     // ISO date
  expiresAt?: string       // ISO date

  // 상태
  status: SuggestionStatus
  confidenceScore: number  // 0-100

  // 액션
  suggestedAction?: SuggestedAction
  actionResult?: Record<string, unknown>

  // 메타
  metadata: Record<string, unknown>
  createdAt: string
  deliveredAt?: string
  respondedAt?: string
}

export interface CreateSuggestionInput {
  agentId: string
  userId?: string
  suggestionType: SuggestionType
  title: string
  titleKr: string
  message: string
  messageKr: string
  context?: Record<string, unknown>
  sourcePatternId?: string
  sourceMemoryIds?: string[]
  sourceLearningIds?: string[]
  priority?: SuggestionPriority
  scheduledAt?: string
  expiresAt?: string
  suggestedAction?: SuggestedAction
  confidenceScore?: number
}

// ============================================================================
// Pattern Types (패턴 학습)
// ============================================================================

export type PatternType =
  | 'recurring_task'        // 반복 작업 ("매주 월요일 리포트")
  | 'time_preference'       // 시간 선호 ("오전에 활동")
  | 'user_behavior'         // 사용자 행동 ("데이터 기반 결정 선호")
  | 'error_pattern'         // 에러 패턴 ("API X가 자주 실패")
  | 'relationship_milestone'// 관계 마일스톤 ("100번째 대화")
  | 'skill_gap'             // 스킬 갭 ("이 영역 경험 부족")

export type TriggerType = 'time_based' | 'event_based' | 'threshold_based' | 'compound'

export interface PatternCondition {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'exists' | 'not_exists'
  value: unknown
}

export interface PatternDetectionRules {
  trigger: TriggerType
  schedule?: string         // cron expression for time_based
  event?: string            // event name for event_based
  threshold?: {
    metric: string
    operator: 'gt' | 'gte' | 'lt' | 'lte'
    value: number
  }
  conditions: PatternCondition[]
  cooldownMinutes?: number  // 재발동 쿨다운
}

export interface ProactivePattern {
  id: string
  agentId: string

  // 패턴 정의
  patternType: PatternType
  patternName: string
  patternNameKr: string
  patternDescription?: string
  patternDescriptionKr?: string

  // 탐지 규칙
  detectionRules: PatternDetectionRules

  // 통계
  occurrenceCount: number
  lastOccurrenceAt?: string
  confidenceScore: number   // 0-100

  // 상태
  isActive: boolean

  createdAt: string
  updatedAt: string
}

export interface CreatePatternInput {
  agentId: string
  patternType: PatternType
  patternName: string
  patternNameKr: string
  patternDescription?: string
  patternDescriptionKr?: string
  detectionRules: PatternDetectionRules
  confidenceScore?: number
}

// ============================================================================
// Self-Healing Types (자가치유)
// ============================================================================

export type IssueType =
  | 'workflow_failure'           // 워크플로우 실패
  | 'api_connection_error'       // API 연결 에러
  | 'knowledge_base_corruption'  // 지식베이스 손상
  | 'state_stuck'                // 상태 멈춤
  | 'performance_degradation'    // 성능 저하
  | 'memory_overflow'            // 메모리 초과

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'

export type HealingStatus =
  | 'detected'              // 감지됨
  | 'diagnosing'            // 진단 중
  | 'awaiting_approval'     // 승인 대기
  | 'healing'               // 치유 중
  | 'healed'                // 치유됨
  | 'failed'                // 실패
  | 'escalated'             // 상위로 에스컬레이션

export type HealingActionType =
  | 'retry_with_backoff'    // 지수 백오프 재시도
  | 'refresh_connection'    // 연결 새로고침
  | 'clear_cache'           // 캐시 클리어
  | 'reset_state'           // 상태 리셋
  | 'use_fallback'          // 폴백 사용
  | 'notify_admin'          // 관리자 알림
  | 'auto_restart'          // 자동 재시작
  | 'custom'                // 커스텀 액션

export interface HealingAction {
  type: HealingActionType
  params: Record<string, unknown>
  description: string
  descriptionKr: string
  estimatedDurationMs?: number
  riskLevel: 'safe' | 'low' | 'medium' | 'high'
}

export interface Diagnosis {
  rootCause: string
  rootCauseKr: string
  affectedComponents: string[]
  suggestedActions: HealingAction[]
  confidence: number        // 0-100
  analyzedAt: string
}

export interface AgentHealingRecord {
  id: string
  agentId: string

  // 이슈
  issueType: IssueType
  issueDescription: string
  issueDescriptionKr: string
  issueSeverity: IssueSeverity

  // 진단
  diagnosis?: Diagnosis

  // 치유 액션
  healingAction?: HealingAction
  requiresApproval: boolean
  approvedBy?: string
  approvedAt?: string

  // 상태
  status: HealingStatus

  // 결과
  healingResult?: {
    success: boolean
    message: string
    durationMs: number
    retryCount: number
  }

  createdAt: string
  resolvedAt?: string
}

export interface CreateHealingRecordInput {
  agentId: string
  issueType: IssueType
  issueDescription: string
  issueDescriptionKr: string
  issueSeverity: IssueSeverity
  diagnosis?: Diagnosis
  requiresApproval?: boolean
}

/**
 * 진단 결과 (healing-executor에서 사용)
 */
export interface DiagnosisResult {
  issueType: IssueType
  severity: IssueSeverity
  description: string
  descriptionKr: string
  recommendedActions: HealingAction[]
  rootCause?: string
  rootCauseKr?: string
  affectedComponents?: string[]
  confidence: number
  analyzedAt: string
}

// ============================================================================
// Heartbeat Types (하트비트)
// ============================================================================

export type HeartbeatType = 'scheduled' | 'event_triggered' | 'realtime'

export interface HeartbeatResult {
  agentId: string
  heartbeatType: HeartbeatType

  // 결과
  patternsDetected: number
  suggestionsGenerated: number
  issuesDetected: number

  // 스냅샷
  statsSnapshot?: {
    trustScore: number
    successRate: number
    totalInteractions: number
    level: number
  }

  // 성능
  durationMs: number
  startedAt: string
  completedAt: string
}

export interface HeartbeatLog {
  id: string
  agentId: string
  heartbeatType: HeartbeatType
  patternsDetected: number
  suggestionsGenerated: number
  issuesDetected: number
  statsSnapshot?: Record<string, unknown>
  durationMs: number
  createdAt: string
}

// ============================================================================
// Trigger Types (트리거)
// ============================================================================

export type TriggerEventType =
  | 'conversation_complete'
  | 'meeting_complete'  // 🆕 회의 완료
  | 'task_complete'
  | 'task_failed'
  | 'workflow_complete'
  | 'workflow_failed'
  | 'memory_saved'
  | 'learning_created'
  | 'relationship_updated'
  | 'scheduled_heartbeat'
  | 'manual_trigger'

export interface TriggerContext {
  agentId: string
  userId?: string
  eventType: TriggerEventType
  eventData?: Record<string, unknown>
  memoryIds?: string[]
  taskId?: string
  workflowId?: string
  timestamp: string
}

export interface TriggerEvaluationResult {
  shouldGenerateSuggestion: boolean
  matchedPatterns: ProactivePattern[]
  suggestionsToCreate: CreateSuggestionInput[]
  healingNeeded: boolean
  healingInput?: CreateHealingRecordInput
}

// ============================================================================
// Store Types (상태 관리)
// ============================================================================

export interface ProactiveState {
  // 제안 목록
  suggestions: ProactiveSuggestion[]
  pendingSuggestionsCount: number

  // 치유 기록
  healingRecords: AgentHealingRecord[]
  pendingHealingCount: number

  // 패턴
  patterns: ProactivePattern[]

  // 하트비트 로그
  recentHeartbeats: HeartbeatLog[]

  // UI 상태
  isLoading: boolean
  error: string | null

  // 설정
  settings: ProactiveSettings
}

export interface ProactiveSettings {
  heartbeatIntervalMinutes: number
  autoApproveHealing: boolean
  suggestionExpiryHours: number
  maxPendingSuggestions: number
  enableRealtimeTriggers: boolean
  enableNotifications: boolean
}

// ============================================================================
// API Types
// ============================================================================

export interface GetSuggestionsRequest {
  agentId?: string
  userId?: string
  status?: SuggestionStatus
  limit?: number
  offset?: number
}

export interface GetSuggestionsResponse {
  suggestions: ProactiveSuggestion[]
  total: number
  hasMore: boolean
}

export interface AcceptSuggestionRequest {
  suggestionId: string
  executeAction?: boolean
}

export interface AcceptSuggestionResponse {
  success: boolean
  actionResult?: Record<string, unknown>
  error?: string
}

export interface TriggerHeartbeatRequest {
  agentId: string
  heartbeatType: HeartbeatType
}

export interface TriggerHeartbeatResponse {
  success: boolean
  result: HeartbeatResult
  error?: string
}

export interface ApproveHealingRequest {
  healingRecordId: string
  approved: boolean
  comment?: string
}

export interface ApproveHealingResponse {
  success: boolean
  healingResult?: AgentHealingRecord['healingResult']
  error?: string
}
