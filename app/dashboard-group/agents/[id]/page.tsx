"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from "reactflow"
import "reactflow/dist/style.css"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Play,
  Pause,
  Settings,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Bot,
  MessageSquare,
  FileText,
  Code,
  Database,
  Image as ImageIcon,
  GitBranch,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useThemeStore, accentColors } from "@/stores/themeStore"
import type { DeployedAgent } from "@/types/database"

// Node type icons
const nodeTypeIcons: Record<string, React.ElementType> = {
  start: Play,
  end: CheckCircle2,
  input: FileText,
  output: FileText,
  prompt: MessageSquare,
  llm: Bot,
  router: GitBranch,
  javascript: Code,
  memory: Database,
  rag: Database,
  image_generation: ImageIcon,
  tool: Zap,
  custom_tool: Zap,
  embedding: Database,
}

// Node status colors
const nodeStatusColors = {
  idle: { bg: "#374151", border: "#4B5563", text: "#9CA3AF" },
  running: { bg: "#1E40AF", border: "#3B82F6", text: "#93C5FD" },
  completed: { bg: "#065F46", border: "#10B981", text: "#6EE7B7" },
  error: { bg: "#991B1B", border: "#EF4444", text: "#FCA5A5" },
}

type NodeStatus = "idle" | "running" | "completed" | "error"

// 노드 타입별 색상
const nodeTypeColors: Record<string, { bg: string; border: string; icon: string }> = {
  start: { bg: "#064E3B", border: "#10B981", icon: "#34D399" },
  end: { bg: "#7F1D1D", border: "#EF4444", icon: "#FCA5A5" },
  input: { bg: "#1E3A5F", border: "#3B82F6", icon: "#93C5FD" },
  output: { bg: "#1E3A5F", border: "#3B82F6", icon: "#93C5FD" },
  prompt: { bg: "#4C1D95", border: "#8B5CF6", icon: "#C4B5FD" },
  llm: { bg: "#831843", border: "#EC4899", icon: "#F9A8D4" },
  router: { bg: "#78350F", border: "#F59E0B", icon: "#FCD34D" },
  javascript: { bg: "#365314", border: "#84CC16", icon: "#BEF264" },
  memory: { bg: "#164E63", border: "#06B6D4", icon: "#67E8F9" },
  rag: { bg: "#164E63", border: "#06B6D4", icon: "#67E8F9" },
  tool: { bg: "#78350F", border: "#F59E0B", icon: "#FCD34D" },
  image_generation: { bg: "#701A75", border: "#D946EF", icon: "#F0ABFC" },
}

