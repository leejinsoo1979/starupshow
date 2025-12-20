'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useNeuralMapStore } from '@/lib/neural-map/store'
import type { NeuralNode, NeuralEdge } from '@/lib/neural-map/types'
import {
  Database,
  Table,
  Key,
  Link,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface SchemaViewProps {
  className?: string
}

interface SchemaTable {
  id: string
  name: string
  columns: SchemaColumn[]
  position: { x: number; y: number }
  expanded: boolean
}

interface SchemaColumn {
  name: string
  type: string
  isPrimaryKey?: boolean
  isForeignKey?: boolean
  references?: string // 참조하는 테이블.컬럼
}

interface SchemaRelation {
  id: string
  from: { table: string; column: string }
  to: { table: string; column: string }
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
}

// 노드를 스키마 테이블로 변환
function nodesToSchemaTables(nodes: NeuralNode[], edges: NeuralEdge[]): {
  tables: SchemaTable[]
  relations: SchemaRelation[]
} {
  const tables: SchemaTable[] = []
  const relations: SchemaRelation[] = []

  // 노드를 그룹별로 분류
  const projectNodes = nodes.filter(n => n.type === 'project')
  const fileNodes = nodes.filter(n => n.type !== 'project' && n.type !== 'self')

  // 각 폴더/타입을 테이블로 변환
  const nodeTypes = ['concept', 'person', 'event', 'doc', 'memory', 'goal', 'project']
  const groupedByType = new Map<string, NeuralNode[]>()

  nodes.forEach(node => {
    if (node.type === 'self') return
    const type = node.type || 'unknown'
    if (!groupedByType.has(type)) {
      groupedByType.set(type, [])
    }
    groupedByType.get(type)!.push(node)
  })

  // 레이아웃 설정
  const tableWidth = 280
  const tableSpacing = 100
  const columnsPerRow = 3
  let tableIndex = 0

  groupedByType.forEach((nodesOfType, type) => {
    if (nodesOfType.length === 0) return

    const row = Math.floor(tableIndex / columnsPerRow)
    const col = tableIndex % columnsPerRow

    // 컬럼 생성 (노드의 속성들을 컬럼으로)
    const columns: SchemaColumn[] = [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'title', type: 'VARCHAR(255)' },
      { name: 'summary', type: 'TEXT' },
      { name: 'type', type: 'VARCHAR(50)' },
      { name: 'tags', type: 'ARRAY' },
      { name: 'importance', type: 'INTEGER' },
      { name: 'parent_id', type: 'UUID', isForeignKey: true },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
    ]

    // 특정 타입에 따른 추가 컬럼
    if (type === 'person') {
      columns.splice(3, 0, { name: 'email', type: 'VARCHAR(255)' })
      columns.splice(4, 0, { name: 'role', type: 'VARCHAR(100)' })
    } else if (type === 'event') {
      columns.splice(3, 0, { name: 'start_date', type: 'TIMESTAMP' })
      columns.splice(4, 0, { name: 'end_date', type: 'TIMESTAMP' })
    } else if (type === 'doc' || type === 'memory') {
      columns.splice(3, 0, { name: 'content', type: 'TEXT' })
      columns.splice(4, 0, { name: 'file_url', type: 'VARCHAR(500)' })
    }

    tables.push({
      id: `table-${type}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}s`,
      columns,
      position: {
        x: 100 + col * (tableWidth + tableSpacing),
        y: 100 + row * 400,
      },
      expanded: true,
    })

    tableIndex++
  })

  // 엣지를 관계로 변환
  edges.forEach((edge, idx) => {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)

    if (sourceNode && targetNode) {
      const sourceType = sourceNode.type || 'unknown'
      const targetType = targetNode.type || 'unknown'

      // 이미 같은 관계가 있는지 확인
      const existingRelation = relations.find(
        r => r.from.table === `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)}s` &&
            r.to.table === `${targetType.charAt(0).toUpperCase() + targetType.slice(1)}s`
      )

      if (!existingRelation && sourceType !== 'self' && targetType !== 'self') {
        relations.push({
          id: `rel-${idx}`,
          from: {
            table: `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)}s`,
            column: 'id',
          },
          to: {
            table: `${targetType.charAt(0).toUpperCase() + targetType.slice(1)}s`,
            column: 'parent_id',
          },
          type: edge.type === 'parent_child' ? 'one-to-many' : 'many-to-many',
        })
      }
    }
  })

  return { tables, relations }
}

