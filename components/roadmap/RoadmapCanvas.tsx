'use client'

import { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  Panel,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { RoadmapNode } from './RoadmapNode'
import { NodeDetailPanel } from './NodeDetailPanel'
import { AddNodeDialog } from './AddNodeDialog'
import { Button } from '@/components/ui/Button'
import { Plus, LayoutGrid, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoadmapNode as RoadmapNodeType } from '@/types/database'

const nodeTypes: NodeTypes = {
  roadmapNode: RoadmapNode,
}

interface RoadmapCanvasProps {
  projectId: string
}

export function RoadmapCanvas({ projectId }: RoadmapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { fitView } = useReactFlow()

  // Fetch roadmap data
  const fetchRoadmap = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/roadmap`)
      if (!response.ok) throw new Error('Failed to fetch roadmap')
      const data = await response.json()

      // Add onClick handler to node data
      const nodesWithHandler = data.nodes.map((node: Node) => ({
        ...node,
        data: {
          ...node.data,
          onClick: (id: string) => setSelectedNodeId(id),
        },
      }))

      setNodes(nodesWithHandler)
      setEdges(data.edges.map((edge: Edge) => ({
        ...edge,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6b7280',
        },
        style: {
          stroke: '#6b7280',
          strokeWidth: 2,
        },
        animated: edge.data?.dependency_type === 'finish_to_start',
      })))
    } catch (error) {
      console.error('Failed to fetch roadmap:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, setNodes, setEdges])

  useEffect(() => {
    fetchRoadmap()
  }, [fetchRoadmap])

  // Handle new edge connection
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return

      try {
        const response = await fetch(`/api/projects/${projectId}/roadmap/dependencies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_node_id: connection.source,
            target_node_id: connection.target,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to create dependency')
          return
        }

        const data = await response.json()
        setEdges((eds) =>
          addEdge(
            {
              ...connection,
              id: data.edge.id,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#6b7280',
              },
              style: {
                stroke: '#6b7280',
                strokeWidth: 2,
              },
              animated: true,
            },
            eds
          )
        )
      } catch (error) {
        console.error('Failed to create dependency:', error)
      }
    },
    [projectId, setEdges]
  )

  // Handle edge deletion
  const onEdgeDoubleClick = useCallback(
    async (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()

      if (!confirm('이 연결을 삭제하시겠습니까?')) return

      try {
        const response = await fetch(
          `/api/projects/${projectId}/roadmap/dependencies?source=${edge.source}&target=${edge.target}`,
          { method: 'DELETE' }
        )

        if (!response.ok) throw new Error('Failed to delete dependency')

        setEdges((eds) => eds.filter((e) => e.id !== edge.id))
      } catch (error) {
        console.error('Failed to delete dependency:', error)
      }
    },
    [projectId, setEdges]
  )

  // Save node positions after drag
  const onNodeDragStop = useCallback(
    async (event: React.MouseEvent, node: Node) => {
      setIsSaving(true)
      try {
        await fetch(`/api/projects/${projectId}/roadmap`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodes: [{ id: node.id, position: node.position }],
          }),
        })
      } catch (error) {
        console.error('Failed to save position:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [projectId]
  )

  // Handle new node creation
  const handleNodeCreated = useCallback(
    async (newNode: any) => {
      setNodes((nds) => [
        ...nds,
        {
          ...newNode,
          data: {
            ...newNode.data,
            onClick: (id: string) => setSelectedNodeId(id),
          },
        },
      ])
      setIsAddDialogOpen(false)
    },
    [setNodes]
  )

  // Auto layout (simple grid)
  const autoLayout = useCallback(() => {
    const spacing = { x: 300, y: 200 }
    const cols = Math.ceil(Math.sqrt(nodes.length))

    setNodes((nds) =>
      nds.map((node, index) => ({
        ...node,
        position: {
          x: (index % cols) * spacing.x + 50,
          y: Math.floor(index / cols) * spacing.y + 50,
        },
      }))
    )

    setTimeout(() => fitView({ padding: 0.2 }), 100)
  }, [nodes.length, setNodes, fitView])

  // Handle node update from detail panel
  const handleNodeUpdate = useCallback(
    (updatedNode: RoadmapNodeType) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === updatedNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...updatedNode,
                  onClick: node.data.onClick,
                },
              }
            : node
        )
      )
    },
    [setNodes]
  )

  // Handle node deletion
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      )
      setSelectedNodeId(null)
    },
    [setNodes, setEdges]
  )

  if (isLoading) {
    return (
      <div className="w-full h-[600px] bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full h-[600px] bg-gray-950 rounded-lg border border-gray-800 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        className="bg-gray-950"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={20} size={1} />
        <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700" />
        <MiniMap
          className="!bg-gray-900 !border-gray-700 !rounded-lg"
          nodeColor={(node) => {
            const status = node.data?.status
            if (status === 'completed') return '#22c55e'
            if (status === 'running') return '#eab308'
            if (status === 'failed') return '#ef4444'
            if (status === 'ready') return '#06b6d4'
            return '#6b7280'
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
        />

        <Panel position="top-left" className="flex gap-2">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            노드 추가
          </Button>
          <Button
            onClick={autoLayout}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            자동 정렬
          </Button>
          <Button
            onClick={fetchRoadmap}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </Button>
        </Panel>

        <Panel position="top-right">
          {isSaving && (
            <div className="flex items-center gap-2 bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full text-sm">
              <Loader2 className="w-3 h-3 animate-spin" />
              저장 중...
            </div>
          )}
        </Panel>

        <Panel position="bottom-left" className="text-xs text-gray-500">
          <div className="bg-gray-900/80 px-3 py-2 rounded-lg">
            노드를 드래그하여 연결 | 엣지 더블클릭으로 삭제
          </div>
        </Panel>
      </ReactFlow>

      {/* Node Detail Panel */}
      {selectedNodeId && (
        <NodeDetailPanel
          projectId={projectId}
          nodeId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
          onUpdate={handleNodeUpdate}
          onDelete={handleNodeDelete}
        />
      )}

      {/* Add Node Dialog */}
      <AddNodeDialog
        projectId={projectId}
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onCreated={handleNodeCreated}
      />
    </div>
  )
}

// Wrapper with ReactFlowProvider
import { ReactFlowProvider } from 'reactflow'

export function RoadmapCanvasWithProvider(props: RoadmapCanvasProps) {
  return (
    <ReactFlowProvider>
      <RoadmapCanvas {...props} />
    </ReactFlowProvider>
  )
}
