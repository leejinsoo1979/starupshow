'use client'

/**
 * BrainMapLayout - 에이전트 지식 그래프 레이아웃
 * 탭: 패스파인더, 클러스터, 로드맵
 */

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import {
  Search,
  Filter,
  Download,
  Maximize2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Route,
  GitBranch,
  Network,
  Brain,
  Users,
  FileText,
  Lightbulb,
  Target,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { BrainNode, BrainCluster, BrainInsight, NodeType } from '@/types/brain-map'

// BrainMap3D를 동적 import (SSR 비활성화)
const BrainMap3D = dynamic(() => import('./BrainMap3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-400 text-sm">3D 그래프 초기화 중...</span>
      </div>
    </div>
  ),
})

type TabType = 'pathfinder' | 'clusters' | 'roadmap'

const TABS = [
  { id: 'pathfinder' as TabType, label: '패스파인더', icon: Route },
  { id: 'clusters' as TabType, label: '클러스터', icon: Network },
  { id: 'roadmap' as TabType, label: '로드맵', icon: GitBranch },
]

// 클러스터 라벨 (A ~ L)
const CLUSTER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

// 클러스터 색상
const CLUSTER_COLORS = [
  '#FF6B9D', '#00D9FF', '#7C3AED', '#10B981', '#F59E0B', '#6366F1',
  '#EC4899', '#14B8A6', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16',
]

interface BrainMapLayoutProps {
  agentId: string
  isDark?: boolean
}