export function SchemaView({ className }: SchemaViewProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  // Store
  const graph = useNeuralMapStore((s) => s.graph)
  const setSelectedNodes = useNeuralMapStore((s) => s.setSelectedNodes)

  // 스키마 데이터 생성
  const { tables, relations } = useMemo(() => {
    if (!graph?.nodes?.length) {
      // 기본 스키마 (Supabase 기반)
      return {
        tables: [
          {
            id: 'users',
            name: 'users',
            columns: [
              { name: 'id', type: 'UUID', isPrimaryKey: true },
              { name: 'email', type: 'VARCHAR(255)' },
              { name: 'name', type: 'VARCHAR(100)' },
              { name: 'role', type: 'VARCHAR(50)' },
              { name: 'avatar_url', type: 'TEXT' },
              { name: 'created_at', type: 'TIMESTAMPTZ' },
            ],
            position: { x: 100, y: 100 },
            expanded: true,
          },
          {
            id: 'teams',
            name: 'teams',
            columns: [
              { name: 'id', type: 'UUID', isPrimaryKey: true },
              { name: 'name', type: 'VARCHAR(255)' },
              { name: 'founder_id', type: 'UUID', isForeignKey: true, references: 'users.id' },
              { name: 'work_style', type: 'VARCHAR(50)' },
              { name: 'description', type: 'TEXT' },
              { name: 'created_at', type: 'TIMESTAMPTZ' },
            ],
            position: { x: 450, y: 100 },
            expanded: true,
          },
          {
            id: 'neural_maps',
            name: 'neural_maps',
            columns: [
              { name: 'id', type: 'UUID', isPrimaryKey: true },
              { name: 'title', type: 'VARCHAR(255)' },
              { name: 'user_id', type: 'UUID', isForeignKey: true, references: 'users.id' },
              { name: 'team_id', type: 'UUID', isForeignKey: true, references: 'teams.id' },
              { name: 'graph_data', type: 'JSONB' },
              { name: 'created_at', type: 'TIMESTAMPTZ' },
              { name: 'updated_at', type: 'TIMESTAMPTZ' },
            ],
            position: { x: 800, y: 100 },
            expanded: true,
          },
          {
            id: 'neural_nodes',
            name: 'neural_nodes',
            columns: [
              { name: 'id', type: 'UUID', isPrimaryKey: true },
              { name: 'map_id', type: 'UUID', isForeignKey: true, references: 'neural_maps.id' },
              { name: 'type', type: 'VARCHAR(50)' },
              { name: 'title', type: 'VARCHAR(255)' },
              { name: 'summary', type: 'TEXT' },
              { name: 'content', type: 'TEXT' },
              { name: 'tags', type: 'TEXT[]' },
              { name: 'importance', type: 'INTEGER' },
              { name: 'position_x', type: 'FLOAT' },
              { name: 'position_y', type: 'FLOAT' },
              { name: 'position_z', type: 'FLOAT' },
              { name: 'created_at', type: 'TIMESTAMPTZ' },
            ],
            position: { x: 100, y: 450 },
            expanded: true,
          },
          {
            id: 'neural_edges',
            name: 'neural_edges',
            columns: [
              { name: 'id', type: 'UUID', isPrimaryKey: true },
              { name: 'map_id', type: 'UUID', isForeignKey: true, references: 'neural_maps.id' },
              { name: 'source_id', type: 'UUID', isForeignKey: true, references: 'neural_nodes.id' },
              { name: 'target_id', type: 'UUID', isForeignKey: true, references: 'neural_nodes.id' },
              { name: 'type', type: 'VARCHAR(50)' },
              { name: 'weight', type: 'FLOAT' },
              { name: 'label', type: 'VARCHAR(100)' },
              { name: 'created_at', type: 'TIMESTAMPTZ' },
            ],
            position: { x: 450, y: 450 },
            expanded: true,
          },
          {
            id: 'neural_files',
            name: 'neural_files',
            columns: [
              { name: 'id', type: 'UUID', isPrimaryKey: true },
              { name: 'map_id', type: 'UUID', isForeignKey: true, references: 'neural_maps.id' },
              { name: 'name', type: 'VARCHAR(255)' },
              { name: 'type', type: 'VARCHAR(50)' },
              { name: 'url', type: 'TEXT' },
              { name: 'size', type: 'INTEGER' },
              { name: 'path', type: 'VARCHAR(500)' },
              { name: 'created_at', type: 'TIMESTAMPTZ' },
            ],
            position: { x: 800, y: 450 },
            expanded: true,
          },
        ] as SchemaTable[],
        relations: [
          { id: 'r1', from: { table: 'teams', column: 'founder_id' }, to: { table: 'users', column: 'id' }, type: 'one-to-many' as const },
          { id: 'r2', from: { table: 'neural_maps', column: 'user_id' }, to: { table: 'users', column: 'id' }, type: 'one-to-many' as const },
          { id: 'r3', from: { table: 'neural_maps', column: 'team_id' }, to: { table: 'teams', column: 'id' }, type: 'one-to-many' as const },
          { id: 'r4', from: { table: 'neural_nodes', column: 'map_id' }, to: { table: 'neural_maps', column: 'id' }, type: 'one-to-many' as const },
          { id: 'r5', from: { table: 'neural_edges', column: 'map_id' }, to: { table: 'neural_maps', column: 'id' }, type: 'one-to-many' as const },
          { id: 'r6', from: { table: 'neural_edges', column: 'source_id' }, to: { table: 'neural_nodes', column: 'id' }, type: 'one-to-many' as const },
          { id: 'r7', from: { table: 'neural_edges', column: 'target_id' }, to: { table: 'neural_nodes', column: 'id' }, type: 'one-to-many' as const },
          { id: 'r8', from: { table: 'neural_files', column: 'map_id' }, to: { table: 'neural_maps', column: 'id' }, type: 'one-to-many' as const },
        ],
      }
    }

    return nodesToSchemaTables(graph.nodes, graph.edges || [])
  }, [graph])

  // 테이블 토글
  const toggleTable = useCallback((tableId: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev)
      if (next.has(tableId)) {
        next.delete(tableId)
      } else {
        next.add(tableId)
      }
      return next
    })
  }, [])

  // 줌 핸들러
  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(0.25, Math.min(2, prev + delta)))
  }, [])

  // 리셋
  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // 마우스 드래그 (패닝)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true)
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      })
    }
  }, [isPanning, startPan])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // 휠 줌
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    handleZoom(delta)
  }, [handleZoom])

  // 관계선 그리기를 위한 테이블 위치 찾기
  const getTablePosition = useCallback((tableName: string) => {
    const table = tables.find(t => t.name === tableName)
    return table?.position || { x: 0, y: 0 }
  }, [tables])

  // 초기 확장 상태 설정
  useEffect(() => {
    setExpandedTables(new Set(tables.map(t => t.id)))
  }, [tables])

  // 색상 팔레트
  const colors = {
    tableBg: isDark ? '#1e1e1e' : '#ffffff',
    tableHeader: isDark ? '#2d2d2d' : '#f0f0f0',
    tableBorder: isDark ? '#3c3c3c' : '#e0e0e0',
    primaryKey: isDark ? '#fbbf24' : '#d97706',
    foreignKey: isDark ? '#60a5fa' : '#2563eb',
    relationLine: isDark ? '#6b7280' : '#9ca3af',
    text: isDark ? '#e5e7eb' : '#1f2937',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full h-full relative overflow-hidden select-none',
        isDark ? 'bg-zinc-950' : 'bg-zinc-100',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      {/* Controls */}
      <div className={cn(
        'absolute top-4 right-4 flex items-center gap-2 z-10',
        isDark ? 'bg-zinc-900/90' : 'bg-white/90',
        'rounded-lg shadow-lg px-2 py-1 backdrop-blur-sm'
      )}>
        <button
          onClick={() => handleZoom(0.1)}
          className={cn(
            'p-2 rounded transition-colors',
            isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
          )}
          title="확대"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className={cn(
          'text-xs font-mono px-2',
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        )}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoom(-0.1)}
          className={cn(
            'p-2 rounded transition-colors',
            isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
          )}
          title="축소"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className={cn('w-px h-6', isDark ? 'bg-zinc-700' : 'bg-zinc-300')} />
        <button
          onClick={handleReset}
          className={cn(
            'p-2 rounded transition-colors',
            isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
          )}
          title="초기화"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Title */}
      <div className={cn(
        'absolute top-4 left-4 flex items-center gap-2 z-10',
        isDark ? 'text-zinc-300' : 'text-zinc-700'
      )}>
        <Database className="w-5 h-5" />
        <span className="font-semibold">Database Schema</span>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded',
          isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
        )}>
          {tables.length} tables
        </span>
      </div>

      {/* Canvas */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Relations (SVG lines) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {relations.map(relation => {
            const fromPos = getTablePosition(relation.from.table)
            const toPos = getTablePosition(relation.to.table)

            if (!fromPos || !toPos) return null

            const fromX = fromPos.x + 140
            const fromY = fromPos.y + 80
            const toX = toPos.x + 140
            const toY = toPos.y + 80

            // 곡선 경로
            const midX = (fromX + toX) / 2
            const path = `M ${fromX} ${fromY} Q ${midX} ${fromY} ${midX} ${(fromY + toY) / 2} Q ${midX} ${toY} ${toX} ${toY}`

            return (
              <g key={relation.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={colors.relationLine}
                  strokeWidth={2}
                  strokeDasharray={relation.type === 'many-to-many' ? '5,5' : undefined}
                />
                {/* Arrow */}
                <circle cx={toX} cy={toY} r={4} fill={colors.relationLine} />
              </g>
            )
          })}
        </svg>

        {/* Tables */}
        {tables.map(table => {
          const isExpanded = expandedTables.has(table.id)

          return (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'absolute rounded-lg overflow-hidden shadow-lg border',
                'min-w-[260px]'
              )}
              style={{
                left: table.position.x,
                top: table.position.y,
                backgroundColor: colors.tableBg,
                borderColor: colors.tableBorder,
              }}
            >
              {/* Table Header */}
              <div
                onClick={() => toggleTable(table.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer',
                  isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                )}
                <Table className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-sm" style={{ color: colors.text }}>
                  {table.name}
                </span>
                <span className={cn(
                  'ml-auto text-xs',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {table.columns.length} cols
                </span>
              </div>

              {/* Table Columns */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="divide-y" style={{ borderColor: colors.tableBorder }}>
                      {table.columns.map((column, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1.5 text-xs',
                            'hover:bg-opacity-50',
                            isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                          )}
                        >
                          {column.isPrimaryKey ? (
                            <Key className="w-3 h-3" style={{ color: colors.primaryKey }} />
                          ) : column.isForeignKey ? (
                            <Link className="w-3 h-3" style={{ color: colors.foreignKey }} />
                          ) : (
                            <span className="w-3 h-3" />
                          )}
                          <span
                            className="flex-1 font-mono"
                            style={{
                              color: column.isPrimaryKey ? colors.primaryKey :
                                    column.isForeignKey ? colors.foreignKey :
                                    colors.text
                            }}
                          >
                            {column.name}
                          </span>
                          <span style={{ color: colors.textMuted }}>
                            {column.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <div className={cn(
        'absolute bottom-4 left-4 flex items-center gap-4 z-10',
        'text-xs px-3 py-2 rounded-lg',
        isDark ? 'bg-zinc-900/90 text-zinc-400' : 'bg-white/90 text-zinc-600'
      )}>
        <div className="flex items-center gap-1.5">
          <Key className="w-3 h-3" style={{ color: colors.primaryKey }} />
          <span>Primary Key</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link className="w-3 h-3" style={{ color: colors.foreignKey }} />
          <span>Foreign Key</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5" style={{ backgroundColor: colors.relationLine }} />
          <span>Relation</span>
        </div>
      </div>
    </div>
  )
}
