/**
 * 마이뉴런 Constants
 * 색상, LOD 설정, 테마 프리셋, 정책
 */

import type {
  MyNeuronType,
  MyNeuronsTheme,
  NeuronStatus,
  NeuronPriority,
} from './types'

// ============================================
// 노드 타입별 색상
// ============================================

export const NODE_COLORS: Record<MyNeuronType, string> = {
  self: '#FFD700',        // 골드 (중앙)
  project: '#22C55E',     // 밝은 그린
  task: '#3B82F6',        // 블루
  doc: '#F472B6',         // 핑크 (사업계획서)
  person: '#38BDF8',      // 스카이블루
  agent: '#A78BFA',       // 연한 퍼플
  objective: '#FBBF24',   // 옐로
  key_result: '#FB923C',  // 오렌지
  decision: '#F87171',    // 밝은 레드
  memory: '#2DD4BF',      // 틸
  workflow: '#A3E635',    // 라임
  insight: '#22D3EE',     // 시안
  program: '#F472B6',     // 핑크
  application: '#C084FC', // 바이올렛
  milestone: '#67E8F9',   // 밝은 시안
  budget: '#A8A29E',      // 스톤
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
// 우선순위별 색상
// ============================================

export const PRIORITY_COLORS: Record<NeuronPriority, string> = {
  critical: '#EF4444',    // 레드
  high: '#F97316',        // 오렌지
  medium: '#F59E0B',      // 앰버
  low: '#6B7280',         // 그레이
}

// ============================================
// 노드 타입별 아이콘
// ============================================

export const NODE_ICONS: Record<MyNeuronType, string> = {
  self: '👤',
  project: '📁',
  task: '✅',
  doc: '📄',
  person: '👥',
  agent: '🤖',
  objective: '🎯',
  key_result: '📊',
  decision: '⚡',
  memory: '💭',
  workflow: '🔄',
  insight: '💡',
  program: '🏛️',
  application: '📝',
  milestone: '🏁',
  budget: '💰',
}

// ============================================
// LOD Distances
// ============================================

export interface LODDistances {
  labelShow: number
  labelHide: number
  nodeSimplify: number
  clusterProxy: number
  near: number
  medium: number
  far: number
}

export const LOD_DISTANCES: LODDistances = {
  labelShow: 150,        // 라벨 표시
  labelHide: 300,        // 라벨 숨김
  nodeSimplify: 500,     // 노드 단순화
  clusterProxy: 800,     // 클러스터로 합침
  near: 100,             // 가까운 거리
  medium: 300,           // 중간 거리
  far: 500,              // 먼 거리
}

// ============================================
// 노드 렌더링 설정
// ============================================

export const NODE_RENDERING = {
  baseSize: 3,
  importanceMultiplier: 0.5,
  minSize: 3,
  maxSize: 10,
  selfScale: 2.0,        // Self 노드는 2배 크기
  hoverScale: 1.15,
  hoverEmissiveIntensity: 0.8,
  normalEmissiveIntensity: 0.3,
  sphereSegments: 32,
}

// ============================================
// 엣지 렌더링 설정
// ============================================

export const EDGE_RENDERING = {
  baseWidth: 0.3,
  maxWidth: 2,
  weightMultiplier: 2,
  defaultOpacity: 0.4,
  selectedOpacity: 1.0,
  bottleneckColor: '#EF4444',  // 병목 연결은 빨간색
  bottleneckWidth: 3,
}

// ============================================
// 카메라 설정
// ============================================

export const CAMERA_SETTINGS = {
  fov: 60,
  near: 0.1,
  far: 10000,
  initialPosition: { x: 0, y: 200, z: 400 },  // Further away to see all nodes
  initialTarget: { x: 0, y: 0, z: 0 },
  dampingFactor: 0.05,
  minDistance: 40,
  maxDistance: 2000,
  focusDuration: 0.8,
  focusOffset: 50,
}

// ============================================
// Force 시뮬레이션 설정
// ============================================

export const FORCE_SETTINGS = {
  // Link force
  linkDistance: 40,
  linkStrength: 0.4,

  // Charge force (repulsion)
  chargeStrength: -80,
  chargeDistanceMax: 400,
  theta: 0.8,

  // Center force
  centerStrength: 0.06,

  // Collision
  collisionRadius: 25,
  collisionStrength: 1.0,
  collisionIterations: 3,

  // Alpha
  alphaDecay: 0.02,
  alphaMin: 0.001,
  velocityDecay: 0.4,
}

// ============================================
// Radial Layout 설정
// ============================================

export interface RadialLayoutConfig {
  centerNode: string
  ringGap: number
  angleSpread: number
  jitter: number
}

export const DEFAULT_RADIAL_CONFIG: RadialLayoutConfig = {
  centerNode: '',       // Self ID (런타임 설정)
  ringGap: 80,          // 링 간격
  angleSpread: 360,     // 노드 분산 각도
  jitter: 0.1,          // 위치 랜덤성
}

// ============================================
// 테마 프리셋
// ============================================

export const THEME_PRESETS: MyNeuronsTheme[] = [
  {
    id: 'cosmic-dark',
    name: 'Cosmic Dark',
    background: {
      gradient: ['#050510', '#0a0a1a'],
      starsEnabled: true,
      starsColor: '#ffffff',
      starsCount: 3000,
    },
    node: {
      colors: NODE_COLORS,
      emissiveIntensity: 0.4,
      hoverScale: 1.15,
      selectedOutlineColor: '#ffffff',
      selectedOutlineWidth: 2,
    },
    edge: {
      defaultOpacity: 0.4,
      selectedOpacity: 1.0,
      particlesEnabled: true,
      baseColor: '#3B82F6',
    },
    ui: {
      panelBackground: 'rgba(10, 10, 15, 0.95)',
      textColor: '#e5e5e5',
      accentColor: '#3b82f6',
      borderColor: '#27272a',
    },
  },
  {
    id: 'ocean-light',
    name: 'Ocean Light',
    background: {
      gradient: ['#e0f2fe', '#bae6fd'],
      starsEnabled: false,
      starsColor: '#94a3b8',
      starsCount: 100,
    },
    node: {
      colors: {
        ...NODE_COLORS,
        self: '#0369a1',
      },
      emissiveIntensity: 0.2,
      hoverScale: 1.12,
      selectedOutlineColor: '#0369a1',
      selectedOutlineWidth: 2,
    },
    edge: {
      defaultOpacity: 0.3,
      selectedOpacity: 0.9,
      particlesEnabled: false,
      baseColor: '#0284c7',
    },
    ui: {
      panelBackground: 'rgba(255, 255, 255, 0.95)',
      textColor: '#1e293b',
      accentColor: '#0284c7',
      borderColor: '#e2e8f0',
    },
  },
]

export const DEFAULT_THEME_ID = 'cosmic-dark'

// ============================================
// 패널 크기
// ============================================

export const PANEL_SIZES = {
  left: {
    default: 280,
    min: 200,
    max: 400,
    collapsed: 0,
  },
  right: {
    default: 380,
    min: 280,
    max: 600,
    collapsed: 0,
  },
}

// ============================================
// 애니메이션 시간 (ms)
// ============================================

export const ANIMATION_DURATIONS = {
  expand: 400,
  collapse: 250,
  edgeDraw: 300,
  nodeHover: 150,
  panelToggle: 300,
  cameraFocus: 800,
  cameraMove: 600,
  nodeAppear: 400,
  tabSwitch: 200,
  statusChange: 300,
}

// ============================================
// API 엔드포인트
// ============================================

export const API_ENDPOINTS = {
  base: '/api/my-neurons',
  graph: '/api/my-neurons/graph',
  sync: '/api/my-neurons/sync',
  insights: '/api/my-neurons/insights',
  bottlenecks: '/api/my-neurons/bottlenecks',
  priorities: '/api/my-neurons/priorities',
}

// ============================================
// 동기화 설정
// ============================================

export const SYNC_CONFIG = {
  autoSyncInterval: 60000,  // 1분
  realtimeEnabled: true,
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
    'project_budgets',
    'project_expenses',
  ],
}

// ============================================
// 라벨 정책
// ============================================

export const LABEL_POLICY = {
  defaultVisible: false,
  maxVisible: 50,
  fontSize: 0.6,
  maxLength: 25,
  showConditions: {
    hover: true,
    selected: true,
    distanceThreshold: 150,
  },
  priorityOrder: [
    'selected',
    'hovered',
    'self',
    'blocked',     // 병목 노드 우선 표시
    'urgent',      // 긴급 노드 우선 표시
    'importance >= 8',
    'distance < 100',
  ],
}

// ============================================
// 키보드 단축키
// ============================================

export const KEYBOARD_SHORTCUTS = {
  focusSelf: 'Home',           // Self 노드로 포커스
  focusSelected: 'f',          // 선택된 노드로 포커스
  resetView: 'r',              // 뷰 초기화
  toggleLabels: 'l',           // 라벨 토글
  toggleBottlenecks: 'b',      // 병목 하이라이트 토글
  search: 'Ctrl+f',            // 검색
  escape: 'Escape',            // 선택 해제
  zoomIn: '+',                 // 줌 인
  zoomOut: '-',                // 줌 아웃
}

// ============================================
// 노드 임계값
// ============================================

export const NODE_THRESHOLDS = {
  NORMAL: 100,          // 일반 렌더링
  LARGE: 500,           // InstancedMesh 적용
  HUGE: 2000,           // 극한 최적화
  INSTANCED: 100,       // InstancedMesh 사용 임계값
}

// ============================================
// 병목 감지 임계값
// ============================================

export const BOTTLENECK_THRESHOLDS = {
  deadlineDaysUrgent: 3,    // 3일 이내 = 긴급
  deadlineDaysWarning: 7,   // 7일 이내 = 경고
  noActivityDays: 7,        // 7일 무활동 = 주의
  dependencyChainMax: 3,    // 의존성 체인 3개 이상 = 경고
  agentTaskMax: 5,          // 에이전트 당 최대 5개 작업
  okrCheckinDays: 14,       // 14일 OKR 체크인 없음 = 경고
  budgetWarningPercent: 80, // 예산 80% 사용 = 경고
  budgetCriticalPercent: 100, // 예산 100% 초과 = 위험
}
