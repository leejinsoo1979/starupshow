// @ts-nocheck
'use client'

import { useRef, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import * as THREE from 'three'
import { useMyNeuronsStore } from '@/lib/my-neurons/store'
import { NODE_COLORS, STATUS_COLORS, NODE_RENDERING } from '@/lib/my-neurons/constants'
import type { MyNeuronNode, MyNeuronEdge } from '@/lib/my-neurons/types'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  User,
  FolderKanban,
  CheckSquare,
  FileText,
  Users,
  Bot,
  Target,
  TrendingUp,
  Zap,
  Brain,
  GitBranch,
  Lightbulb,
  Building2,
  ClipboardList,
  Flag,
  Wallet,
} from 'lucide-react'

// Dynamic import for SSR compatibility
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#0a0a0f]">
      <div className="text-zinc-500">Loading 3D Graph...</div>
    </div>
  ),
})

// Node type icon mapping
const NODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  self: User,
  project: FolderKanban,
  task: CheckSquare,
  doc: FileText,
  person: Users,
  agent: Bot,
  objective: Target,
  key_result: TrendingUp,
  decision: Zap,
  memory: Brain,
  workflow: GitBranch,
  insight: Lightbulb,
  program: Building2,
  application: ClipboardList,
  milestone: Flag,
  budget: Wallet,
}

// Create node sprite texture
function createNodeSprite(
  node: MyNeuronNode,
  isSelected: boolean,
  isHovered: boolean
): THREE.Sprite {
  const canvas = document.createElement('canvas')
  const size = 128
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Background circle
  const baseColor = node.status === 'blocked' || node.status === 'urgent'
    ? STATUS_COLORS[node.status]
    : NODE_COLORS[node.type]

  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2)
  ctx.fillStyle = baseColor
  ctx.fill()

  // Selection ring
  if (isSelected || isHovered) {
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)'
    ctx.lineWidth = isSelected ? 4 : 2
    ctx.stroke()
  }

  // Icon
  const IconComponent = NODE_ICONS[node.type]
  if (IconComponent) {
    const iconSvg = renderToStaticMarkup(
      <IconComponent className="w-16 h-16" />
    )
    const img = new Image()
    img.src = 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">${iconSvg}</svg>`
    )
  }

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: node.status === 'completed' ? 0.5 : 1,
  })
  const sprite = new THREE.Sprite(material)

  // Size based on importance and type
  let scale = NODE_RENDERING.baseSize
  if (node.type === 'self') scale *= NODE_RENDERING.selfScale
  scale += (node.importance / 10) * NODE_RENDERING.importanceMultiplier
  scale = Math.max(NODE_RENDERING.minSize, Math.min(NODE_RENDERING.maxSize, scale))

  sprite.scale.set(scale, scale, 1)

  return sprite
}

interface NeuronsGraphProps {
  onNodeClick?: (node: MyNeuronNode) => void
  onNodeRightClick?: (node: MyNeuronNode, event: MouseEvent) => void
  onBackgroundClick?: () => void
}

