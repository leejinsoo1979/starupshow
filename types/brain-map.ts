/**
 * Brain Map 타입 정의
 * Agent Profile > Brain Map 기능용
 */

// ============================================
// Node Types
// ============================================

export type NodeType =
  | 'memory'
  | 'concept'
  | 'person'
  | 'doc'
  | 'task'
  | 'decision'
  | 'meeting'
  | 'tool'
  | 'skill'

export interface BrainNode {
  id: string
  type: NodeType
  title: string
  summary?: string
  createdAt: number // epoch ms
  updatedAt?: number
  importance: number // 1..10
  confidence?: number // 0..1
  clusterId?: string
  tags?: string[]
  source?: {
    kind: 'chat' | 'file' | 'web' | 'tool'
    ref?: string
  }
  stats?: {
    accessCount?: number
    lastAccessAt?: number
  }
  // 렌더링용
  x?: number
  y?: number
  z?: number
  hop?: number // radial map용
}

// ============================================
// Edge Types
// ============================================

export type EdgeType =
  | 'mentions'
  | 'supports'
  | 'contradicts'
  | 'causes'
  | 'follows'
  | 'part_of'
  | 'related'
  | 'assigned_to'
  | 'produced_by'

export interface BrainEdge {
  id: string
  source: string
  target: string
  type: EdgeType
  weight: number // 0..1
  evidence?: {
    memoryIds?: string[]
    docIds?: string[]
  }
  createdAt: number
}

// ============================================
// Graph Data
// ============================================

export interface BrainGraphData {
  nodes: BrainNode[]
  edges: BrainEdge[]
}

// ============================================
// Event Types (Roadmap)
// ============================================

export type EventType = 'meeting' | 'decision' | 'task' | 'milestone' | 'incident'
export type EventStatus = 'open' | 'done' | 'blocked'

export interface BrainEvent {
  id: string
  timestamp: number
  eventType: EventType
  title: string
  summary?: string
  linkedNodeIds: string[]
  impactScore: number // 0..100
  status?: EventStatus
}

// ============================================
// Cluster Types
// ============================================

export interface BrainCluster {
  clusterId: string
  label: string
  topKeywords: string[]
  nodeCount: number
  cohesionScore: number // 0..1
  centralNodeIds: string[]
  color?: string // hex color for visualization
}

// ============================================
// Trace/Pathfinder Types
// ============================================

export type StepType =
  | 'retrieve'
  | 'read'
  | 'reason'
  | 'plan'
  | 'tool_call'
  | 'write'
  | 'verify'
  | 'decision'

export interface TraceStep {
  stepId: string
  index: number
  stepType: StepType
  input?: string
  output?: string
  usedNodeIds: string[]
  createdEdgeIds: string[]
  tool?: {
    name: string
    args: Record<string, unknown>
    status: 'success' | 'error' | 'pending'
    latencyMs?: number
  }
  confidence: number // 0..1
}

export interface BrainTrace {
  traceId: string
  startedAt: number
  endedAt?: number
  goal: string
  finalAnswer?: string
  resultArtifacts?: string[]
  steps: TraceStep[]
}

// ============================================
// Insight Types
// ============================================

export type InsightCategory =
  | 'summary'
  | 'risk'
  | 'gap'
  | 'trend'
  | 'contradiction'
  | 'opportunity'
  | 'next_action'

export interface BrainInsight {
  insightId: string
  category: InsightCategory
  title: string
  content: string
  confidence: number // 0..1
  evidenceNodeIds: string[]
  evidenceEdgeIds: string[]
  createdAt: number
}

export interface GraphStats {
  totalNodes: number
  totalEdges: number
  clusters: number
  avgDegree: number
  density: number
}

export interface GrowthStats {
  nodesAdded7d: number
  edgesAdded7d: number
  topGrowingClusters: string[]
}

export interface QualityStats {
  contradictionsCount: number
  orphanNodesCount: number
  lowConfidenceCount: number
}

export interface BrainInsightsData {
  insightItems: BrainInsight[]
  stats?: {
    graphStats: GraphStats
    growthStats: GrowthStats
    qualityStats: QualityStats
  }
}

// ============================================
// API Response Types
// ============================================

export interface GraphResponse {
  nodes: BrainNode[]
  edges: BrainEdge[]
}

export interface ExpandResponse {
  nodes: BrainNode[]
  edges: BrainEdge[]
}

export interface PathfinderResponse {
  trace: BrainTrace
}

export interface ClustersResponse {
  clusters: BrainCluster[]
}

export interface RoadmapResponse {
  events: BrainEvent[]
}

export interface RadialResponse {
  subgraph: {
    nodes: BrainNode[]
    edges: BrainEdge[]
  }
}

export interface InsightsResponse extends BrainInsightsData {}

// ============================================
// Theme Types
// ============================================

export interface BrainMapTheme {
  background: string
  nodeColors: {
    memory: string
    concept: string
    person: string
    doc: string
    task: string
    decision: string
    meeting: string
    tool: string
    skill: string
  }
  edgeColor: string
  selectedColor: string
  glowColor: string
  textColor: string
  gridColor: string
}

// ============================================
// Component Props
// ============================================

export type BrainMapTab = 'pathfinder' | 'clusters' | 'roadmap' | 'radial' | 'insights'

export interface BrainMapState {
  activeTab: BrainMapTab
  selectedNodeId: string | null
  selectedEdgeId: string | null
  hoveredNodeId: string | null
  isLoading: boolean
  expandingNodeId: string | null
  // Radial specific
  anchorNodeId: string | null
  radialDepth: number
  // Filters
  filters: {
    dateRange?: { from: number; to: number }
    nodeTypes?: NodeType[]
    searchQuery?: string
  }
}
