/**
 * 마이뉴런 Zustand Store
 * 사용자의 모든 GlowUS 활동을 시각화하는 뇌 맵 상태 관리
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'

enableMapSet()

import type {
  MyNeuronsGraph,
  MyNeuronNode,
  MyNeuronEdge,
  MyNeuronType,
  NeuronStatus,
  BottleneckInsight,
  PriorityInsight,
  ViewState,
  RightPanelTab,
  NodePosition,
  MyNeuronsTheme,
  ViewMode,
} from './types'
import { createEmptyGraph } from './types'
import {
  DEFAULT_THEME_ID,
  THEME_PRESETS,
  PANEL_SIZES,
  CAMERA_SETTINGS,
} from './constants'

// ============================================
// Store State Interface
// ============================================

interface MyNeuronsState {
  // === 그래프 데이터 ===
  graph: MyNeuronsGraph | null
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  lastSyncAt: string | null

  // === 선택 상태 ===
  selectedNodeIds: string[]
  hoveredNodeId: string | null

  // === 뷰 상태 ===
  layoutMode: 'force' | 'radial' | 'tree'
  viewMode: ViewMode
  filterByType: MyNeuronType[]
  filterByStatus: NeuronStatus[]
  showBottlenecksOnly: boolean
  showLabels: boolean

  // === 패널 ===
  leftPanelWidth: number
  rightPanelWidth: number
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean
  rightPanelTab: RightPanelTab

  // === 카메라 ===
  cameraPosition: NodePosition
  cameraTarget: NodePosition
  isAnimatingCamera: boolean

  // === 검색 ===
  searchQuery: string
  searchResults: MyNeuronNode[]

  // === 테마 ===
  themeId: string
  currentTheme: MyNeuronsTheme

  // === 확장 상태 ===
  expandedNodeIds: Set<string>
}

// ============================================
// Store Actions Interface
// ============================================

interface MyNeuronsActions {
  // === 그래프 ===
  setGraph: (graph: MyNeuronsGraph) => void
  initializeGraph: (userId: string, userName: string) => void
  clearGraph: () => void
  setLoading: (loading: boolean) => void
  setSyncing: (syncing: boolean) => void
  setError: (error: string | null) => void

  // === 노드 ===
  addNode: (node: MyNeuronNode) => void
  updateNode: (id: string, updates: Partial<MyNeuronNode>) => void
  deleteNode: (id: string) => void
  setNodes: (nodes: MyNeuronNode[]) => void

  // === 엣지 ===
  addEdge: (edge: MyNeuronEdge) => void
  deleteEdge: (id: string) => void
  setEdges: (edges: MyNeuronEdge[]) => void

  // === 인사이트 ===
  setBottlenecks: (bottlenecks: BottleneckInsight[]) => void
  addBottleneck: (bottleneck: BottleneckInsight) => void
  setPriorities: (priorities: PriorityInsight[]) => void

  // === 선택 ===
  selectNode: (id: string, multi?: boolean) => void
  selectNodes: (ids: string[]) => void
  deselectAll: () => void
  clearSelection: () => void  // alias for deselectAll
  setHoveredNode: (id: string | null) => void

  // === 뷰 ===
  setLayoutMode: (mode: 'force' | 'radial' | 'tree') => void
  setViewMode: (mode: ViewMode) => void
  setFilterByType: (types: MyNeuronType[]) => void
  setFilterByStatus: (statuses: NeuronStatus[]) => void
  toggleBottlenecksOnly: () => void
  setShowBottlenecksOnly: (show: boolean) => void  // setter
  toggleLabels: () => void

  // === 패널 ===
  setLeftPanelWidth: (width: number) => void
  setRightPanelWidth: (width: number) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setRightPanelTab: (tab: RightPanelTab) => void

  // === 카메라 ===
  setCameraPosition: (position: NodePosition) => void
  setCameraTarget: (target: NodePosition) => void
  focusOnNode: (nodeId: string) => void
  focusOnSelf: () => void
  resetCamera: () => void

  // === 검색 ===
  setSearchQuery: (query: string) => void
  search: (query: string) => void
  clearSearch: () => void

  // === 테마 ===
  setTheme: (themeId: string) => void

  // === 확장 ===
  expandNode: (id: string) => void
  collapseNode: (id: string) => void
  toggleNodeExpansion: (id: string) => void

  // === 통계 업데이트 ===
  updateStats: () => void
}

// ============================================
// Initial State
// ============================================

const initialState: MyNeuronsState = {
  graph: null,
  isLoading: false,
  isSyncing: false,
  error: null,
  lastSyncAt: null,

  selectedNodeIds: [],
  hoveredNodeId: null,

  layoutMode: 'radial',
  viewMode: 'radial',
  filterByType: [],
  filterByStatus: [],
  showBottlenecksOnly: false,
  showLabels: true,

  leftPanelWidth: PANEL_SIZES.left.default,
  rightPanelWidth: PANEL_SIZES.right.default,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  rightPanelTab: 'inspector',

  cameraPosition: CAMERA_SETTINGS.initialPosition,
  cameraTarget: CAMERA_SETTINGS.initialTarget,
  isAnimatingCamera: false,

  searchQuery: '',
  searchResults: [],

  themeId: DEFAULT_THEME_ID,
  currentTheme: THEME_PRESETS[0],

  expandedNodeIds: new Set(),
}

// ============================================
// Store
// ============================================

export const useMyNeuronsStore = create<MyNeuronsState & MyNeuronsActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ========== 그래프 ==========
        setGraph: (graph) =>
          set((state) => {
            state.graph = graph
            state.expandedNodeIds = new Set(graph.viewState?.expandedNodeIds || [])
            state.lastSyncAt = graph.lastSyncAt
          }),

        initializeGraph: (userId, userName) =>
          set((state) => {
            const graph = createEmptyGraph(userId, userName)
            state.graph = graph
            state.expandedNodeIds = new Set([graph.selfNodeId])
          }),

        clearGraph: () =>
          set((state) => {
            state.graph = null
            state.selectedNodeIds = []
            state.hoveredNodeId = null
            state.expandedNodeIds = new Set()
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading
          }),

        setSyncing: (syncing) =>
          set((state) => {
            state.isSyncing = syncing
          }),

        setError: (error) =>
          set((state) => {
            state.error = error
          }),

        // ========== 노드 ==========
        addNode: (node) =>
          set((state) => {
            if (!state.graph) return
            state.graph.nodes.push(node)
            state.graph.updatedAt = new Date().toISOString()
            get().updateStats()
          }),

        updateNode: (id, updates) =>
          set((state) => {
            if (!state.graph) return
            const index = state.graph.nodes.findIndex((n) => n.id === id)
            if (index !== -1) {
              state.graph.nodes[index] = {
                ...state.graph.nodes[index],
                ...updates,
                updatedAt: new Date().toISOString(),
              }
              state.graph.updatedAt = new Date().toISOString()
            }
          }),

        deleteNode: (id) =>
          set((state) => {
            if (!state.graph) return
            state.graph.nodes = state.graph.nodes.filter((n) => n.id !== id)
            state.graph.edges = state.graph.edges.filter(
              (e) => e.source !== id && e.target !== id
            )
            state.selectedNodeIds = state.selectedNodeIds.filter((nid) => nid !== id)
            state.expandedNodeIds.delete(id)
            state.graph.updatedAt = new Date().toISOString()
            get().updateStats()
          }),

        setNodes: (nodes) =>
          set((state) => {
            if (!state.graph) return
            state.graph.nodes = nodes
            state.graph.updatedAt = new Date().toISOString()
            get().updateStats()
          }),

        // ========== 엣지 ==========
        addEdge: (edge) =>
          set((state) => {
            if (!state.graph) return
            state.graph.edges.push(edge)
            state.graph.updatedAt = new Date().toISOString()
            get().updateStats()
          }),

        deleteEdge: (id) =>
          set((state) => {
            if (!state.graph) return
            state.graph.edges = state.graph.edges.filter((e) => e.id !== id)
            state.graph.updatedAt = new Date().toISOString()
            get().updateStats()
          }),

        setEdges: (edges) =>
          set((state) => {
            if (!state.graph) return
            state.graph.edges = edges
            state.graph.updatedAt = new Date().toISOString()
            get().updateStats()
          }),

        // ========== 인사이트 ==========
        setBottlenecks: (bottlenecks) =>
          set((state) => {
            if (!state.graph) return
            state.graph.bottlenecks = bottlenecks
          }),

        addBottleneck: (bottleneck) =>
          set((state) => {
            if (!state.graph) return
            state.graph.bottlenecks.push(bottleneck)
          }),

        setPriorities: (priorities) =>
          set((state) => {
            if (!state.graph) return
            state.graph.priorities = priorities
          }),

        // ========== 선택 ==========
        selectNode: (id, multi = false) =>
          set((state) => {
            if (multi) {
              if (state.selectedNodeIds.includes(id)) {
                state.selectedNodeIds = state.selectedNodeIds.filter((nid) => nid !== id)
              } else {
                state.selectedNodeIds.push(id)
              }
            } else {
              state.selectedNodeIds = [id]
            }
          }),

        selectNodes: (ids) =>
          set((state) => {
            state.selectedNodeIds = ids
          }),

        deselectAll: () =>
          set((state) => {
            state.selectedNodeIds = []
          }),

        clearSelection: () =>
          set((state) => {
            state.selectedNodeIds = []
          }),

        setHoveredNode: (id) =>
          set((state) => {
            state.hoveredNodeId = id
          }),

        // ========== 뷰 ==========
        setLayoutMode: (mode) =>
          set((state) => {
            state.layoutMode = mode
          }),

        setViewMode: (mode) =>
          set((state) => {
            state.viewMode = mode
          }),

        setFilterByType: (types) =>
          set((state) => {
            state.filterByType = types
          }),

        setFilterByStatus: (statuses) =>
          set((state) => {
            state.filterByStatus = statuses
          }),

        toggleBottlenecksOnly: () =>
          set((state) => {
            state.showBottlenecksOnly = !state.showBottlenecksOnly
          }),

        setShowBottlenecksOnly: (show) =>
          set((state) => {
            state.showBottlenecksOnly = show
          }),

        toggleLabels: () =>
          set((state) => {
            state.showLabels = !state.showLabels
          }),

        // ========== 패널 ==========
        setLeftPanelWidth: (width) =>
          set((state) => {
            state.leftPanelWidth = Math.max(
              PANEL_SIZES.left.min,
              Math.min(PANEL_SIZES.left.max, width)
            )
          }),

        setRightPanelWidth: (width) =>
          set((state) => {
            state.rightPanelWidth = Math.max(
              PANEL_SIZES.right.min,
              Math.min(PANEL_SIZES.right.max, width)
            )
          }),

        toggleLeftPanel: () =>
          set((state) => {
            state.leftPanelCollapsed = !state.leftPanelCollapsed
          }),

        toggleRightPanel: () =>
          set((state) => {
            state.rightPanelCollapsed = !state.rightPanelCollapsed
          }),

        setRightPanelTab: (tab) =>
          set((state) => {
            state.rightPanelTab = tab
          }),

        // ========== 카메라 ==========
        setCameraPosition: (position) =>
          set((state) => {
            state.cameraPosition = position
          }),

        setCameraTarget: (target) =>
          set((state) => {
            state.cameraTarget = target
          }),

        focusOnNode: (nodeId) =>
          set((state) => {
            const node = state.graph?.nodes.find((n) => n.id === nodeId)
            if (node?.position) {
              state.cameraTarget = node.position
              state.cameraPosition = {
                x: node.position.x,
                y: node.position.y + 50,
                z: node.position.z + CAMERA_SETTINGS.focusOffset,
              }
              state.isAnimatingCamera = true
              state.selectedNodeIds = [nodeId]
            }
          }),

        focusOnSelf: () => {
          const state = get()
          if (state.graph?.selfNodeId) {
            get().focusOnNode(state.graph.selfNodeId)
          }
        },

        resetCamera: () =>
          set((state) => {
            state.cameraPosition = CAMERA_SETTINGS.initialPosition
            state.cameraTarget = CAMERA_SETTINGS.initialTarget
            state.isAnimatingCamera = true
          }),

        // ========== 검색 ==========
        setSearchQuery: (query) =>
          set((state) => {
            state.searchQuery = query
          }),

        search: (query) =>
          set((state) => {
            if (!state.graph || !query.trim()) {
              state.searchResults = []
              return
            }
            const lowerQuery = query.toLowerCase()
            state.searchResults = state.graph.nodes.filter(
              (node) =>
                node.title.toLowerCase().includes(lowerQuery) ||
                node.summary?.toLowerCase().includes(lowerQuery) ||
                node.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
            )
          }),

        clearSearch: () =>
          set((state) => {
            state.searchQuery = ''
            state.searchResults = []
          }),

        // ========== 테마 ==========
        setTheme: (themeId) =>
          set((state) => {
            const theme = THEME_PRESETS.find((t) => t.id === themeId)
            if (theme) {
              state.themeId = themeId
              state.currentTheme = JSON.parse(JSON.stringify(theme))
            }
          }),

        // ========== 확장 ==========
        expandNode: (id) =>
          set((state) => {
            state.expandedNodeIds = new Set([...state.expandedNodeIds, id])
          }),

        collapseNode: (id) =>
          set((state) => {
            const newSet = new Set(state.expandedNodeIds)
            newSet.delete(id)
            state.expandedNodeIds = newSet
          }),

        toggleNodeExpansion: (id) => {
          const state = get()
          if (state.expandedNodeIds.has(id)) {
            get().collapseNode(id)
          } else {
            get().expandNode(id)
          }
        },

        // ========== 통계 업데이트 ==========
        updateStats: () =>
          set((state) => {
            if (!state.graph) return
            const nodes = state.graph.nodes
            const today = new Date().toDateString()

            state.graph.stats = {
              totalNodes: nodes.length,
              totalEdges: state.graph.edges.length,
              blockedTasks: nodes.filter((n) => n.status === 'blocked').length,
              urgentItems: nodes.filter((n) => n.status === 'urgent').length,
              completedToday: nodes.filter(
                (n) =>
                  n.status === 'completed' &&
                  n.updatedAt &&
                  new Date(n.updatedAt).toDateString() === today
              ).length,
              activeProjects: nodes.filter(
                (n) => n.type === 'project' && n.status === 'active'
              ).length,
              pendingApplications: nodes.filter(
                (n) => n.type === 'application' && n.status !== 'completed'
              ).length,
            }
          }),
      })),
      {
        name: 'my-neurons-storage',
        partialize: (state: any) => ({
          themeId: state.themeId,
          leftPanelWidth: state.leftPanelWidth,
          rightPanelWidth: state.rightPanelWidth,
          leftPanelCollapsed: state.leftPanelCollapsed,
          rightPanelCollapsed: state.rightPanelCollapsed,
          layoutMode: state.layoutMode,
          viewMode: state.viewMode,
          showLabels: state.showLabels,
        }),
      }
    ),
    { name: 'MyNeuronsStore' }
  )
)

// ============================================
// Selectors
// ============================================

export const selectGraph = (state: MyNeuronsState) => state.graph
export const selectNodes = (state: MyNeuronsState) => state.graph?.nodes ?? []
export const selectEdges = (state: MyNeuronsState) => state.graph?.edges ?? []
export const selectBottlenecks = (state: MyNeuronsState) => state.graph?.bottlenecks ?? []
export const selectPriorities = (state: MyNeuronsState) => state.graph?.priorities ?? []
export const selectStats = (state: MyNeuronsState) => state.graph?.stats

export const selectSelfNode = (state: MyNeuronsState) => {
  if (!state.graph) return null
  return state.graph.nodes.find((n) => n.id === state.graph?.selfNodeId) ?? null
}

export const selectSelectedNodes = (state: MyNeuronsState) => {
  if (!state.graph) return []
  return state.graph.nodes.filter((n) => state.selectedNodeIds.includes(n.id))
}

export const selectFirstSelectedNode = (state: MyNeuronsState) => {
  if (!state.graph || state.selectedNodeIds.length === 0) return null
  return state.graph.nodes.find((n) => n.id === state.selectedNodeIds[0]) ?? null
}

export const selectHoveredNode = (state: MyNeuronsState) => {
  if (!state.graph || !state.hoveredNodeId) return null
  return state.graph.nodes.find((n) => n.id === state.hoveredNodeId) ?? null
}

export const selectNodeById = (id: string) => (state: MyNeuronsState) => {
  return state.graph?.nodes.find((n) => n.id === id) ?? null
}

export const selectNodesByType = (type: MyNeuronType) => (state: MyNeuronsState) => {
  return state.graph?.nodes.filter((n) => n.type === type) ?? []
}

export const selectNodesByStatus = (status: NeuronStatus) => (state: MyNeuronsState) => {
  return state.graph?.nodes.filter((n) => n.status === status) ?? []
}

export const selectEdgesForNode = (nodeId: string) => (state: MyNeuronsState) => {
  if (!state.graph) return []
  return state.graph.edges.filter((e) => e.source === nodeId || e.target === nodeId)
}

export const selectChildNodes = (parentId: string) => (state: MyNeuronsState) => {
  if (!state.graph) return []
  return state.graph.nodes.filter((n) => n.parentId === parentId)
}

export const selectFilteredNodes = (state: MyNeuronsState) => {
  if (!state.graph) return []

  let nodes = state.graph.nodes

  // 타입 필터
  if (state.filterByType.length > 0) {
    nodes = nodes.filter((n) => state.filterByType.includes(n.type))
  }

  // 상태 필터
  if (state.filterByStatus.length > 0) {
    nodes = nodes.filter((n) => state.filterByStatus.includes(n.status))
  }

  // 병목만 표시
  if (state.showBottlenecksOnly) {
    const bottleneckNodeIds = new Set(state.graph.bottlenecks.map((b) => b.nodeId))
    nodes = nodes.filter((n) => bottleneckNodeIds.has(n.id))
  }

  return nodes
}

export const selectIsNodeExpanded = (nodeId: string) => (state: MyNeuronsState) => {
  return state.expandedNodeIds.has(nodeId)
}
