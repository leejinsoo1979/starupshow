"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow"
import "reactflow/dist/style.css"
import { motion } from "framer-motion"
import {
  Save,
  Upload,
  Play,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  FileJson,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { AgentNodeLibrary } from "./AgentNodeLibrary"
import { AgentConfigPanel } from "./AgentConfigPanel"
import {
  LLMNode,
  RouterNode,
  MemoryNode,
  ToolNode,
  RAGNode,
  InputNode,
  OutputNode,
  ChainNode,
  EvaluatorNode,
  FunctionNode,
} from "./nodes"
import {
  createAgentNode,
  validateAgent,
  exportAgentToJson,
  importAgentFromJson,
  AGENT_TEMPLATES,
} from "@/lib/agent"
import type { AgentNodeData, AgentType } from "@/lib/agent"

const nodeTypes: NodeTypes = {
  llm: LLMNode,
  router: RouterNode,
  memory: MemoryNode,
  tool: ToolNode,
  rag: RAGNode,
  input: InputNode,
  output: OutputNode,
  chain: ChainNode,
  evaluator: EvaluatorNode,
  function: FunctionNode,
}

const initialNodes: Node<AgentNodeData>[] = [
  createAgentNode({ type: "input", position: { x: 100, y: 200 } }),
]

const initialEdges: Edge[] = []

function AgentBuilderInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node<AgentNodeData> | null>(null)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    errors: string[]
  } | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const { project, fitView, zoomIn, zoomOut } = useReactFlow()

  // History for undo/redo
  const [history, setHistory] = useState<{ nodes: Node<AgentNodeData>[]; edges: Edge[] }[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Save to history on changes
  useEffect(() => {
    const newHistoryItem = { nodes: [...nodes], edges: [...edges] }
    if (historyIndex === -1 || JSON.stringify(history[historyIndex]) !== JSON.stringify(newHistoryItem)) {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(newHistoryItem)
      if (newHistory.length > 50) newHistory.shift()
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#8b5cf6", strokeWidth: 2 },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData("application/agentflow") as AgentType
      if (!type || !reactFlowWrapper.current) return

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNode = createAgentNode({ type, position })
      setNodes((nds) => [...nds, newNode])
    },
    [project, setNodes]
  )

  const onDragStart = useCallback((event: React.DragEvent, nodeType: AgentType) => {
    event.dataTransfer.setData("application/agentflow", nodeType)
    event.dataTransfer.effectAllowed = "move"
  }, [])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<AgentNodeData>) => {
      setSelectedNode(node)
    },
    []
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Partial<AgentNodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      )
      setSelectedNode((prev) =>
        prev?.id === nodeId
          ? { ...prev, data: { ...prev.data, ...data } }
          : prev
      )
    },
    [setNodes]
  )

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      )
      setSelectedNode(null)
    },
    [setNodes, setEdges]
  )

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setNodes(prevState.nodes)
      setEdges(prevState.edges)
      setHistoryIndex(historyIndex - 1)
    }
  }, [history, historyIndex, setNodes, setEdges])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setNodes(nextState.nodes)
      setEdges(nextState.edges)
      setHistoryIndex(historyIndex + 1)
    }
  }, [history, historyIndex, setNodes, setEdges])

  const handleClearCanvas = useCallback(() => {
    if (confirm("모든 노드를 삭제하시겠습니까?")) {
      setNodes([])
      setEdges([])
      setSelectedNode(null)
    }
  }, [setNodes, setEdges])

  const handleValidate = useCallback(() => {
    const result = validateAgent(nodes, edges)
    setValidationResult(result)
    setTimeout(() => setValidationResult(null), 5000)
  }, [nodes, edges])

  const handleSave = useCallback(() => {
    const json = exportAgentToJson(nodes, edges, { name: "My Agent" })
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `agent-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges])

  const handleLoad = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = importAgentFromJson(ev.target?.result as string)
        if (result) {
          setNodes(result.nodes)
          setEdges(result.edges as Edge[])
          fitView()
        } else {
          alert("유효하지 않은 에이전트 파일입니다.")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [setNodes, setEdges, fitView])

  const handleLoadTemplate = useCallback(
    (templateId: string) => {
      const template = AGENT_TEMPLATES.find((t) => t.id === templateId)
      if (template) {
        setNodes(template.nodes)
        setEdges(template.edges as Edge[])
        fitView()
        setShowTemplates(false)
      }
    },
    [setNodes, setEdges, fitView]
  )

  const handleExecute = useCallback(async () => {
    const validation = validateAgent(nodes, edges)
    if (!validation.valid) {
      setValidationResult(validation)
      return
    }

    setIsExecuting(true)
    // Simulate execution
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsExecuting(false)
    setValidationResult({ valid: true, errors: [] })
    setTimeout(() => setValidationResult(null), 3000)
  }, [nodes, edges])

  const handleCopyJson = useCallback(() => {
    const json = exportAgentToJson(nodes, edges, { name: "My Agent" })
    navigator.clipboard.writeText(json)
    alert("JSON이 클립보드에 복사되었습니다!")
  }, [nodes, edges])

  return (
    <div className="flex h-full bg-zinc-950">
      {/* Node Library */}
      <AgentNodeLibrary onDragStart={onDragStart} />

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
            style: { stroke: "#8b5cf6", strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
          <Controls
            className="!bg-zinc-800 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-700"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-zinc-800 !border-zinc-700 !rounded-lg"
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                llm: "#8b5cf6",
                router: "#f59e0b",
                memory: "#06b6d4",
                tool: "#ec4899",
                rag: "#10b981",
                input: "#3b82f6",
                output: "#22c55e",
                chain: "#6366f1",
                evaluator: "#f97316",
                function: "#64748b",
              }
              return colors[node.type || ""] || "#3f3f46"
            }}
            maskColor="rgba(0,0,0,0.7)"
          />

          {/* Toolbar */}
          <Panel position="top-right" className="flex gap-2">
            <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="실행 취소"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="다시 실행"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
              <Button variant="ghost" size="sm" onClick={() => zoomIn()} title="확대">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => zoomOut()} title="축소">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => fitView()} title="화면에 맞춤">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                title="템플릿"
              >
                <FileJson className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSave} title="저장">
                <Save className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLoad} title="불러오기">
                <Upload className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopyJson} title="JSON 복사">
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCanvas}
                className="text-red-400 hover:text-red-300"
                title="모두 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleValidate}
                title="검증"
              >
                검증
              </Button>
              <Button
                onClick={handleExecute}
                disabled={isExecuting}
                className="bg-violet-600 hover:bg-violet-700 text-white"
                size="sm"
              >
                {isExecuting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    실행 중...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    테스트
                  </>
                )}
              </Button>
            </div>
          </Panel>

          {/* Templates Panel */}
          {showTemplates && (
            <Panel position="top-center" className="mt-14">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 min-w-[400px] max-w-[600px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    에이전트 템플릿
                  </h3>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {AGENT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleLoadTemplate(template.id)}
                      className="p-3 bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-left transition-colors"
                    >
                      <div className="text-sm font-medium text-zinc-100">
                        {template.nameKo}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {template.descriptionKo}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </Panel>
          )}

          {/* Validation Result Toast */}
          {validationResult && (
            <Panel position="bottom-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
                  validationResult.valid
                    ? "bg-green-500/20 border border-green-500/30 text-green-400"
                    : "bg-red-500/20 border border-red-500/30 text-red-400"
                }`}
              >
                {validationResult.valid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>에이전트 설정이 유효합니다!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <div>
                      {validationResult.errors.map((error, i) => (
                        <div key={i}>{error}</div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Config Panel */}
      <AgentConfigPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdate={handleNodeUpdate}
        onDelete={handleNodeDelete}
      />
    </div>
  )
}

export function AgentBuilder() {
  return (
    <ReactFlowProvider>
      <AgentBuilderInner />
    </ReactFlowProvider>
  )
}
