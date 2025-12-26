/**
 * Schema Flow Simulation Types
 * 프로덕션 레벨 데이터 흐름 시뮬레이션 타입 정의
 */

// 시뮬레이션 모드
export type SimulationMode = 'fk-flow' | 'crud' | 'sequential'

// CRUD 작업 타입
export type CrudOperation = 'create' | 'read' | 'update' | 'delete'

// 시뮬레이션 상태
export type SimulationState = 'idle' | 'playing' | 'paused' | 'completed'

// 시뮬레이션 스텝 정의
export interface SimulationStep {
  id: string
  type: 'node' | 'edge' | 'multi'
  // 하이라이트할 노드 ID들
  nodeIds: string[]
  // 하이라이트할 엣지 ID들
  edgeIds: string[]
  // 스텝 설명 (UI에 표시)
  description: string
  // 스텝 지속 시간 (ms) - speed 조절에 영향받음
  duration: number
  // 추가 메타데이터
  metadata?: {
    operation?: CrudOperation
    tableName?: string
    columnName?: string
    direction?: 'forward' | 'backward'
  }
}

// FK 관계 시뮬레이션 설정
export interface FKFlowConfig {
  // 시작 테이블 (선택 안하면 첫 번째 테이블)
  startTableId?: string
  // 양방향 탐색 여부
  bidirectional: boolean
  // 관계 깊이 제한 (-1: 무제한)
  maxDepth: number
}

// CRUD 시나리오 설정
export interface CrudScenarioConfig {
  // 작업 대상 테이블
  targetTableId: string
  // CRUD 작업 종류
  operation: CrudOperation
  // 연관 테이블 포함 여부
  includeRelated: boolean
  // 캐스케이드 효과 표시
  showCascade: boolean
}

// 순차 하이라이트 설정
export interface SequentialConfig {
  // 테이블 순서 (비어있으면 자동 정렬)
  tableOrder?: string[]
  // 컬럼도 개별 하이라이트
  includeColumns: boolean
  // 정렬 기준
  sortBy: 'name' | 'connections' | 'custom'
}

// 시뮬레이션 전체 설정
export interface SimulationConfig {
  mode: SimulationMode
  // 재생 속도 (0.5x ~ 3x)
  speed: number
  // 반복 재생
  loop: boolean
  // 모드별 설정
  fkFlow?: FKFlowConfig
  crud?: CrudScenarioConfig
  sequential?: SequentialConfig
}

// 시뮬레이션 컨텍스트 상태
export interface SimulationContextState {
  // 현재 상태
  state: SimulationState
  // 현재 설정
  config: SimulationConfig
  // 전체 스텝 목록
  steps: SimulationStep[]
  // 현재 스텝 인덱스
  currentStepIndex: number
  // 현재 활성화된 노드 ID들 (현재 스텝)
  activeNodeIds: Set<string>
  // 현재 활성화된 엣지 ID들 (현재 스텝)
  activeEdgeIds: Set<string>
  // 지금까지 방문한 노드 ID들 (시뮬레이션 시작 이후 누적)
  visitedNodeIds: Set<string>
  // 지금까지 방문한 엣지 ID들 (시뮬레이션 시작 이후 누적)
  visitedEdgeIds: Set<string>
  // 진행률 (0-100)
  progress: number
}

// 시뮬레이션 액션
export interface SimulationActions {
  // 재생 시작
  play: () => void
  // 일시 정지
  pause: () => void
  // 정지 및 리셋
  stop: () => void
  // 다음 스텝
  nextStep: () => void
  // 이전 스텝
  prevStep: () => void
  // 특정 스텝으로 이동
  goToStep: (index: number) => void
  // 속도 변경
  setSpeed: (speed: number) => void
  // 반복 토글
  toggleLoop: () => void
  // 모드 변경
  setMode: (mode: SimulationMode) => void
  // 설정 업데이트
  updateConfig: (config: Partial<SimulationConfig>) => void
  // 시뮬레이션 생성 (스텝 계산)
  generateSteps: () => void
}

// 훅 반환 타입
export interface UseSchemaSimulationReturn extends SimulationContextState, SimulationActions {}

// 노드/엣지 스타일링을 위한 상태
export interface SimulationVisualState {
  nodeId: string
  isActive: boolean
  isPast: boolean
  isFuture: boolean
  glowIntensity: number // 0-1
}

// 애니메이션 키프레임 정의
export interface AnimationKeyframe {
  time: number // 0-1 normalized
  opacity: number
  scale: number
  glowRadius: number
  color?: string
}

// 기본 설정값
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  mode: 'fk-flow',
  speed: 1,
  loop: false,
  fkFlow: {
    bidirectional: true,
    maxDepth: -1,
  },
  crud: {
    targetTableId: '',
    operation: 'read',
    includeRelated: true,
    showCascade: true,
  },
  sequential: {
    includeColumns: false,
    sortBy: 'connections',
  },
}

// 속도 프리셋
export const SPEED_PRESETS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
  { label: '3x', value: 3 },
] as const

// 기본 스텝 지속 시간 (ms) - 카메라 애니메이션(1200ms)보다 길게 설정
export const BASE_STEP_DURATION = 1800

// 애니메이션 색상
export const SIMULATION_COLORS = {
  active: '#22c55e', // green-500
  activeGlow: 'rgba(34, 197, 94, 0.6)',
  past: '#94a3b8', // slate-400
  future: '#64748b', // slate-500
  edge: '#3b82f6', // blue-500
  edgeGlow: 'rgba(59, 130, 246, 0.6)',
  create: '#22c55e', // green
  read: '#3b82f6', // blue
  update: '#f59e0b', // amber
  delete: '#ef4444', // red
} as const
