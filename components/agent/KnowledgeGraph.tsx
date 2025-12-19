'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Brain,
  Users,
  MessageSquare,
  BookOpen,
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Info,
} from 'lucide-react'

// ============================================
// Types
// ============================================

export type MemoryNodeType = 'private' | 'meeting' | 'team' | 'injected' | 'execution'

export interface GraphNode {
  id: string
  type: MemoryNodeType
  label: string
  importance: number
  tags: string[]
  created_at: string
  // Computed properties for visualization
  x?: number
  y?: number
  z?: number
  vx?: number
  vy?: number
  radius?: number
}

export interface GraphEdge {
  source: string
  target: string
  type: 'linked'
}

export interface KnowledgeGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface KnowledgeGraphProps {
  data: KnowledgeGraphData
  isDark?: boolean
  height?: number
  onNodeClick?: (node: GraphNode) => void
  onNodeHover?: (node: GraphNode | null) => void
}

// ============================================
// Constants
// ============================================

const NODE_TYPE_CONFIG: Record<MemoryNodeType, { color: string; icon: React.ElementType; label: string }> = {
  private: { color: '#3b82f6', icon: MessageSquare, label: '개인 대화' },
  meeting: { color: '#22c55e', icon: Users, label: '회의' },
  team: { color: '#f59e0b', icon: Users, label: '팀' },
  injected: { color: '#8b5cf6', icon: BookOpen, label: '지식' },
  execution: { color: '#ef4444', icon: Zap, label: '실행' },
}

// ============================================
// Force Simulation
// ============================================

function runForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations = 100
): GraphNode[] {
  const nodeMap = new Map<string, GraphNode>()

  // Initialize positions
  const result = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length
    const radius = Math.min(width, height) * 0.3
    const newNode: GraphNode = {
      ...node,
      x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
      y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
      z: (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0,
      radius: 8 + (node.importance / 10) * 4,
    }
    nodeMap.set(node.id, newNode)
    return newNode
  })

  // Create adjacency for fast lookup
  const adjacency = new Map<string, Set<string>>()
  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set())
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set())
    adjacency.get(edge.source)!.add(edge.target)
    adjacency.get(edge.target)!.add(edge.source)
  })

  // Run simulation
  const alpha = 0.1
  const alphaDecay = 0.99
  let currentAlpha = alpha

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all nodes
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i]
        const b = result[j]
        const dx = (b.x || 0) - (a.x || 0)
        const dy = (b.y || 0) - (a.y || 0)
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (100 * currentAlpha) / (dist * dist)

        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        a.vx = (a.vx || 0) - fx
        a.vy = (a.vy || 0) - fy
        b.vx = (b.vx || 0) + fx
        b.vy = (b.vy || 0) + fy
      }
    }

    // Attraction for linked nodes
    edges.forEach(edge => {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) return

      const dx = (target.x || 0) - (source.x || 0)
      const dy = (target.y || 0) - (source.y || 0)
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = dist * currentAlpha * 0.01

      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      source.vx = (source.vx || 0) + fx
      source.vy = (source.vy || 0) + fy
      target.vx = (target.vx || 0) - fx
      target.vy = (target.vy || 0) - fy
    })

    // Center gravity
    result.forEach(node => {
      const dx = width / 2 - (node.x || 0)
      const dy = height / 2 - (node.y || 0)
      node.vx = (node.vx || 0) + dx * currentAlpha * 0.001
      node.vy = (node.vy || 0) + dy * currentAlpha * 0.001
    })

    // Apply velocities with damping
    result.forEach(node => {
      node.x = (node.x || 0) + (node.vx || 0)
      node.y = (node.y || 0) + (node.vy || 0)
      node.vx = (node.vx || 0) * 0.9
      node.vy = (node.vy || 0) * 0.9

      // Boundary constraints
      const padding = 50
      node.x = Math.max(padding, Math.min(width - padding, node.x || 0))
      node.y = Math.max(padding, Math.min(height - padding, node.y || 0))
    })

    currentAlpha *= alphaDecay
  }

  return result
}

// ============================================
// Graph Component
// ============================================

