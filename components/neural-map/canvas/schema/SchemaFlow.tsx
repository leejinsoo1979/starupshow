'use client'

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    ConnectionMode,
    MarkerType,
    Panel,
    useReactFlow,
    ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useTheme } from 'next-themes'
import { Plus, FileCode, AlertCircle, Play } from 'lucide-react'

import TableNode, { TableNodeData, SchemaColumn as TableColumn } from './TableNode'
import { useNeuralMapStore } from '@/lib/neural-map/store'
import { parseProjectSchema, type ParsedSchema, type SchemaTable } from '@/lib/neural-map/schema-parser'
import { Database, FileCode2, Hexagon, Code2, Share2, FileJson, Box } from 'lucide-react'
import {
    useSchemaSimulation,
    SimulationController,
    SIMULATION_COLORS,
} from './simulation'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Node Types Registration
const nodeTypes = {
    table: TableNode,
}

// Convert parsed schema to React Flow nodes/edges
function schemaToFlow(schema: ParsedSchema): { nodes: Node<TableNodeData>[]; edges: Edge[] } {
    const SPACING_X = 350
    const SPACING_Y = 250
    const COLS = 4

    // 테이블 노드 생성
    const nodes: Node<TableNodeData>[] = schema.tables.map((table, idx) => {
        const row = Math.floor(idx / COLS)
        const col = idx % COLS

        const columns: TableColumn[] = table.columns.map(c => ({
            name: c.name,
            type: c.type,
            isPrimaryKey: c.isPrimaryKey,
            isForeignKey: c.isForeignKey,
        }))

        return {
            id: table.name,
            type: 'table',
            position: { x: 100 + col * SPACING_X, y: 100 + row * SPACING_Y },
            data: {
                label: table.name,
                columns,
            },
        }
    })

    // FK 관계를 Edge로 변환
    const edges: Edge[] = schema.relations.map((rel, idx) => ({
        id: `edge-${idx}-${rel.sourceTable}-${rel.targetTable}`,
        source: rel.targetTable,  // FK가 참조하는 테이블에서
        target: rel.sourceTable,  // FK가 있는 테이블로
        type: 'smoothstep',
        animated: true,
        label: rel.sourceColumn,
        labelStyle: { fontSize: 10, fill: '#888' },
        markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
        },
        style: { stroke: '#6366f1' },
    }))

    return { nodes, edges }
}