export function NeuronsGraph({
  onNodeClick,
  onNodeRightClick,
  onBackgroundClick,
}: NeuronsGraphProps) {
  const graphRef = useRef<any>(null)

  const graph = useMyNeuronsStore((s) => s.graph)
  const selectedNodeIds = useMyNeuronsStore((s) => s.selectedNodeIds)
  const layoutMode = useMyNeuronsStore((s) => s.layoutMode)
  const showBottlenecksOnly = useMyNeuronsStore((s) => s.showBottlenecksOnly)
  const filterByType = useMyNeuronsStore((s) => s.filterByType)
  const filterByStatus = useMyNeuronsStore((s) => s.filterByStatus)

  const selectNode = useMyNeuronsStore((s) => s.selectNode)
  const clearSelection = useMyNeuronsStore((s) => s.clearSelection)
  const focusOnNode = useMyNeuronsStore((s) => s.focusOnNode)

  // Filter nodes
  const filteredNodes = useMemo(() => {
    if (!graph?.nodes) return []

    return graph.nodes.filter((node) => {
      // Type filter
      if (filterByType.length > 0 && !filterByType.includes(node.type)) {
        return false
      }
      // Status filter
      if (filterByStatus.length > 0 && !filterByStatus.includes(node.status)) {
        return false
      }
      // Bottleneck filter
      if (showBottlenecksOnly) {
        return node.status === 'blocked' || node.status === 'urgent' || node.status === 'attention'
      }
      return true
    })
  }, [graph?.nodes, filterByType, filterByStatus, showBottlenecksOnly])

  // Filter edges to only include those connecting visible nodes
  const filteredEdges = useMemo(() => {
    if (!graph?.edges) return []

    const nodeIds = new Set(filteredNodes.map((n) => n.id))
    return graph.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    )
  }, [graph?.edges, filteredNodes])

  // Graph data for react-force-graph
  const graphData = useMemo(() => {
    return {
      nodes: filteredNodes.map((node) => ({
        id: node.id,
        ...node,
      })),
      links: filteredEdges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        ...edge,
      })),
    }
  }, [filteredNodes, filteredEdges])

  // Handle node click
  const handleNodeClick = useCallback(
    (node: any, event: MouseEvent) => {
      event.stopPropagation()
      selectNode(node.id, event.shiftKey)
      onNodeClick?.(node as MyNeuronNode)
    },
    [selectNode, onNodeClick]
  )

  // Handle node right click
  const handleNodeRightClick = useCallback(
    (node: any, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      onNodeRightClick?.(node as MyNeuronNode, event)
    },
    [onNodeRightClick]
  )

  // Handle background click
  const handleBackgroundClick = useCallback(() => {
    clearSelection()
    onBackgroundClick?.()
  }, [clearSelection, onBackgroundClick])

  // Custom node rendering
  const nodeThreeObject = useCallback(
    (node: any) => {
      const isSelected = selectedNodeIds.includes(node.id)

      // Create sphere geometry
      const geometry = new THREE.SphereGeometry(
        node.type === 'self' ? 4 : 2 + (node.importance / 20),
        32,
        32
      )

      // Get color based on status or type
      const baseColor =
        node.status === 'blocked' || node.status === 'urgent'
          ? STATUS_COLORS[node.status]
          : NODE_COLORS[node.type]

      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: isSelected ? 0.8 : 0.3,
        roughness: 0.4,
        metalness: 0.6,
        transparent: node.status === 'completed',
        opacity: node.status === 'completed' ? 0.4 : 1,
      })

      const mesh = new THREE.Mesh(geometry, material)

      // Add selection outline
      if (isSelected) {
        const outlineGeometry = new THREE.SphereGeometry(
          (node.type === 'self' ? 4 : 2 + node.importance / 20) * 1.2,
          16,
          16
        )
        const outlineMaterial = new THREE.MeshBasicMaterial({
          color: '#ffffff',
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.3,
        })
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial)
        mesh.add(outline)
      }

      return mesh
    },
    [selectedNodeIds]
  )

  // Custom link rendering
  const linkThreeObject = useCallback((link: any) => {
    const edge = link as MyNeuronEdge

    // Create line material
    const color =
      edge.type === 'blocks'
        ? '#EF4444'
        : edge.type === 'depends_on'
        ? '#F59E0B'
        : '#3B82F6'

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: edge.animated ? 0.8 : 0.4,
      linewidth: edge.weight || 1,
    })

    return material
  }, [])

  // Focus camera on self node on mount
  useEffect(() => {
    if (!graphRef.current || !graph?.nodes) return

    const selfNode = graph.nodes.find((n) => n.type === 'self')
    if (selfNode && graphRef.current.cameraPosition) {
      setTimeout(() => {
        graphRef.current?.cameraPosition(
          { x: 0, y: 50, z: 200 },
          { x: 0, y: 0, z: 0 },
          1000
        )
      }, 500)
    }
  }, [graph?.nodes])

  // Focus on selected node
  useEffect(() => {
    if (!graphRef.current || selectedNodeIds.length !== 1) return

    const selectedNode = graph?.nodes?.find((n) => n.id === selectedNodeIds[0])
    if (selectedNode) {
      graphRef.current.cameraPosition(
        {
          x: (selectedNode as any).x || 0,
          y: ((selectedNode as any).y || 0) + 50,
          z: ((selectedNode as any).z || 0) + 80,
        },
        {
          x: (selectedNode as any).x || 0,
          y: (selectedNode as any).y || 0,
          z: (selectedNode as any).z || 0,
        },
        800
      )
    }
  }, [selectedNodeIds, graph?.nodes])

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0f]">
        <div className="text-zinc-500">그래프를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkColor={(link: any) =>
          link.type === 'blocks'
            ? '#EF4444'
            : link.type === 'depends_on'
            ? '#F59E0B'
            : '#3B82F680'
        }
        linkWidth={(link: any) => (link.weight || 1) * 0.5}
        linkOpacity={0.4}
        linkDirectionalParticles={(link: any) =>
          link.animated ? 3 : 0
        }
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onBackgroundClick={handleBackgroundClick}
        backgroundColor="#0a0a0f"
        showNavInfo={false}
        enableNodeDrag={true}
        enableNavigationControls={true}
        warmupTicks={100}
        cooldownTicks={200}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.4}
      />
    </div>
  )
}
