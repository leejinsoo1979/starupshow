'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useMyNeuronsStore } from '@/lib/my-neurons/store'
import { NeuronsGraph } from '@/components/my-neurons/canvas/NeuronsGraph'
import { InsightsPanel } from '@/components/my-neurons/panels/InsightsPanel'
import { NodeInspectorPanel } from '@/components/my-neurons/panels/NodeInspectorPanel'
import { FilterToolbar } from '@/components/my-neurons/controls/FilterToolbar'
import type { MyNeuronNode, BottleneckInsight } from '@/lib/my-neurons/types'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Loader2,
} from 'lucide-react'

export default function NeuronsPage() {
  const router = useRouter()

  // Store state
  const graph = useMyNeuronsStore((s) => s.graph)
  const isLoading = useMyNeuronsStore((s) => s.isLoading)
  const selectedNodeIds = useMyNeuronsStore((s) => s.selectedNodeIds)
  const setGraph = useMyNeuronsStore((s) => s.setGraph)
  const setLoading = useMyNeuronsStore((s) => s.setLoading)
  const setBottlenecks = useMyNeuronsStore((s) => s.setBottlenecks)
  const setPriorities = useMyNeuronsStore((s) => s.setPriorities)
  const clearSelection = useMyNeuronsStore((s) => s.clearSelection)

  // Local state
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [bottlenecks, setBottlenecksLocal] = useState<BottleneckInsight[]>([])
  const [priorities, setPrioritiesLocal] = useState<MyNeuronNode[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/my-neurons/graph')
      if (!res.ok) {
        throw new Error('Failed to fetch graph data')
      }

      const data = await res.json()
      if (data.success) {
        setGraph(data.data)
        setBottlenecksLocal(data.bottlenecks || [])
        setPrioritiesLocal(data.priorities || [])
        setBottlenecks(data.bottlenecks || [])
        setPriorities(data.priorities || [])
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Failed to fetch graph:', err)
      setError(err instanceof Error ? err.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }, [setGraph, setLoading, setBottlenecks, setPriorities])

  // Initial fetch
  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  // Get selected node
  const selectedNode = useMemo(() => {
    if (!graph?.nodes || selectedNodeIds.length !== 1) return null
    return graph.nodes.find((n) => n.id === selectedNodeIds[0]) || null
  }, [graph?.nodes, selectedNodeIds])

  // Get connected nodes for selected node
  const connectedNodes = useMemo(() => {
    if (!selectedNode || !graph?.edges || !graph?.nodes) return []

    const connectedIds = new Set<string>()
    for (const edge of graph.edges) {
      if (edge.source === selectedNode.id) {
        connectedIds.add(edge.target)
      } else if (edge.target === selectedNode.id) {
        connectedIds.add(edge.source)
      }
    }

    return graph.nodes.filter((n) => connectedIds.has(n.id))
  }, [selectedNode, graph?.edges, graph?.nodes])

  // Navigate to source
  const handleNavigate = useCallback(
    (sourceTable: string, sourceId: string) => {
      // Map source table to route
      const routeMap: Record<string, string> = {
        projects: `/project/${sourceId}`,
        unified_tasks: `/tasks?id=${sourceId}`,
        business_plans: `/company/government-programs/business-plan?id=${sourceId}`,
        team_members: `/company/team?member=${sourceId}`,
        deployed_agents: `/agents/${sourceId}`,
        objectives: `/okr?objective=${sourceId}`,
        key_results: `/okr?kr=${sourceId}`,
        government_programs: `/company/government-programs/${sourceId}`,
        program_applications: `/company/government-programs/applications?id=${sourceId}`,
        project_milestones: `/project/milestones?id=${sourceId}`,
        project_budgets: `/project/budgets?id=${sourceId}`,
      }

      const route = routeMap[sourceTable]
      if (route) {
        router.push(route)
      }
    },
    [router]
  )

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Top Toolbar */}
      <FilterToolbar onRefresh={fetchGraph} isLoading={isLoading} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Insights */}
        <div
          className={cn(
            'flex-shrink-0 border-r border-zinc-800 transition-all duration-300 overflow-hidden',
            leftPanelOpen ? 'w-80' : 'w-0'
          )}
        >
          {leftPanelOpen && (
            <InsightsPanel bottlenecks={bottlenecks} priorities={priorities} />
          )}
        </div>

        {/* Left Panel Toggle */}
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-r-lg border border-l-0 border-zinc-700 transition-colors"
          style={{ left: leftPanelOpen ? '320px' : '0' }}
        >
          {leftPanelOpen ? (
            <PanelLeftClose className="w-4 h-4 text-zinc-400" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {/* Main Graph Area */}
        <div className="flex-1 relative">
          {isLoading && !graph ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-zinc-400 text-sm">
                  마이뉴런을 불러오는 중...
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="text-red-400 text-sm">{error}</div>
                <button
                  onClick={fetchGraph}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          ) : (
            <NeuronsGraph
              onNodeClick={(node) => console.log('Node clicked:', node)}
              onBackgroundClick={clearSelection}
            />
          )}

          {/* Stats Overlay */}
          {graph && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/80 backdrop-blur border border-zinc-800 text-xs text-zinc-400">
              <span className="text-amber-400">{graph.stats?.totalNodes || 0}</span>
              <span>노드</span>
              <span className="text-zinc-600">•</span>
              <span className="text-blue-400">{graph.stats?.totalEdges || 0}</span>
              <span>연결</span>
              {graph.lastSyncAt && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>
                    {new Date(graph.lastSyncAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Panel Toggle */}
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-l-lg border border-r-0 border-zinc-700 transition-colors"
          style={{ right: rightPanelOpen ? '360px' : '0' }}
        >
          {rightPanelOpen ? (
            <PanelRightClose className="w-4 h-4 text-zinc-400" />
          ) : (
            <PanelRightOpen className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {/* Right Panel - Node Inspector */}
        <div
          className={cn(
            'flex-shrink-0 border-l border-zinc-800 transition-all duration-300 overflow-hidden',
            rightPanelOpen ? 'w-[360px]' : 'w-0'
          )}
        >
          {rightPanelOpen && (
            <NodeInspectorPanel
              node={selectedNode}
              connectedNodes={connectedNodes}
              onClose={() => clearSelection()}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      </div>
    </div>
  )
}