// 내부 컴포넌트 (useReactFlow 사용)
function SchemaFlowInner({ className }: { className?: string }) {
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === 'dark'
    const reactFlowInstance = useReactFlow()

    // 파일 트리에서 파일 가져오기
    const files = useNeuralMapStore(s => s.files)

    // 파싱된 스키마 상태
    const [parsedSchema, setParsedSchema] = useState<ParsedSchema | null>(null)
    const [parsingError, setParsingError] = useState<string | null>(null)
    const [schemaFileInfo, setSchemaFileInfo] = useState<{
        type: 'sql' | 'prisma' | 'drizzle' | 'typescript' | 'graphql' | 'openapi' | 'typeorm' | 'mixed' | null
        count: number
    }>({ type: null, count: 0 })

    // 시뮬레이션 컨트롤러 표시 상태
    const [showSimulation, setShowSimulation] = useState(false)

    // 카메라 이동 함수
    const moveCameraToNodes = useCallback((nodeIds: string[]) => {
        if (nodeIds.length === 0) return

        // 해당 노드들의 위치 계산
        const targetNodes = reactFlowInstance.getNodes().filter(n => nodeIds.includes(n.id))
        if (targetNodes.length === 0) return

        // 노드들의 중심점 계산
        const padding = 100
        const minX = Math.min(...targetNodes.map(n => n.position.x)) - padding
        const maxX = Math.max(...targetNodes.map(n => n.position.x + (n.width || 240))) + padding
        const minY = Math.min(...targetNodes.map(n => n.position.y)) - padding
        const maxY = Math.max(...targetNodes.map(n => n.position.y + (n.height || 200))) + padding

        // fitBounds로 해당 영역으로 카메라 이동 (부드러운 애니메이션)
        reactFlowInstance.fitBounds(
            { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
            { duration: 500, padding: 0.2 }
        )
    }, [reactFlowInstance])

    // 프로젝트 파일에서 스키마 파싱
    useEffect(() => {
        if (!files || files.length === 0) {
            setParsedSchema(null)
            setSchemaFileInfo({ type: null, count: 0 })
            return
        }

        try {
            // 스키마 관련 파일 카운트
            const sqlFiles = files.filter(f => f.name.endsWith('.sql') && f.content)
            const prismaFile = files.find(f =>
                (f.name === 'schema.prisma' || f.path?.includes('prisma/schema.prisma')) && f.content
            )
            const graphqlFiles = files.filter(f =>
                (f.name.endsWith('.graphql') || f.name.endsWith('.gql')) && f.content
            )
            const openapiFiles = files.filter(f =>
                (f.name === 'openapi.yaml' || f.name === 'openapi.yml' ||
                 f.name === 'swagger.yaml' || f.name === 'swagger.yml' ||
                 f.name === 'openapi.json' || f.name === 'swagger.json') && f.content
            )
            const typeormFiles = files.filter(f =>
                f.name.endsWith('.ts') && f.content && f.content.includes('@Entity')
            )
            const drizzleFiles = files.filter(f =>
                f.name.endsWith('.ts') && f.content &&
                (f.content.includes('pgTable') || f.content.includes('mysqlTable') || f.content.includes('sqliteTable'))
            )
            const tsTypeFiles = files.filter(f =>
                (f.name.endsWith('.ts') || f.name.endsWith('.tsx')) && f.content &&
                (f.path?.includes('types') || f.path?.includes('models') || f.path?.includes('entities'))
            )

            // 스키마 파싱 (auto-detect 로직은 parseProjectSchema에 있음)
            const schema = parseProjectSchema(files)

            if (schema.tables.length === 0) {
                // 파일이 있지만 스키마가 없는 경우
                if (sqlFiles.length > 0) {
                    setParsingError('SQL 파일에서 CREATE TABLE 문을 찾을 수 없습니다')
                    setSchemaFileInfo({ type: 'sql', count: sqlFiles.length })
                } else if (prismaFile) {
                    setParsingError('Prisma 스키마에서 model을 찾을 수 없습니다')
                    setSchemaFileInfo({ type: 'prisma', count: 1 })
                } else {
                    setParsingError('스키마 파일을 찾을 수 없습니다 (SQL, Prisma, Drizzle, TypeScript 지원)')
                    setSchemaFileInfo({ type: null, count: 0 })
                }
                setParsedSchema(null)
                return
            }

            // 감지된 타입 설정
            let detectedType = schema.detectedType
            let fileCount = 0
            if (detectedType === 'sql') fileCount = sqlFiles.length
            else if (detectedType === 'prisma') fileCount = 1
            else if (detectedType === 'graphql') fileCount = graphqlFiles.length
            else if (detectedType === 'openapi') fileCount = openapiFiles.length
            else if (detectedType === 'typeorm') fileCount = typeormFiles.length
            else if (detectedType === 'drizzle') fileCount = drizzleFiles.length
            else if (detectedType === 'typescript') fileCount = tsTypeFiles.length
            else if (detectedType === 'mixed') fileCount = sqlFiles.length + graphqlFiles.length + openapiFiles.length + typeormFiles.length + drizzleFiles.length + (prismaFile ? 1 : 0)

            setSchemaFileInfo({ type: detectedType || null, count: fileCount })
            setParsedSchema(schema)
            setParsingError(null)
            console.log('[SchemaFlow] Parsed schema:', schema.tables.length, 'tables,', schema.relations.length, 'relations, type:', detectedType)
        } catch (err: any) {
            console.error('[SchemaFlow] Parse error:', err)
            setParsingError(err.message || '스키마 파싱 오류')
            setParsedSchema(null)
        }
    }, [files])

    // 스키마를 Flow 노드/엣지로 변환
    const { initialNodes, initialEdges } = useMemo(() => {
        if (!parsedSchema || parsedSchema.tables.length === 0) {
            return { initialNodes: [] as Node<TableNodeData>[], initialEdges: [] as Edge[] }
        }
        const { nodes, edges } = schemaToFlow(parsedSchema)
        return { initialNodes: nodes, initialEdges: edges }
    }, [parsedSchema])

    // React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

    // 스키마 변경시 동기화
    useEffect(() => {
        setNodes(initialNodes)
        setEdges(initialEdges)
    }, [initialNodes, initialEdges, setNodes, setEdges])

    // 시뮬레이션 하이라이트 상태
    const [simulationHighlight, setSimulationHighlight] = useState<{
        mode: 'fk-flow' | 'crud' | 'sequential'
        operation?: 'create' | 'read' | 'update' | 'delete'
    }>({ mode: 'fk-flow' })

    // 시뮬레이션에서 노드 하이라이트 처리 + 카메라 이동
    const handleNodeHighlight = useCallback((highlightedNodeIds: Set<string>, visitedNodeIds: Set<string>) => {
        // 노드 하이라이트 스타일 적용 + 시뮬레이션 모드 상태
        setNodes((nds) =>
            nds.map((node, index) => ({
                ...node,
                data: {
                    ...node.data,
                    isHighlighted: highlightedNodeIds.has(node.id),
                    highlightColor: simulationHighlight.mode === 'crud'
                        ? SIMULATION_COLORS[simulationHighlight.operation || 'read']
                        : SIMULATION_COLORS.active,
                    highlightIntensity: highlightedNodeIds.has(node.id) ? 1 : 0,
                    // 시뮬레이션 모드 관련 상태
                    simulationMode: showSimulation,
                    isVisited: visitedNodeIds.has(node.id),
                    isActive: highlightedNodeIds.has(node.id),
                    appearDelay: index * 50, // 순차 등장 효과
                },
            }))
        )

        // 카메라를 하이라이트된 노드로 이동
        const nodeIdsArray = Array.from(highlightedNodeIds)
        if (nodeIdsArray.length > 0) {
            moveCameraToNodes(nodeIdsArray)
        }
    }, [setNodes, simulationHighlight, moveCameraToNodes, showSimulation])

    // 시뮬레이션에서 엣지 하이라이트 처리
    const handleEdgeHighlight = useCallback((highlightedEdgeIds: Set<string>, visitedEdgeIds: Set<string>) => {
        setEdges((eds) =>
            eds.map((edge) => {
                const isActive = highlightedEdgeIds.has(edge.id)
                const isVisited = visitedEdgeIds.has(edge.id)
                return {
                    ...edge,
                    animated: isActive,
                    style: {
                        ...edge.style,
                        stroke: isActive
                            ? SIMULATION_COLORS.edge
                            : isVisited
                                ? '#94a3b8' // 방문한 엣지는 연한 색
                                : showSimulation
                                    ? '#374151' // 미방문 엣지는 어둡게
                                    : '#6366f1',
                        strokeWidth: isActive ? 3 : isVisited ? 2 : 1,
                        opacity: showSimulation ? (isVisited || isActive ? 1 : 0.2) : 1,
                        filter: isActive
                            ? `drop-shadow(0 0 6px ${SIMULATION_COLORS.edgeGlow})`
                            : undefined,
                    },
                }
            })
        )
    }, [setEdges, showSimulation])

    // 시뮬레이션 훅
    const simulation = useSchemaSimulation({
        nodes,
        edges,
        onNodeHighlight: handleNodeHighlight,
        onEdgeHighlight: handleEdgeHighlight,
    })

    // 시뮬레이션 설정 변경 시 하이라이트 상태 동기화
    useEffect(() => {
        setSimulationHighlight({
            mode: simulation.config.mode,
            operation: simulation.config.crud?.operation,
        })
    }, [simulation.config.mode, simulation.config.crud?.operation])

    // 시뮬레이션 stop 함수 참조 (의존성 문제 방지)
    const simulationStopRef = useRef(simulation.stop)
    simulationStopRef.current = simulation.stop

    // 시뮬레이션 모드 토글 시 노드 상태 리셋
    useEffect(() => {
        if (!showSimulation) {
            // 시뮬레이션 종료 시 모든 노드를 정상 상태로 복원
            setNodes((nds) =>
                nds.map((node) => ({
                    ...node,
                    data: {
                        ...node.data,
                        simulationMode: false,
                        isVisited: true,
                        isActive: false,
                        isHighlighted: false,
                    },
                }))
            )
            setEdges((eds) =>
                eds.map((edge) => ({
                    ...edge,
                    animated: true,
                    style: {
                        ...edge.style,
                        stroke: '#6366f1',
                        strokeWidth: 2,
                        opacity: 1,
                        filter: undefined,
                    },
                }))
            )
            // ref를 통해 stop 호출
            simulationStopRef.current()
        } else {
            // 시뮬레이션 시작 시 모든 노드를 미방문 상태로 설정
            setNodes((nds) =>
                nds.map((node, index) => ({
                    ...node,
                    data: {
                        ...node.data,
                        simulationMode: true,
                        isVisited: false,
                        isActive: false,
                        isHighlighted: false,
                        appearDelay: index * 50,
                    },
                }))
            )
            setEdges((eds) =>
                eds.map((edge) => ({
                    ...edge,
                    animated: false,
                    style: {
                        ...edge.style,
                        stroke: '#374151',
                        strokeWidth: 1,
                        opacity: 0.2,
                    },
                }))
            )
        }
    }, [showSimulation, setNodes, setEdges])

    // 테이블 목록 (CRUD 대상 선택용)
    const tables = useMemo(() =>
        nodes.map((node) => ({
            id: node.id,
            name: node.data?.label || node.id,
        })),
        [nodes]
    )

    // 시뮬레이션 열릴 때 스텝 생성
    useEffect(() => {
        if (showSimulation && nodes.length > 0 && simulation.steps.length === 0) {
            // CRUD 모드일 경우 첫 번째 테이블을 기본 대상으로 설정
            if (simulation.config.mode === 'crud' && !simulation.config.crud?.targetTableId && tables.length > 0) {
                simulation.updateConfig({
                    crud: {
                        ...simulation.config.crud!,
                        targetTableId: tables[0].id,
                    },
                })
            }
            simulation.generateSteps()
        }
    }, [showSimulation, nodes.length])

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges]
    )

    const handleAddTable = useCallback(() => {
        const id = `new_table_${Date.now()}`
        const newNode: Node<TableNodeData> = {
            id,
            position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
            type: 'table',
            data: {
                label: 'new_table',
                columns: [
                    { name: 'id', type: 'uuid', isPrimaryKey: true },
                ],
            },
        }
        setNodes((nds) => nds.concat(newNode))
    }, [setNodes])

    // 파일이 없거나 스키마가 없을 때 안내 화면
    if (!files || files.length === 0) {
        return (
            <div className={className}>
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                    <FileCode className="w-16 h-16 opacity-50" />
                    <div className="text-center">
                        <p className="text-lg font-medium">프로젝트 파일을 로드해주세요</p>
                        <p className="text-sm mt-1">좌측 패널에서 프로젝트를 열면 스키마가 자동으로 분석됩니다</p>
                    </div>
                </div>
            </div>
        )
    }

    if (parsingError && !parsedSchema) {
        return (
            <div className={className}>
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                    <AlertCircle className="w-16 h-16 opacity-50 text-amber-500" />
                    <div className="text-center">
                        <p className="text-lg font-medium">{parsingError}</p>
                        <p className="text-sm mt-1 max-w-md">
                            지원 형식: SQL migrations, Prisma schema, Drizzle schema, TypeScript types
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // 스키마 타입 아이콘 및 라벨
    const getSchemaTypeInfo = () => {
        switch (schemaFileInfo.type) {
            case 'sql':
                return { icon: <Database className="w-4 h-4 text-blue-400" />, label: 'SQL' }
            case 'prisma':
                return { icon: <Hexagon className="w-4 h-4 text-indigo-400" />, label: 'Prisma' }
            case 'graphql':
                return { icon: <Share2 className="w-4 h-4 text-pink-400" />, label: 'GraphQL' }
            case 'openapi':
                return { icon: <FileJson className="w-4 h-4 text-orange-400" />, label: 'OpenAPI' }
            case 'typeorm':
                return { icon: <Box className="w-4 h-4 text-red-400" />, label: 'TypeORM' }
            case 'drizzle':
                return { icon: <FileCode2 className="w-4 h-4 text-green-400" />, label: 'Drizzle' }
            case 'typescript':
                return { icon: <Code2 className="w-4 h-4 text-cyan-400" />, label: 'TypeScript' }
            case 'mixed':
                return { icon: <FileCode className="w-4 h-4 text-purple-400" />, label: 'Mixed' }
            default:
                return { icon: <FileCode className="w-4 h-4 text-emerald-400" />, label: 'Schema' }
        }
    }

    const typeInfo = getSchemaTypeInfo()

    return (
        <div className={className}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                connectionMode={ConnectionMode.Loose}
                minZoom={0.1}
                maxZoom={4}
            >
                <Background color={isDark ? '#333' : '#ddd'} gap={20} />
                <Controls />

                {/* 상단 정보 패널 */}
                <Panel position="top-left">
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/90 text-white rounded-md shadow-lg text-sm">
                        {typeInfo.icon}
                        <span className="font-medium">{typeInfo.label}</span>
                        <span className="text-zinc-500">|</span>
                        <span>{parsedSchema?.tables.length || 0} tables</span>
                        <span className="text-zinc-500">|</span>
                        <span>{parsedSchema?.relations.length || 0} relations</span>
                        {schemaFileInfo.count > 0 && (
                            <>
                                <span className="text-zinc-500">|</span>
                                <span className="text-zinc-400">{schemaFileInfo.count} files</span>
                            </>
                        )}
                    </div>
                </Panel>

                <Panel position="top-right">
                    <div className="flex items-center gap-2">
                        {/* 시뮬레이션 토글 버튼 */}
                        <Button
                            onClick={() => setShowSimulation(!showSimulation)}
                            className={cn(
                                'gap-2 shadow-lg transition-all',
                                showSimulation
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700',
                                simulation.state === 'playing' && 'animate-pulse'
                            )}
                        >
                            <Play className={cn('w-4 h-4', simulation.state === 'playing' && 'fill-current')} />
                            <span>{showSimulation ? '시뮬레이션 닫기' : '데이터 흐름'}</span>
                        </Button>

                        <button
                            onClick={handleAddTable}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md shadow-lg hover:bg-blue-700 transition"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Table</span>
                        </button>
                    </div>
                </Panel>

                {/* 시뮬레이션 컨트롤러 패널 - 우측 하단 (compact) */}
                {showSimulation && parsedSchema && parsedSchema.tables.length > 0 && (
                    <Panel position="bottom-right">
                        <SimulationController
                            state={simulation.state}
                            config={simulation.config}
                            steps={simulation.steps}
                            currentStepIndex={simulation.currentStepIndex}
                            progress={simulation.progress}
                            tables={tables}
                            onPlay={simulation.play}
                            onPause={simulation.pause}
                            onStop={simulation.stop}
                            onNextStep={simulation.nextStep}
                            onPrevStep={simulation.prevStep}
                            onGoToStep={simulation.goToStep}
                            onSetSpeed={simulation.setSpeed}
                            onToggleLoop={simulation.toggleLoop}
                            onSetMode={simulation.setMode}
                            onUpdateConfig={simulation.updateConfig}
                            onGenerateSteps={simulation.generateSteps}
                            className="mb-2 mr-2"
                            compact
                        />
                    </Panel>
                )}
            </ReactFlow>
        </div>
    )
}

// 메인 컴포넌트 - ReactFlowProvider로 래핑
export default function SchemaFlow({ className }: { className?: string }) {
    return (
        <ReactFlowProvider>
            <SchemaFlowInner className={className} />
        </ReactFlowProvider>
    )
}