// Custom node component
function WorkflowNode({ data, selected, type }: { data: any; selected: boolean; type?: string }) {
  const Icon = nodeTypeIcons[data.type || type] || Bot
  const status: NodeStatus = data.status || "idle"
  const statusColors = nodeStatusColors[status]
  const nodeType = data.type || type || "default"
  const typeColors = nodeTypeColors[nodeType] || { bg: "#374151", border: "#6B7280", icon: "#9CA3AF" }

  // 시작 노드: 출력 핸들만 (오른쪽)
  // 끝 노드: 입력 핸들만 (왼쪽)
  // 나머지: 양쪽 다 있음
  const isStartNode = nodeType === "start"
  const isEndNode = nodeType === "end"

  // 실행 상태에 따른 색상 결정
  const currentBg = status !== "idle" ? statusColors.bg : typeColors.bg
  const currentBorder = status !== "idle" ? statusColors.border : typeColors.border
  const currentText = status !== "idle" ? statusColors.text : typeColors.icon

  return (
    <>
      {/* 입력 핸들 (왼쪽) - 시작 노드 제외 */}
      {!isStartNode && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: 12,
            height: 12,
            background: currentBorder,
            border: `2px solid ${currentBg}`,
          }}
        />
      )}

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{
          scale: status === "running" ? [1, 1.03, 1] : 1,
          opacity: 1,
        }}
        transition={{
          scale: { duration: 1, repeat: status === "running" ? Infinity : 0 },
        }}
        className={`
          px-4 py-3 rounded-xl min-w-[180px] transition-all duration-300
          ${selected ? "ring-2 ring-white" : ""}
          ${status === "running" ? "shadow-lg" : ""}
        `}
        style={{
          backgroundColor: currentBg,
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: currentBorder,
          boxShadow: status === "running"
            ? `0 0 20px ${currentBorder}50`
            : status === "completed"
            ? `0 0 10px ${currentBorder}30`
            : "none",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${currentBorder}30` }}
          >
            {status === "running" ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: currentText }} />
            ) : status === "completed" ? (
              <CheckCircle2 className="w-5 h-5" style={{ color: "#10B981" }} />
            ) : status === "error" ? (
              <XCircle className="w-5 h-5" style={{ color: "#EF4444" }} />
            ) : (
              <Icon className="w-5 h-5" style={{ color: currentText }} />
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">
              {data.label || nodeType}
            </div>
            <div className="text-xs text-zinc-400">
              {nodeType}
            </div>
          </div>
        </div>
        {data.result && status === "completed" && (
          <div className="mt-2 pt-2 border-t border-zinc-700 text-xs text-zinc-300 truncate max-w-[200px]">
            {typeof data.result === "string" ? data.result.slice(0, 50) + "..." : "완료"}
          </div>
        )}
      </motion.div>

      {/* 출력 핸들 (오른쪽) - 끝 노드 제외 */}
      {!isEndNode && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: 12,
            height: 12,
            background: currentBorder,
            border: `2px solid ${currentBg}`,
          }}
        />
      )}
    </>
  )
}

const nodeTypes = {
  default: WorkflowNode,
  start: WorkflowNode,
  end: WorkflowNode,
  input: WorkflowNode,
  output: WorkflowNode,
  prompt: WorkflowNode,
  llm: WorkflowNode,
  router: WorkflowNode,
  javascript: WorkflowNode,
  memory: WorkflowNode,
  rag: WorkflowNode,
  image_generation: WorkflowNode,
  tool: WorkflowNode,
  custom_tool: WorkflowNode,
  embedding: WorkflowNode,
}

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  const [agent, setAgent] = useState<DeployedAgent | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [executionLog, setExecutionLog] = useState<string[]>([])
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({})
  const [mounted, setMounted] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const { accentColor } = useThemeStore()
  const currentAccent = accentColors.find((c) => c.id === accentColor) || accentColors[0]

  useEffect(() => {
    setMounted(true)
    fetchAgent()
  }, [agentId])

  const fetchAgent = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agents/${agentId}`)
      if (!res.ok) throw new Error("에이전트를 불러오는데 실패했습니다")
      const data = await res.json()
      setAgent(data)

      // Convert workflow nodes to ReactFlow format
      const flowNodes: Node[] = (data.workflow_nodes || []).map((node: any) => ({
        id: node.id,
        type: node.type || "default",
        position: node.position || { x: 0, y: 0 },
        data: {
          ...node.data,
          type: node.type,
          label: node.data?.label || node.type,
          status: "idle",
        },
      }))

      // Convert workflow edges to ReactFlow format
      const flowEdges: Edge[] = (data.workflow_edges || []).map((edge: any) => {
        const flowEdge: Edge = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: false,
          type: 'smoothstep',
          style: { stroke: "#6B7280", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6B7280" },
        }
        // sourceHandle/targetHandle가 있을 때만 설정 (undefined면 기본 핸들 사용)
        if (edge.sourceHandle) flowEdge.sourceHandle = edge.sourceHandle
        if (edge.targetHandle) flowEdge.targetHandle = edge.targetHandle
        return flowEdge
      })

      setNodes(flowNodes)
      setEdges(flowEdges)

      // Initialize node statuses
      const statuses: Record<string, NodeStatus> = {}
      flowNodes.forEach((n) => (statuses[n.id] = "idle"))
      setNodeStatuses(statuses)
    } catch (error) {
      console.error("Agent fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Update nodes when statuses change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: nodeStatuses[node.id] || "idle",
        },
      }))
    )
  }, [nodeStatuses, setNodes])

  // Update edges when execution is running
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: executing && (
          nodeStatuses[edge.source] === "completed" &&
          nodeStatuses[edge.target] === "running"
        ),
        style: {
          ...edge.style,
          stroke: nodeStatuses[edge.source] === "completed"
            ? "#10B981"  // 완료된 연결은 녹색
            : "#6B7280",
          strokeWidth: nodeStatuses[edge.source] === "completed" ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: executing && nodeStatuses[edge.source] === "completed"
            ? "#3B82F6"
            : "#4B5563",
        },
      }))
    )
  }, [nodeStatuses, executing, setEdges])

  const handleExecute = async () => {
    setExecuting(true)
    setExecutionLog([])

    // Reset all node statuses
    const initialStatuses: Record<string, NodeStatus> = {}
    nodes.forEach((n) => (initialStatuses[n.id] = "idle"))
    setNodeStatuses(initialStatuses)

    try {
      // Find execution order (topological sort based on edges)
      const nodeOrder = getExecutionOrder(nodes, edges)

      setExecutionLog((prev) => [...prev, `실행 시작: ${agent?.name}`])

      for (const nodeId of nodeOrder) {
        const node = nodes.find((n) => n.id === nodeId)
        if (!node) continue

        setCurrentNodeId(nodeId)
        setNodeStatuses((prev) => ({ ...prev, [nodeId]: "running" }))
        setExecutionLog((prev) => [...prev, `노드 실행 중: ${node.data.label || node.type}`])

        // Simulate execution delay
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000))

        // For demo, randomly fail sometimes (10% chance)
        const failed = Math.random() < 0.1 && node.type !== "start" && node.type !== "end"

        if (failed) {
          setNodeStatuses((prev) => ({ ...prev, [nodeId]: "error" }))
          setExecutionLog((prev) => [...prev, `오류 발생: ${node.data.label || node.type}`])
          break
        }

        setNodeStatuses((prev) => ({ ...prev, [nodeId]: "completed" }))
        setExecutionLog((prev) => [...prev, `완료: ${node.data.label || node.type}`])
      }

      setExecutionLog((prev) => [...prev, "실행 완료!"])
    } catch (error) {
      setExecutionLog((prev) => [...prev, `오류: ${error}`])
    } finally {
      setExecuting(false)
      setCurrentNodeId(null)
    }
  }

  const handleReset = () => {
    const initialStatuses: Record<string, NodeStatus> = {}
    nodes.forEach((n) => (initialStatuses[n.id] = "idle"))
    setNodeStatuses(initialStatuses)
    setExecutionLog([])
  }

  // Get execution order using topological sort
  const getExecutionOrder = (nodes: Node[], edges: Edge[]): string[] => {
    const order: string[] = []
    const visited = new Set<string>()
    const adjacency: Record<string, string[]> = {}

    // Build adjacency list
    nodes.forEach((n) => (adjacency[n.id] = []))
    edges.forEach((e) => {
      if (adjacency[e.source]) {
        adjacency[e.source].push(e.target)
      }
    })

    // Find start node
    const startNode = nodes.find((n) => n.type === "start")
    if (!startNode) return nodes.map((n) => n.id)

    // BFS from start
    const queue = [startNode.id]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      order.push(current)

      const neighbors = adjacency[current] || []
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          queue.push(neighbor)
        }
      })
    }

    return order
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400">
        <XCircle className="w-12 h-12 mb-4" />
        <p>에이전트를 찾을 수 없습니다</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          돌아가기
        </Button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <img
              src={agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
              alt={agent.name}
              className="w-10 h-10 rounded-xl"
            />
            <div>
              <h1 className="text-lg font-bold text-white">{agent.name}</h1>
              <p className="text-sm text-zinc-400">{agent.description || "설명 없음"}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={executing}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            초기화
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/agent-builder/${agentId}`)}
          >
            <Settings className="w-4 h-4 mr-2" />
            편집
          </Button>
          <Button
            onClick={handleExecute}
            disabled={executing || nodes.length === 0}
            style={{
              backgroundColor: mounted ? currentAccent.color : "#8b5cf6",
            }}
            className="text-white"
          >
            {executing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                실행 중...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                실행
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Workflow Canvas */}
        <div className="flex-1 relative">
          {nodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <Bot className="w-16 h-16 mb-4 opacity-50" />
              <p>워크플로우가 없습니다</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push(`/agent-builder/${agentId}`)}
              >
                워크플로우 만들기
              </Button>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={true}
              className="bg-zinc-950"
            >
              <Background color="#27272a" gap={20} />
              <Controls className="bg-zinc-800 border-zinc-700" />
              <MiniMap
                className="bg-zinc-900 border border-zinc-700"
                nodeColor={(node) => {
                  const status = nodeStatuses[node.id] || "idle"
                  return nodeStatusColors[status].border
                }}
              />
            </ReactFlow>
          )}

        </div>

        {/* Execution Log Panel */}
        <div className="w-80 border-l border-zinc-800 bg-zinc-900/50 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300">실행 로그</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {executionLog.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">
                실행 버튼을 눌러 워크플로우를 실행하세요
              </p>
            ) : (
              executionLog.map((log, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-sm px-3 py-2 rounded-lg ${
                    log.includes("오류")
                      ? "bg-red-900/30 text-red-400"
                      : log.includes("완료")
                      ? "bg-green-900/30 text-green-400"
                      : log.includes("실행 중")
                      ? "bg-blue-900/30 text-blue-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{log}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Agent Info */}
          <div className="border-t border-zinc-800 p-4">
            <h4 className="text-xs font-semibold text-zinc-500 mb-2">에이전트 정보</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">모델</span>
                <span className="text-zinc-300">{agent.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">노드 수</span>
                <span className="text-zinc-300">{nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">상태</span>
                <span className={`${agent.status === "ACTIVE" ? "text-green-400" : "text-zinc-400"}`}>
                  {agent.status === "ACTIVE" ? "활성" : "비활성"}
                </span>
              </div>
            </div>

            {/* Capabilities */}
            {agent.capabilities && agent.capabilities.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-zinc-500 mb-2">기능</h4>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities
                    .filter((cap: string) => !cap.startsWith("team:"))
                    .map((cap: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: `${currentAccent.color}20`,
                          color: currentAccent.color,
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