export function BrainMapLayout({ agentId, isDark = true }: BrainMapLayoutProps) {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('pathfinder')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<BrainNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<BrainNode | null>(null)

  // Pathfinder state
  const [startNode, setStartNode] = useState('')
  const [endNode, setEndNode] = useState('')
  const [pathResults, setPathResults] = useState<any[]>([])

  // Cluster state
  const [clusters, setClusters] = useState<BrainCluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const [resolution, setResolution] = useState(50)

  // Insights state
  const [insights, setInsights] = useState<BrainInsight[]>([])
  const [showAnalysis, setShowAnalysis] = useState(false)

  // 노드 타입 필터
  const [nodeTypeFilters, setNodeTypeFilters] = useState<Set<NodeType>>(new Set())

  // 하이라이트할 노드 ID들
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set())

  // 클러스터 데이터 로드
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}/brain/clusters`)
        if (res.ok) {
          const data = await res.json()
          setClusters(data.clusters || [])
        }
      } catch (error) {
        console.error('Failed to fetch clusters:', error)
      }
    }
    fetchClusters()
  }, [agentId])

  // Insights 로드
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}/brain/insights`)
        if (res.ok) {
          const data = await res.json()
          setInsights(data.insightItems || [])
        }
      } catch (error) {
        console.error('Failed to fetch insights:', error)
      }
    }
    fetchInsights()
  }, [agentId])

  // 패스파인더 검색
  const handlePathSearch = async () => {
    if (!startNode || !endNode) return

    try {
      const res = await fetch(`/api/agents/${agentId}/brain/pathfinder?from=${startNode}&to=${endNode}`)
      if (res.ok) {
        const data = await res.json()
        if (data.found && data.trace) {
          setPathResults(data.trace.steps || [])
          // 경로의 노드들 하이라이트
          const nodeIds = new Set<string>()
          data.trace.steps.forEach((step: any) => {
            step.usedNodeIds?.forEach((id: string) => nodeIds.add(id))
          })
          setHighlightNodes(nodeIds)
        }
      }
    } catch (error) {
      console.error('Path search failed:', error)
    }
  }

  // 클러스터 선택
  const handleClusterSelect = (clusterId: string) => {
    if (selectedCluster === clusterId) {
      setSelectedCluster(null)
      setHighlightNodes(new Set())
    } else {
      setSelectedCluster(clusterId)
      const cluster = clusters.find(c => c.clusterId === clusterId)
      if (cluster) {
        setHighlightNodes(new Set(cluster.centralNodeIds))
      }
    }
  }

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback((node: BrainNode) => {
    setSelectedNode(node)
  }, [])

  // 노드 호버 핸들러
  const handleNodeHover = useCallback((node: BrainNode | null) => {
    setHoveredNode(node)
  }, [])

  // 노드 타입 필터 토글
  const toggleNodeTypeFilter = (type: NodeType) => {
    const newFilters = new Set(nodeTypeFilters)
    if (newFilters.has(type)) {
      newFilters.delete(type)
    } else {
      newFilters.add(type)
    }
    setNodeTypeFilters(newFilters)
  }

  return (
    <div className={cn('w-full h-full flex', isDark ? 'bg-zinc-950' : 'bg-white')}>
      {/* 사이드바 */}
      <div
        className={cn(
          'h-full border-r flex flex-col transition-all duration-300',
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200',
          sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
        )}
      >
        {/* 탭 헤더 */}
        <div className={cn('p-4 border-b', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-cyan-500 text-white'
                      : isDark
                        ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 패스파인더 */}
          {activeTab === 'pathfinder' && (
            <div className="space-y-4">
              {/* 시작/종료 지점 */}
              <div className="space-y-2">
                <label className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                  시작 지점
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={startNode}
                    onChange={(e) => setStartNode(e.target.value)}
                    placeholder="노드 검색..."
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
                      'border focus:outline-none focus:ring-2 focus:ring-cyan-500'
                    )}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                </div>
              </div>

              <div className="space-y-2">
                <label className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                  종료 지점
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={endNode}
                    onChange={(e) => setEndNode(e.target.value)}
                    placeholder="노드 검색..."
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
                      'border focus:outline-none focus:ring-2 focus:ring-cyan-500'
                    )}
                  />
                  <Target className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                </div>
              </div>

              <button
                onClick={handlePathSearch}
                disabled={!startNode || !endNode}
                className={cn(
                  'w-full py-2 rounded-lg font-medium text-sm transition-colors',
                  startNode && endNode
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    : isDark
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                )}
              >
                경로 탐색
              </button>

              {/* 경로 결과 */}
              {pathResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
                    경로 ({pathResults.length}단계)
                  </h4>
                  <div className="space-y-1">
                    {pathResults.map((step, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg text-xs',
                          isDark ? 'bg-zinc-800' : 'bg-white border border-zinc-200'
                        )}
                      >
                        <span className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                          'bg-cyan-500 text-white'
                        )}>
                          {idx + 1}
                        </span>
                        <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                          {step.output || step.stepType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 클러스터 */}
          {activeTab === 'clusters' && (
            <div className="space-y-4">
              {/* 해상도 슬라이더 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                    해상도
                  </label>
                  <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    {resolution}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={resolution}
                  onChange={(e) => setResolution(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* 클러스터 버튼 그리드 */}
              <div>
                <h4 className={cn('text-xs font-medium mb-2', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                  클러스터
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {CLUSTER_LABELS.map((label, idx) => {
                    const cluster = clusters[idx]
                    const isSelected = selectedCluster === cluster?.clusterId
                    const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length]

                    return (
                      <button
                        key={label}
                        onClick={() => cluster && handleClusterSelect(cluster.clusterId)}
                        disabled={!cluster}
                        className={cn(
                          'aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all',
                          isSelected
                            ? 'ring-2 ring-white scale-110'
                            : 'hover:scale-105',
                          !cluster && 'opacity-30 cursor-not-allowed'
                        )}
                        style={{
                          backgroundColor: cluster ? `${color}30` : undefined,
                          color: cluster ? color : undefined,
                          borderColor: color,
                        }}
                      >
                        <span>{label}</span>
                        {cluster && (
                          <span className="text-[10px] opacity-70">{cluster.nodeCount}개</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 선택된 클러스터 정보 */}
              {selectedCluster && (
                <div className={cn(
                  'p-3 rounded-lg',
                  isDark ? 'bg-zinc-800' : 'bg-white border border-zinc-200'
                )}>
                  {(() => {
                    const cluster = clusters.find(c => c.clusterId === selectedCluster)
                    if (!cluster) return null
                    const idx = clusters.indexOf(cluster)
                    const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length]

                    return (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-zinc-900')}>
                            {cluster.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cluster.topKeywords?.map((keyword, i) => (
                            <span
                              key={i}
                              className={cn(
                                'px-2 py-0.5 rounded text-xs',
                                isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                              )}
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                        <div className={cn('text-xs mt-2', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                          응집도: {Math.round((cluster.cohesionScore || 0) * 100)}%
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {/* AI 분석 버튼 */}
              <button
                onClick={() => setShowAnalysis(true)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                )}
              >
                <Sparkles className="w-4 h-4" />
                AI 분석
              </button>
            </div>
          )}

          {/* 로드맵 */}
          {activeTab === 'roadmap' && (
            <div className="space-y-4">
              <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                시간 순서에 따른 기억/이벤트 흐름을 트리 구조로 시각화합니다.
              </p>

              {/* 필터 */}
              <div className="space-y-2">
                <label className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                  노드 타입 필터
                </label>
                <div className="flex flex-wrap gap-1">
                  {(['memory', 'meeting', 'decision', 'task'] as NodeType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleNodeTypeFilter(type)}
                      className={cn(
                        'px-2 py-1 rounded text-xs transition-colors',
                        nodeTypeFilters.has(type)
                          ? 'bg-cyan-500 text-white'
                          : isDark
                            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 액션 */}
        <div className={cn('p-4 border-t', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
          <button
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
            )}
          >
            <Download className="w-4 h-4" />
            데이터 다운로드
          </button>
        </div>
      </div>

      {/* 사이드바 토글 버튼 */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-r-lg transition-all',
          isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-600',
          sidebarOpen ? 'ml-80' : 'ml-0'
        )}
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* 메인 3D 뷰 */}
      <div className="flex-1 relative">
        <BrainMap3D
          agentId={agentId}
          isDark={isDark}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          highlightNodes={highlightNodes}
          showLabels={true}
          bloomStrength={1.5}
        />

        {/* 줌 컨트롤 */}
        <div className={cn(
          'absolute top-4 left-4 flex flex-col gap-1',
        )}>
          <button
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-white hover:bg-zinc-100 text-zinc-600',
              'border',
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            )}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-white hover:bg-zinc-100 text-zinc-600',
              'border',
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            )}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-white hover:bg-zinc-100 text-zinc-600',
              'border',
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            )}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI 분석 모달 */}
      {showAnalysis && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={cn(
            'w-full max-w-lg max-h-[80vh] rounded-2xl overflow-hidden',
            isDark ? 'bg-zinc-900' : 'bg-white'
          )}>
            <div className={cn(
              'flex items-center justify-between p-4 border-b',
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            )}>
              <h3 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
                AI 분석 결과
              </h3>
              <button
                onClick={() => setShowAnalysis(false)}
                className={cn(
                  'p-1 rounded-lg transition-colors',
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {insights.length > 0 ? (
                insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 rounded-lg',
                      isDark ? 'bg-zinc-800' : 'bg-zinc-50 border border-zinc-200'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-zinc-900')}>
                          {insight.title}
                        </h4>
                        <p className={cn('text-xs mt-1', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                          {insight.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs',
                            isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
                          )}>
                            {insight.category}
                          </span>
                          <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                            신뢰도 {Math.round(insight.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className={cn('text-sm text-center py-8', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  분석 중...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 선택된 노드 상세 팝업 */}
      {selectedNode && (
        <div className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 z-20',
          'w-full max-w-md p-4 rounded-2xl',
          isDark ? 'bg-zinc-900/95 border border-zinc-800' : 'bg-white/95 border border-zinc-200',
          'shadow-2xl backdrop-blur-sm'
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                'bg-gradient-to-br from-cyan-500 to-blue-600'
              )}>
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
                  {selectedNode.title}
                </h4>
                <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  {selectedNode.type}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className={cn(
                'p-1 rounded-lg transition-colors',
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {selectedNode.summary && (
            <p className={cn('text-sm mt-3', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              {selectedNode.summary}
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <button className={cn(
              'flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            )}>
              패스파인더 탐색
            </button>
            <button className={cn(
              'flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
              'bg-cyan-500 hover:bg-cyan-600 text-white'
            )}>
              로드맵 탐색
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrainMapLayout
