/**
 * 마이뉴런 (My Neurons) Types
 * 글로우어스 전체 활동을 시각화하는 사용자 뇌 구조
 *
 * ⚠️ 중요: 마이뉴런 ≠ 뉴럴맵
 * - 마이뉴런: 사용자의 모든 GlowUS 활동을 시각화하는 뇌 맵
 * - 뉴럴맵: 에이전트용 바이브코딩 도구 (별개의 기능)
 *
 * 핵심 개념:
 * - 사용자가 글로우어스에서 하는 모든 행위가 담김
 * - 현재 생각, 병목, 고민, 우선순위를 한눈에 파악
 * - 문제 해결을 위한 인사이트 제공
 */

// ============================================
// 마이뉴런 노드 타입
// GlowUS의 모든 데이터를 뇌 노드로 변환
// ============================================

export type MyNeuronType =
  // === Core Types ===
  | 'self'        // 사용자 자신 (중앙 노드, 유일)
  | 'project'     // 프로젝트 (projects, startups)
  | 'task'        // 작업 (unified_tasks, company_tasks)
  | 'doc'         // 문서 (business_plans, project_documents)
  | 'person'      // 팀원 (team_members, employees)
  | 'agent'       // AI 에이전트 (deployed_agents)
  // === Goal & Decision ===
  | 'objective'   // 목표 (visions, objectives)
  | 'key_result'  // 핵심 결과 (key_results)
  | 'decision'    // 의사결정 (program_applications)
  // === Process & Memory ===
  | 'memory'      // 기록/이벤트 (meeting_records, chat_messages)
  | 'workflow'    // 워크플로우 (workflow_definitions)
  | 'insight'     // AI 인사이트 (match_results)
  // === Government Program ===
  | 'program'     // 정부지원사업 (government_programs)
  | 'application' // 지원서 (program_applications)
  | 'milestone'   // 마일스톤 (project_milestones)
  | 'budget'      // 예산 (project_budgets, project_expenses)

/**
 * GlowUS 테이블 → 마이뉴런 노드 타입 매핑
 */
export const GLOWUS_TO_NEURON_MAP: Record<string, MyNeuronType> = {
  // Core
  users: 'self',
  projects: 'project',
  startups: 'project',
  unified_tasks: 'task',
  company_tasks: 'task',
  business_plans: 'doc',
  project_documents: 'doc',
  project_files: 'doc',
  team_members: 'person',
  employees: 'person',
  deployed_agents: 'agent',
  // OKR
  visions: 'objective',
  objectives: 'objective',
  key_results: 'key_result',
  // Process
  meeting_records: 'memory',
  chat_messages: 'memory',
  task_activities: 'memory',
  workflow_definitions: 'workflow',
  workflow_templates: 'workflow',
  match_results: 'insight',
  // Government
  government_programs: 'program',
  program_applications: 'application',
  project_milestones: 'milestone',
  project_budgets: 'budget',
  project_expenses: 'budget',
}

// ============================================
// 노드 상태 (병목/우선순위 감지용)
// ============================================

export type NeuronStatus =
  | 'active'      // 활성: 정상 진행 중
  | 'blocked'     // 차단: 병목 발생 🚨
  | 'urgent'      // 긴급: 마감 임박 ⏰
  | 'waiting'     // 대기: 다른 작업 대기 중
  | 'completed'   // 완료: 성공적으로 완료 ✅
  | 'attention'   // 주의 필요: 체크인 지연 등 ⚠️

export type NeuronPriority = 'critical' | 'high' | 'medium' | 'low'

// ============================================
// 엣지 타입 (연결 규칙)
// ============================================

export type MyNeuronEdgeType =
  // === 계층 관계 ===
  | 'owns'          // self → project: 사용자가 프로젝트 소유
  | 'belongs_to'    // project → self: 프로젝트가 사용자에 속함
  // === 구현/실행 ===
  | 'implements'    // objective → task: 목표가 작업으로 구현
  | 'executes'      // agent → task: 에이전트가 작업 실행
  | 'produces'      // task → doc: 작업이 문서 생성
  // === 의존성 ===
  | 'depends_on'    // task → task: 작업 간 의존성
  | 'blocks'        // task → task: 차단 관계
  | 'requires'      // project → doc: 프로젝트가 문서 필요
  // === 연결 ===
  | 'assigned_to'   // task → person/agent: 작업 할당
  | 'participates'  // person → project: 팀원 참여
  | 'targets'       // application → program: 지원서가 공고 대상
  // === 인과 ===
  | 'causes'        // decision → project: 결정이 프로젝트 야기
  | 'measures'      // key_result → objective: KR이 목표 측정
  | 'records'       // memory → task: 기록이 작업 관련
  // === 정보 ===
  | 'references'    // 일반 참조
  | 'related'       // 일반 연관

/**
 * 엣지 타입별 설명 (UI용)
 */
export const EDGE_TYPE_LABELS: Record<MyNeuronEdgeType, { ko: string; en: string; description: string }> = {
  owns: { ko: '소유', en: 'Owns', description: '사용자가 프로젝트를 소유' },
  belongs_to: { ko: '소속', en: 'Belongs To', description: '프로젝트가 사용자에 소속' },
  implements: { ko: '구현', en: 'Implements', description: '목표/결정을 작업으로 구현' },
  executes: { ko: '실행', en: 'Executes', description: '에이전트가 작업 실행' },
  produces: { ko: '생성', en: 'Produces', description: '작업이 산출물 생성' },
  depends_on: { ko: '의존', en: 'Depends On', description: '선행 작업에 의존' },
  blocks: { ko: '차단', en: 'Blocks', description: '다른 작업을 차단' },
  requires: { ko: '필요', en: 'Requires', description: '문서/리소스 필요' },
  assigned_to: { ko: '할당', en: 'Assigned To', description: '담당자에게 할당' },
  participates: { ko: '참여', en: 'Participates', description: '프로젝트에 참여' },
  targets: { ko: '대상', en: 'Targets', description: '지원 대상 공고' },
  causes: { ko: '야기', en: 'Causes', description: '결과를 야기' },
  measures: { ko: '측정', en: 'Measures', description: '목표를 측정' },
  records: { ko: '기록', en: 'Records', description: '활동을 기록' },
  references: { ko: '참조', en: 'References', description: '참조 관계' },
  related: { ko: '관련', en: 'Related', description: '일반적 연관' },
}

// ============================================
// 마이뉴런 노드 인터페이스
// ============================================

export interface NodePosition {
  x: number
  y: number
  z: number
}

export interface MyNeuronNode {
  id: string
  type: MyNeuronType

  // === 기본 정보 ===
  title: string
  summary?: string
  content?: string
  tags?: string[]

  // === 상태 (병목/우선순위) ===
  status: NeuronStatus
  priority: NeuronPriority
  importance: number           // 1-10 (연결 수, 영향도 기반)

  // === 시간 정보 ===
  deadline?: string            // 마감일 (있는 경우)
  daysUntilDeadline?: number   // 마감까지 남은 일수
  lastActivityAt?: string      // 마지막 활동 시점

  // === 진행률 ===
  progress?: number            // 0-100 (작업, 목표 등)

  // === 원본 데이터 참조 ===
  sourceTable: string          // GlowUS 테이블명
  sourceId: string             // 원본 레코드 ID
  sourceData?: Record<string, unknown>  // 원본 데이터 캐시

  // === 계층/연결 ===
  parentId?: string            // 상위 노드 (프로젝트 등)
  clusterId?: string           // 클러스터 ID

  // === 시각화 ===
  color?: string               // 커스텀 색상
  position?: NodePosition
  expanded?: boolean
  pinned?: boolean

  // === 메타 (동적 데이터) ===
  meta?: Record<string, unknown>

  // === 타임스탬프 ===
  createdAt?: string
  updatedAt?: string
}

// ============================================
// 마이뉴런 엣지 인터페이스
// ============================================

export interface MyNeuronEdge {
  id: string
  source: string               // 소스 노드 ID
  target: string               // 타겟 노드 ID
  type: MyNeuronEdgeType
  weight?: number              // 0.1 ~ 1.0 (연결 강도)
  label?: string               // 엣지 라벨
  bidirectional?: boolean      // 양방향 여부
  animated?: boolean           // 애니메이션 여부 (병목/의존성)

  // === 병목 표시 ===
  isBottleneck?: boolean       // 이 연결이 병목인지

  createdAt?: string
}

// ============================================
// 병목/우선순위 감지 규칙
// ============================================

export type BottleneckCondition =
  | 'task_blocked'       // 작업이 blocked 상태
  | 'deadline_near'      // 마감 3일 이내
  | 'no_activity'        // 7일 이상 활동 없음
  | 'dependency_chain'   // 의존성 체인이 3개 이상
  | 'agent_overload'     // 에이전트에 5개 이상 작업 할당
  | 'okr_no_checkin'     // OKR 체크인 14일 이상 없음
  | 'budget_overrun'     // 예산 초과

export interface BottleneckRule {
  id: string
  name: string
  description: string
  condition: BottleneckCondition
  severity: 'critical' | 'warning' | 'info'
  threshold?: number          // 조건별 임계값
}

export const DEFAULT_BOTTLENECK_RULES: BottleneckRule[] = [
  {
    id: 'blocked-task',
    name: '차단된 작업',
    description: '작업이 차단 상태입니다',
    condition: 'task_blocked',
    severity: 'critical',
  },
  {
    id: 'deadline-urgent',
    name: '마감 임박',
    description: '마감이 3일 이내입니다',
    condition: 'deadline_near',
    threshold: 3,
    severity: 'critical',
  },
  {
    id: 'deadline-soon',
    name: '마감 주의',
    description: '마감이 7일 이내입니다',
    condition: 'deadline_near',
    threshold: 7,
    severity: 'warning',
  },
  {
    id: 'no-activity',
    name: '활동 없음',
    description: '7일 이상 활동이 없습니다',
    condition: 'no_activity',
    threshold: 7,
    severity: 'warning',
  },
  {
    id: 'dependency-chain',
    name: '의존성 체인',
    description: '3개 이상의 작업이 연쇄 대기 중입니다',
    condition: 'dependency_chain',
    threshold: 3,
    severity: 'warning',
  },
  {
    id: 'agent-overload',
    name: '에이전트 과부하',
    description: '에이전트에 5개 이상 작업이 할당되었습니다',
    condition: 'agent_overload',
    threshold: 5,
    severity: 'info',
  },
  {
    id: 'okr-checkin',
    name: 'OKR 체크인 지연',
    description: '14일 이상 OKR 체크인이 없습니다',
    condition: 'okr_no_checkin',
    threshold: 14,
    severity: 'warning',
  },
  {
    id: 'budget-overrun',
    name: '예산 초과',
    description: '예산 사용률이 100%를 초과했습니다',
    condition: 'budget_overrun',
    threshold: 100,
    severity: 'critical',
  },
]

// ============================================
// 인사이트 타입
// ============================================

export type BottleneckType = 'blocked' | 'deadline' | 'resource' | 'dependency' | 'activity' | 'overload'

export interface BottleneckInsight {
  id: string
  nodeId: string
  type: BottleneckType
  severity: 'critical' | 'warning' | 'info'
  message: string              // 메시지
  suggestion?: string          // AI 제안
  ruleId?: string
  title?: string
  description?: string
  affectedNodes?: string[]     // 영향받는 노드들
  detectedAt?: string
  createdAt?: string
}

export interface PriorityInsight {
  id: string
  type: 'priority'
  nodeId: string
  rank: number                 // 우선순위 순위 (1이 최고)
  score: number                // 점수 (높을수록 우선)
  reasons: string[]            // 우선순위가 높은 이유들
  createdAt: string
}

// ============================================
// 마이뉴런 그래프 컨테이너
// ============================================

export interface MyNeuronsGraph {
  version: string              // "1.0"
  userId: string

  // === 그래프 데이터 ===
  nodes: MyNeuronNode[]
  edges: MyNeuronEdge[]

  // === 중심 노드 ===
  selfNodeId: string           // 사용자 self 노드 ID

  // === 인사이트 ===
  bottlenecks: BottleneckInsight[]
  priorities: PriorityInsight[]

  // === 통계 ===
  stats: MyNeuronsStats

  // === 뷰 상태 ===
  viewState: ViewState

  // === 메타 ===
  lastSyncAt: string           // 마지막 동기화 시점
  createdAt: string
  updatedAt: string
}

export interface MyNeuronsStats {
  totalNodes: number
  totalEdges: number
  blockedTasks: number
  urgentItems: number
  completedToday: number
  activeProjects: number
  pendingApplications: number
}

export interface ViewState {
  expandedNodeIds: string[]
  pinnedNodeIds: string[]
  selectedNodeIds: string[]
  cameraPosition: NodePosition
  cameraTarget: NodePosition
  layoutMode: 'force' | 'radial' | 'tree'
  filterByType?: MyNeuronType[]
  filterByStatus?: NeuronStatus[]
}

// ============================================
// 노드 색상 (타입별)
// ============================================

export const NODE_COLORS: Record<MyNeuronType, string> = {
  self: '#FFD700',        // 골드 (중앙)
  project: '#10B981',     // 에메랄드
  task: '#3B82F6',        // 블루
  doc: '#6366F1',         // 인디고
  person: '#0EA5E9',      // 스카이블루
  agent: '#8B5CF6',       // 퍼플
  objective: '#F59E0B',   // 앰버
  key_result: '#F97316',  // 오렌지
  decision: '#EF4444',    // 레드
  memory: '#14B8A6',      // 틸
  workflow: '#84CC16',    // 라임
  insight: '#22D3EE',     // 시안
  program: '#EC4899',     // 핑크
  application: '#A855F7', // 바이올렛
  milestone: '#06B6D4',   // 시안
  budget: '#78716C',      // 스톤
}

// ============================================
// 상태별 색상
// ============================================

export const STATUS_COLORS: Record<NeuronStatus, string> = {
  active: '#10B981',      // 그린
  blocked: '#EF4444',     // 레드 🚨
  urgent: '#F97316',      // 오렌지 ⏰
  waiting: '#F59E0B',     // 앰버
  completed: '#6B7280',   // 그레이 ✅
  attention: '#FBBF24',   // 옐로 ⚠️
}

// ============================================
// 데이터 동기화 설정
// ============================================

export interface SyncConfig {
  /** 자동 동기화 간격 (밀리초) */
  autoSyncInterval: number
  /** 동기화할 테이블 목록 */
  tables: string[]
  /** 실시간 구독 활성화 */
  enableRealtime: boolean
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  autoSyncInterval: 60000,  // 1분
  tables: [
    'projects',
    'unified_tasks',
    'business_plans',
    'team_members',
    'deployed_agents',
    'objectives',
    'key_results',
    'government_programs',
    'program_applications',
    'project_milestones',
  ],
  enableRealtime: true,
}

// ============================================
// 클러스터 타입
// ============================================

export interface MyNeuronCluster {
  id: string
  title: string
  description?: string
  color: string
  nodeIds: string[]
  centerNodeId?: string
  createdAt: string
}

// ============================================
// 테마 타입 (뉴럴맵과 공유)
// ============================================

export interface ThemeBackground {
  gradient: [string, string]
  starsEnabled: boolean
  starsColor: string
  starsCount: number
}

export interface ThemeNode {
  colors: Record<MyNeuronType, string>
  emissiveIntensity: number
  hoverScale: number
  selectedOutlineColor: string
  selectedOutlineWidth: number
}

export interface ThemeEdge {
  defaultOpacity: number
  selectedOpacity: number
  particlesEnabled: boolean
  baseColor?: string
}

export interface ThemeUI {
  panelBackground: string
  textColor: string
  accentColor: string
  borderColor: string
}

export interface MyNeuronsTheme {
  id: string
  name: string
  background: ThemeBackground
  node: ThemeNode
  edge: ThemeEdge
  ui: ThemeUI
}

// ============================================
// 시뮬레이션 타입 (d3-force-3d)
// ============================================

export interface SimulationNode extends MyNeuronNode {
  x?: number
  y?: number
  z?: number
  vx?: number
  vy?: number
  vz?: number
  fx?: number | null
  fy?: number | null
  fz?: number | null
}

export interface SimulationLink {
  source: string | SimulationNode
  target: string | SimulationNode
  weight: number
}

// ============================================
// UI 상태 타입
// ============================================

export type RightPanelTab = 'inspector' | 'insights' | 'actions' | 'settings'

export interface PanelState {
  leftPanelWidth: number
  rightPanelWidth: number
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean
  rightPanelTab: RightPanelTab
}

export interface SearchState {
  query: string
  results: MyNeuronNode[]
  isSearching: boolean
}

// ============================================
// 팩토리 함수
// ============================================

export function createSelfNode(userId: string, userName: string): MyNeuronNode {
  const now = new Date().toISOString()
  return {
    id: `self-${userId}`,
    type: 'self',
    title: userName,
    summary: '나의 모든 활동',
    tags: [],
    status: 'active',
    priority: 'high',
    importance: 10,
    sourceTable: 'users',
    sourceId: userId,
    expanded: true,
    pinned: true,
    position: { x: 0, y: 0, z: 0 },
    createdAt: now,
    updatedAt: now,
  }
}

export function createEmptyGraph(userId: string, userName: string): MyNeuronsGraph {
  const now = new Date().toISOString()
  const selfNode = createSelfNode(userId, userName)

  return {
    version: '1.0',
    userId,
    nodes: [selfNode],
    edges: [],
    selfNodeId: selfNode.id,
    bottlenecks: [],
    priorities: [],
    stats: {
      totalNodes: 1,
      totalEdges: 0,
      blockedTasks: 0,
      urgentItems: 0,
      completedToday: 0,
      activeProjects: 0,
      pendingApplications: 0,
    },
    viewState: {
      expandedNodeIds: [selfNode.id],
      pinnedNodeIds: [selfNode.id],
      selectedNodeIds: [],
      cameraPosition: { x: 0, y: 50, z: 200 },
      cameraTarget: { x: 0, y: 0, z: 0 },
      layoutMode: 'radial',
    },
    lastSyncAt: now,
    createdAt: now,
    updatedAt: now,
  }
}
