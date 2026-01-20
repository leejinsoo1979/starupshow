'use client'

import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { useMyNeuronsStore } from '@/lib/my-neurons/store'
import type { MyNeuronNode, MyNeuronType } from '@/lib/my-neurons/types'

// ForceGraph2D를 React 외부에서 직접 관리 (Graph2DView 방식)
let ForceGraph2DClass: any = null

// 노드 타입별 색상
const NODE_COLORS: Record<MyNeuronType, string> = {
  self: '#f59e0b',
  project: '#3b82f6',
  task: '#22c55e',
  doc: '#f97316',
  person: '#a855f7',
  agent: '#06b6d4',
  objective: '#ef4444',
  key_result: '#ec4899',
  decision: '#eab308',
  memory: '#6366f1',
  workflow: '#f97316',
  insight: '#d946ef',
  program: '#10b981',
  application: '#14b8a6',
  milestone: '#8b5cf6',
  budget: '#84cc16',
}

// 노드 타입별 크기
const NODE_SIZES: Record<MyNeuronType, number> = {
  self: 14,
  project: 8,
  objective: 7,
  program: 7,
  task: 5,
  doc: 4,
  person: 6,
  agent: 6,
  key_result: 5,
  decision: 5,
  memory: 4,
  workflow: 5,
  insight: 5,
  application: 5,
  milestone: 5,
  budget: 4,
}

interface GraphNode {
  id: string
  name: string
  type: MyNeuronType
  val: number
  color: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface GraphLink {
  source: string
  target: string
}

interface Neurons2DCanvasProps {
  onNodeClick?: (node: MyNeuronNode) => void
  onBackgroundClick?: () => void
}

export function Neurons2DCanvas({ onNodeClick, onBackgroundClick }: Neurons2DCanvasProps) {
  const graphContainerRef = useRef<HTMLDivElement>(null)
  const graphInstanceRef = useRef<any>(null)
  const isGraphReadyRef = useRef(false)
  const graphDataRef = useRef<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] })

  const graph = useMyNeuronsStore((s) => s.graph)
  const selectedNodeIds = useMyNeuronsStore((s) => s.selectedNodeIds)
  const selectNode = useMyNeuronsStore((s) => s.selectNode)

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // 연결된 노드 ID 집합
  const connectedNodeIds = useMemo(() => {
    const connected = new Set<string>()
    if (selectedNodeIds.length > 0 && graph?.edges) {
      selectedNodeIds.forEach(id => {
        connected.add(id)
        graph.edges.forEach(edge => {
          if (edge.source === id) connected.add(edge.target)
          if (edge.target === id) connected.add(edge.source)
        })
      })
    }
    return connected
  }, [selectedNodeIds, graph?.edges])

  // 그래프 데이터 변환
  const graphData = useMemo(() => {
    if (!graph?.nodes || !graph?.edges) return { nodes: [], links: [] }

    // 타입별로 다른 영역에 초기 배치
    const typeAngles: Record<string, number> = {
      self: 0,
      project: 0,
      objective: Math.PI / 4,
      program: Math.PI / 2,
      task: (3 * Math.PI) / 4,
      doc: Math.PI,
      person: (5 * Math.PI) / 4,
      agent: (3 * Math.PI) / 2,
      key_result: (7 * Math.PI) / 8,
      decision: Math.PI / 8,
      memory: (5 * Math.PI) / 8,
      workflow: (11 * Math.PI) / 8,
      insight: (13 * Math.PI) / 8,
      application: (15 * Math.PI) / 8,
      milestone: (3 * Math.PI) / 8,
      budget: (9 * Math.PI) / 8,
    }

    // 타입별 카운터
    const typeCounters: Record<string, number> = {}

    const nodes: GraphNode[] = graph.nodes.map((node) => {
      const isSelf = node.type === 'self'

      if (isSelf) {
        return {
          id: node.id,
          name: node.title,
          type: node.type,
          val: NODE_SIZES[node.type] || 5,
          color: NODE_COLORS[node.type] || '#6b7280',
          fx: 0, fy: 0, x: 0, y: 0,
        }
      }

      // 같은 타입의 노드끼리 인덱스 부여
      typeCounters[node.type] = (typeCounters[node.type] || 0) + 1
      const typeIndex = typeCounters[node.type]

      // 타입별 기본 각도 + 오프셋
      const baseAngle = typeAngles[node.type] || 0
      const angleOffset = (typeIndex - 1) * 0.3
      const angle = baseAngle + angleOffset

      // 거리: 타입별로 다르게 + 인덱스에 따라 증가
      const baseDistance = 150 + typeIndex * 40

      return {
        id: node.id,
        name: node.title,
        type: node.type,
        val: NODE_SIZES[node.type] || 5,
        color: NODE_COLORS[node.type] || '#6b7280',
        x: Math.cos(angle) * baseDistance + (Math.random() - 0.5) * 50,
        y: Math.sin(angle) * baseDistance + (Math.random() - 0.5) * 50,
      }
    })

    const nodeIds = new Set(nodes.map(n => n.id))
    const links: GraphLink[] = graph.edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => ({ source: e.source, target: e.target }))

    return { nodes, links }
  }, [graph])

  // graphDataRef 업데이트
  useEffect(() => {
    graphDataRef.current = graphData
  }, [graphData])

  // 노드 렌더링
  const renderNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!isFinite(node.x) || !isFinite(node.y)) return

    const isSelected = selectedNodeIds.includes(node.id)
    const isHovered = hoveredNodeId === node.id
    const hasSelection = selectedNodeIds.length > 0
    const isConnected = connectedNodeIds.has(node.id)
    const isDimmed = hasSelection && !isConnected && !isSelected && !isHovered

    const baseSize = node.val || 5
    const sizeMultiplier = isSelected ? 1.5 : isConnected ? 1.1 : 1
    const actualSize = baseSize * sizeMultiplier

    ctx.globalAlpha = isDimmed ? 0.15 : 1.0

    // 글로우 효과
    if (isSelected) {
      ctx.shadowColor = node.color
      ctx.shadowBlur = 15 / globalScale
    } else if (isHovered) {
      ctx.shadowColor = node.color
      ctx.shadowBlur = 8 / globalScale
    } else {
      ctx.shadowBlur = 0
    }

    // 노드 원
    ctx.beginPath()
    ctx.arc(node.x, node.y, actualSize, 0, Math.PI * 2)
    ctx.fillStyle = node.color
    ctx.fill()

    // 테두리
    if (isSelected) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()
    } else if (isHovered) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1 / globalScale
      ctx.stroke()
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1.0

    // 라벨 - 줌인 시(globalScale > 3) 또는 선택/호버/self 노드만 표시
    const showLabel = globalScale > 3 || isSelected || isHovered || node.type === 'self'
    if (showLabel && !isDimmed) {
      const fontSize = Math.max(10, 12 / globalScale)
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3 / globalScale
      const label = node.name?.length > 12 ? node.name.slice(0, 12) + '...' : node.name
      ctx.strokeText(label || '', node.x, node.y + actualSize + 4)
      ctx.fillText(label || '', node.x, node.y + actualSize + 4)
    }
  }, [selectedNodeIds, hoveredNodeId, connectedNodeIds])

  // 노드 클릭
  const handleNodeClick = useCallback((node: any) => {
    selectNode(node.id)
    if (onNodeClick && graph?.nodes) {
      const orig = graph.nodes.find(n => n.id === node.id)
      if (orig) onNodeClick(orig)
    }
  }, [selectNode, onNodeClick, graph?.nodes])

  // 그래프 초기화
  useEffect(() => {
    if (!graphContainerRef.current || typeof window === 'undefined') return
    if (isGraphReadyRef.current) return

    let mounted = true

    const initGraph = async () => {
      try {
        if (!ForceGraph2DClass) {
          const module = await import('force-graph')
          ForceGraph2DClass = module.default
        }

        if (!mounted || !graphContainerRef.current) return

        const container = graphContainerRef.current
        const fg = ForceGraph2DClass()(container)
          .backgroundColor('#0d1117')
          .width(container.clientWidth || 800)
          .height(container.clientHeight || 600)
          .nodeCanvasObject((node: any, ctx: any, scale: number) => renderNode(node, ctx, scale))
          .nodePointerAreaPaint((node: any, color: string, ctx: CanvasRenderingContext2D) => {
            ctx.beginPath()
            ctx.arc(node.x, node.y, (node.val || 5) + 5, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
          })
          .linkColor(() => 'rgba(255,255,255,0.3)')
          .linkWidth(1)
          .onNodeClick(handleNodeClick)
          .onNodeHover((node: any) => setHoveredNodeId(node?.id || null))
          .onBackgroundClick(() => onBackgroundClick?.())
          .onNodeDragEnd((node: any) => {
            node.fx = node.x
            node.fy = node.y
          })
          .linkDirectionalParticles(0)
          .d3VelocityDecay(0.4)
          .d3AlphaDecay(0.02)
          .cooldownTicks(200)
          .warmupTicks(100)
          .enableNodeDrag(true)
          .enableZoomPanInteraction(true)
          .minZoom(0.1)
          .maxZoom(10)

        // Force 설정 - 노드 겹침 방지를 위해 강화
        fg.d3Force('collide')?.radius(50).strength(1).iterations(6)
        fg.d3Force('center')?.strength(0.02)
        fg.d3Force('charge')?.strength(-400).distanceMax(600)
        fg.d3Force('link')?.distance(120).strength(0.3)

        graphInstanceRef.current = fg
        isGraphReadyRef.current = true

        // 데이터 로드
        setTimeout(() => {
          if (mounted && graphInstanceRef.current && graphDataRef.current.nodes.length > 0) {
            graphInstanceRef.current.graphData(graphDataRef.current)
            graphInstanceRef.current.centerAt(0, 0, 300)
            graphInstanceRef.current.zoom(0.8, 300)
          }
        }, 100)
      } catch (error) {
        console.error('[Neurons2DCanvas] Init error:', error)
      }
    }

    initGraph()

    return () => {
      mounted = false
    }
  }, [])

  // 데이터 업데이트
  useEffect(() => {
    if (!graphInstanceRef.current || graphData.nodes.length === 0) return

    graphInstanceRef.current.graphData(graphData)

    setTimeout(() => {
      graphInstanceRef.current?.centerAt(0, 0, 300)
      graphInstanceRef.current?.zoom(0.8, 300)
    }, 200)
  }, [graphData])

  // 리사이즈
  useEffect(() => {
    if (!graphContainerRef.current || !graphInstanceRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        graphInstanceRef.current?.width(entry.contentRect.width)
        graphInstanceRef.current?.height(entry.contentRect.height)
      }
    })

    observer.observe(graphContainerRef.current)
    return () => observer.disconnect()
  }, [])

  // 렌더링 업데이트
  useEffect(() => {
    graphInstanceRef.current?.nodeCanvasObject((node: any, ctx: any, scale: number) => renderNode(node, ctx, scale))
  }, [renderNode])

  return (
    <div
      ref={graphContainerRef}
      className="w-full h-full bg-[#0d1117]"
      style={{ position: 'relative' }}
    />
  )
}

export default Neurons2DCanvas