export function KnowledgeGraph({
  data,
  isDark = false,
  height = 400,
  onNodeClick,
  onNodeHover,
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  // Calculate node positions
  const { nodes, nodeMap } = useMemo(() => {
    if (!data.nodes.length) return { nodes: [], nodeMap: new Map() }

    const simulatedNodes = runForceSimulation(
      data.nodes,
      data.edges,
      dimensions.width,
      dimensions.height
    )

    const map = new Map<string, GraphNode>()
    simulatedNodes.forEach(n => map.set(n.id, n))

    return { nodes: simulatedNodes, nodeMap: map }
  }, [data.nodes, data.edges, dimensions])

  // Handle resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height,
        })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [height])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const dpr = window.devicePixelRatio || 1
    canvas.width = dimensions.width * dpr
    canvas.height = dimensions.height * dpr
    canvas.style.width = `${dimensions.width}px`
    canvas.style.height = `${dimensions.height}px`
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.fillStyle = isDark ? '#18181b' : '#fafafa'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Apply transformations
    ctx.save()
    ctx.translate(dimensions.width / 2 + pan.x, dimensions.height / 2 + pan.y)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom, zoom)
    ctx.translate(-dimensions.width / 2, -dimensions.height / 2)

    // Draw edges
    ctx.strokeStyle = isDark ? '#3f3f46' : '#e4e4e7'
    ctx.lineWidth = 1
    data.edges.forEach(edge => {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) return

      ctx.beginPath()
      ctx.moveTo(source.x || 0, source.y || 0)
      ctx.lineTo(target.x || 0, target.y || 0)
      ctx.stroke()
    })

    // Draw nodes
    nodes.forEach(node => {
      const config = NODE_TYPE_CONFIG[node.type]
      const isHovered = hoveredNode?.id === node.id
      const isSelected = selectedNode?.id === node.id
      const radius = (node.radius || 10) * (isHovered || isSelected ? 1.3 : 1)

      // Node shadow (3D effect)
      const shadowOffset = (node.z || 0) / 20
      ctx.beginPath()
      ctx.arc(
        (node.x || 0) + shadowOffset,
        (node.y || 0) + shadowOffset,
        radius + 2,
        0,
        Math.PI * 2
      )
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.fill()

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x || 0, node.y || 0, radius, 0, Math.PI * 2)

      // Gradient fill
      const gradient = ctx.createRadialGradient(
        (node.x || 0) - radius / 3,
        (node.y || 0) - radius / 3,
        0,
        node.x || 0,
        node.y || 0,
        radius
      )
      gradient.addColorStop(0, adjustColor(config.color, 30))
      gradient.addColorStop(1, config.color)
      ctx.fillStyle = gradient
      ctx.fill()

      // Node border
      if (isHovered || isSelected) {
        ctx.strokeStyle = isDark ? '#ffffff' : '#000000'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Node label (only for hovered/selected or high importance)
      if (isHovered || isSelected || node.importance >= 8) {
        ctx.fillStyle = isDark ? '#ffffff' : '#18181b'
        ctx.font = '10px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(
          truncateLabel(node.label, 15),
          node.x || 0,
          (node.y || 0) + radius + 14
        )
      }
    })

    ctx.restore()
  }, [nodes, data.edges, nodeMap, dimensions, isDark, hoveredNode, selectedNode, zoom, pan, rotation])

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - dimensions.width / 2 - pan.x) / zoom + dimensions.width / 2
    const y = (e.clientY - rect.top - dimensions.height / 2 - pan.y) / zoom + dimensions.height / 2

    if (isDragging) {
      const dx = e.clientX - lastMousePos.current.x
      const dy = e.clientY - lastMousePos.current.y
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      lastMousePos.current = { x: e.clientX, y: e.clientY }
      return
    }

    // Find hovered node
    let found: GraphNode | null = null
    for (const node of nodes) {
      const dx = (node.x || 0) - x
      const dy = (node.y || 0) - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= (node.radius || 10)) {
        found = node
        break
      }
    }

    setHoveredNode(found)
    onNodeHover?.(found)
    canvas.style.cursor = found ? 'pointer' : isDragging ? 'grabbing' : 'grab'
  }, [nodes, dimensions, pan, zoom, isDragging, onNodeHover])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode)
      onNodeClick?.(hoveredNode)
    } else {
      setIsDragging(true)
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    }
  }, [hoveredNode, onNodeClick])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)))
  }, [])

  // Controls
  const handleZoomIn = () => setZoom(prev => Math.min(3, prev * 1.2))
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev / 1.2))
  const handleRotate = () => setRotation(prev => prev + 45)
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setRotation(0)
    setSelectedNode(null)
  }

  if (!data.nodes.length) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
        )}
        style={{ height }}
      >
        <Brain className={cn('w-12 h-12 mb-4', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
        <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
          지식 그래프 데이터가 없습니다
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-xl border overflow-hidden',
        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
      )}
      style={{ height }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Controls */}
      <div
        className={cn(
          'absolute top-3 right-3 flex flex-col gap-1 p-1 rounded-lg',
          isDark ? 'bg-zinc-800/80' : 'bg-white/80'
        )}
      >
        <button
          onClick={handleZoomIn}
          className={cn(
            'p-1.5 rounded transition-colors',
            isDark
              ? 'hover:bg-zinc-700 text-zinc-400'
              : 'hover:bg-zinc-100 text-zinc-600'
          )}
          title="확대"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className={cn(
            'p-1.5 rounded transition-colors',
            isDark
              ? 'hover:bg-zinc-700 text-zinc-400'
              : 'hover:bg-zinc-100 text-zinc-600'
          )}
          title="축소"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleRotate}
          className={cn(
            'p-1.5 rounded transition-colors',
            isDark
              ? 'hover:bg-zinc-700 text-zinc-400'
              : 'hover:bg-zinc-100 text-zinc-600'
          )}
          title="회전"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className={cn(
            'p-1.5 rounded transition-colors',
            isDark
              ? 'hover:bg-zinc-700 text-zinc-400'
              : 'hover:bg-zinc-100 text-zinc-600'
          )}
          title="초기화"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div
        className={cn(
          'absolute bottom-3 left-3 flex flex-wrap gap-2 p-2 rounded-lg text-xs',
          isDark ? 'bg-zinc-800/80' : 'bg-white/80'
        )}
      >
        {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              {config.label}
            </span>
          </div>
        ))}
      </div>

      {/* Node Info Tooltip */}
      {hoveredNode && (
        <div
          className={cn(
            'absolute p-3 rounded-lg shadow-lg max-w-[200px] pointer-events-none',
            isDark ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900'
          )}
          style={{
            left: Math.min(
              (hoveredNode.x || 0) * zoom + pan.x + dimensions.width / 2 * (1 - zoom) + 20,
              dimensions.width - 220
            ),
            top: Math.min(
              (hoveredNode.y || 0) * zoom + pan.y + dimensions.height / 2 * (1 - zoom) - 20,
              dimensions.height - 100
            ),
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: NODE_TYPE_CONFIG[hoveredNode.type].color }}
            />
            <span className="font-medium text-sm truncate">
              {hoveredNode.label}
            </span>
          </div>
          <div className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            <p>중요도: {hoveredNode.importance}</p>
            <p>유형: {NODE_TYPE_CONFIG[hoveredNode.type].label}</p>
            {hoveredNode.tags.length > 0 && (
              <p className="truncate">태그: {hoveredNode.tags.slice(0, 3).join(', ')}</p>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div
        className={cn(
          'absolute top-3 left-3 text-xs',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}
      >
        노드 {nodes.length}개 | 연결 {data.edges.length}개
      </div>
    </div>
  )
}

// ============================================
// Helpers
// ============================================

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.min(255, ((num >> 16) & 0xff) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `rgb(${r}, ${g}, ${b})`
}

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label
  return label.slice(0, maxLength - 3) + '...'
}

// ============================================
// Knowledge Graph Panel
// ============================================

export function KnowledgeGraphPanel({
  agentId,
  isDark = false,
  className,
}: {
  agentId: string
  isDark?: boolean
  className?: string
}) {
  const [data, setData] = useState<KnowledgeGraphData>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/agents/${agentId}/memories/graph?limit=50&minImportance=3`)
        if (!res.ok) throw new Error('데이터 로드 실패')
        const result = await res.json()
        setData({
          nodes: result.nodes || [],
          edges: result.edges || [],
        })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [agentId])

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200',
          className
        )}
        style={{ height: 400 }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border text-center',
          isDark ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500',
          className
        )}
        style={{ height: 400 }}
      >
        {error}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'p-4 md:p-6 rounded-xl md:rounded-2xl border',
        isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-violet-500" />
        <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
          지식 그래프
        </h4>
        <span
          className={cn(
            'ml-auto text-xs px-2 py-0.5 rounded-full',
            isDark ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-100 text-violet-600'
          )}
        >
          {data.nodes.length}개 메모리
        </span>
      </div>

      <KnowledgeGraph
        data={data}
        isDark={isDark}
        height={350}
        onNodeClick={setSelectedNode}
      />

      {/* Selected Node Details */}
      {selectedNode && (
        <div
          className={cn(
            'mt-4 p-3 rounded-lg',
            isDark ? 'bg-zinc-900' : 'bg-white'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-violet-500" />
            <span className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-zinc-900')}>
              선택된 메모리
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className={cn(
                'ml-auto text-xs px-2 py-0.5 rounded',
                isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
              )}
            >
              닫기
            </button>
          </div>
          <p className={cn('text-sm', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
            {selectedNode.label}
          </p>
          <div className={cn('flex gap-4 mt-2 text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            <span>유형: {NODE_TYPE_CONFIG[selectedNode.type].label}</span>
            <span>중요도: {selectedNode.importance}</span>
            <span>생성: {new Date(selectedNode.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
          {selectedNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedNode.tags.map((tag, i) => (
                <span
                  key={i}
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default KnowledgeGraph
