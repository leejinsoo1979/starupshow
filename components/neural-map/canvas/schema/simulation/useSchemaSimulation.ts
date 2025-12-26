/**
 * useSchemaSimulation Hook
 * 스키마 데이터 흐름 시뮬레이션 상태 관리
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Node, Edge } from 'reactflow'
import {
  SimulationMode,
  SimulationState,
  SimulationStep,
  SimulationConfig,
  SimulationContextState,
  UseSchemaSimulationReturn,
  DEFAULT_SIMULATION_CONFIG,
  BASE_STEP_DURATION,
  CrudOperation,
} from './types'

interface UseSchemaSimulationProps {
  nodes: Node[]
  edges: Edge[]
  onNodeHighlight?: (nodeIds: Set<string>, visitedNodeIds: Set<string>) => void
  onEdgeHighlight?: (edgeIds: Set<string>, visitedEdgeIds: Set<string>) => void
}

export function useSchemaSimulation({
  nodes,
  edges,
  onNodeHighlight,
  onEdgeHighlight,
}: UseSchemaSimulationProps): UseSchemaSimulationReturn {
  // 상태
  const [state, setState] = useState<SimulationState>('idle')
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION_CONFIG)
  const [steps, setSteps] = useState<SimulationStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [activeNodeIds, setActiveNodeIds] = useState<Set<string>>(new Set())
  const [activeEdgeIds, setActiveEdgeIds] = useState<Set<string>>(new Set())
  // 누적 방문 추적 (시뮬레이션 동안 한번이라도 활성화된 노드/엣지)
  const [visitedNodeIds, setVisitedNodeIds] = useState<Set<string>>(new Set())
  const [visitedEdgeIds, setVisitedEdgeIds] = useState<Set<string>>(new Set())

  // 타이머 레퍼런스
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // 진행률 계산
  const progress = useMemo(() => {
    if (steps.length === 0) return 0
    return Math.round(((currentStepIndex + 1) / steps.length) * 100)
  }, [currentStepIndex, steps.length])

  // 노드 맵 생성 (ID로 빠른 접근)
  const nodeMap = useMemo(() => {
    const map = new Map<string, Node>()
    nodes.forEach(node => map.set(node.id, node))
    return map
  }, [nodes])

  // 엣지 맵 생성
  const edgeMap = useMemo(() => {
    const map = new Map<string, Edge>()
    edges.forEach(edge => map.set(edge.id, edge))
    return map
  }, [edges])

  // 인접 리스트 생성 (FK 관계 그래프)
  const adjacencyList = useMemo(() => {
    const adj = new Map<string, { targets: string[], sources: string[], edgeIds: string[] }>()

    nodes.forEach(node => {
      adj.set(node.id, { targets: [], sources: [], edgeIds: [] })
    })

    edges.forEach(edge => {
      const sourceAdj = adj.get(edge.source)
      const targetAdj = adj.get(edge.target)

      if (sourceAdj) {
        sourceAdj.targets.push(edge.target)
        sourceAdj.edgeIds.push(edge.id)
      }
      if (targetAdj) {
        targetAdj.sources.push(edge.source)
        targetAdj.edgeIds.push(edge.id)
      }
    })

    return adj
  }, [nodes, edges])

  // 타이머 정리
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  // FK 흐름 스텝 생성
  const generateFKFlowSteps = useCallback((): SimulationStep[] => {
    const generatedSteps: SimulationStep[] = []
    const visited = new Set<string>()
    const queue: { nodeId: string; depth: number; fromEdge?: string }[] = []

    // 시작 노드 결정
    const startId = config.fkFlow?.startTableId || nodes[0]?.id
    if (!startId) return []

    queue.push({ nodeId: startId, depth: 0 })

    while (queue.length > 0) {
      const { nodeId, depth, fromEdge } = queue.shift()!

      if (visited.has(nodeId)) continue
      if (config.fkFlow?.maxDepth !== -1 && depth > config.fkFlow!.maxDepth) continue

      visited.add(nodeId)

      const node = nodeMap.get(nodeId)
      const tableName = node?.data?.label || nodeId

      // 스텝 추가
      generatedSteps.push({
        id: `fk-${nodeId}-${depth}`,
        type: fromEdge ? 'multi' : 'node',
        nodeIds: [nodeId],
        edgeIds: fromEdge ? [fromEdge] : [],
        description: fromEdge
          ? `FK 관계를 통해 ${tableName} 테이블로 이동`
          : `시작: ${tableName} 테이블`,
        duration: BASE_STEP_DURATION,
        metadata: {
          tableName,
          direction: 'forward',
        },
      })

      // 연결된 노드들 탐색
      const adj = adjacencyList.get(nodeId)
      if (adj) {
        // 타겟으로 향하는 관계 (FK → PK)
        adj.targets.forEach((targetId, i) => {
          if (!visited.has(targetId)) {
            const edgeId = adj.edgeIds[i]
            queue.push({ nodeId: targetId, depth: depth + 1, fromEdge: edgeId })
          }
        })

        // 양방향일 경우 소스도 탐색
        if (config.fkFlow?.bidirectional) {
          adj.sources.forEach((sourceId) => {
            if (!visited.has(sourceId)) {
              // 역방향 엣지 찾기
              const reverseEdge = edges.find(e => e.source === sourceId && e.target === nodeId)
              queue.push({
                nodeId: sourceId,
                depth: depth + 1,
                fromEdge: reverseEdge?.id
              })
            }
          })
        }
      }
    }

    return generatedSteps
  }, [nodes, edges, nodeMap, adjacencyList, config.fkFlow])

  // CRUD 시나리오 스텝 생성
  const generateCRUDSteps = useCallback((): SimulationStep[] => {
    const generatedSteps: SimulationStep[] = []
    const targetId = config.crud?.targetTableId || nodes[0]?.id
    if (!targetId) return []

    const targetNode = nodeMap.get(targetId)
    const tableName = targetNode?.data?.label || targetId
    const operation = config.crud?.operation || 'read'

    // 작업별 시나리오 설명
    const operationDescriptions: Record<CrudOperation, string[]> = {
      create: [
        `${tableName} 테이블에 새 레코드 생성 준비`,
        `데이터 유효성 검사`,
        `INSERT 쿼리 실행`,
        `연관 테이블 업데이트`,
        `생성 완료`,
      ],
      read: [
        `${tableName} 테이블 조회 시작`,
        `WHERE 조건 적용`,
        `JOIN 관계 테이블 조회`,
        `결과 반환`,
      ],
      update: [
        `${tableName} 테이블 레코드 선택`,
        `기존 데이터 로드`,
        `변경 사항 적용`,
        `UPDATE 쿼리 실행`,
        `연관 테이블 동기화`,
        `업데이트 완료`,
      ],
      delete: [
        `${tableName} 테이블 레코드 선택`,
        `삭제 전 의존성 확인`,
        `CASCADE 삭제 준비`,
        `연관 레코드 삭제`,
        `DELETE 쿼리 실행`,
        `삭제 완료`,
      ],
    }

    const descriptions = operationDescriptions[operation]
    const adj = adjacencyList.get(targetId)
    const relatedNodeIds = config.crud?.includeRelated && adj
      ? [...adj.targets, ...adj.sources]
      : []
    const relatedEdgeIds = adj?.edgeIds || []

    descriptions.forEach((desc, i) => {
      const isRelatedStep = i >= 2 && i < descriptions.length - 1

      generatedSteps.push({
        id: `crud-${operation}-${i}`,
        type: isRelatedStep && relatedNodeIds.length > 0 ? 'multi' : 'node',
        nodeIds: isRelatedStep ? [targetId, ...relatedNodeIds] : [targetId],
        edgeIds: isRelatedStep && config.crud?.showCascade ? relatedEdgeIds : [],
        description: desc,
        duration: BASE_STEP_DURATION,
        metadata: {
          operation,
          tableName,
        },
      })
    })

    return generatedSteps
  }, [nodes, nodeMap, adjacencyList, config.crud])

  // 순차 하이라이트 스텝 생성
  const generateSequentialSteps = useCallback((): SimulationStep[] => {
    const generatedSteps: SimulationStep[] = []

    // 노드 정렬
    let sortedNodes = [...nodes]

    switch (config.sequential?.sortBy) {
      case 'name':
        sortedNodes.sort((a, b) =>
          (a.data?.label || a.id).localeCompare(b.data?.label || b.id)
        )
        break
      case 'connections':
        sortedNodes.sort((a, b) => {
          const aConns = adjacencyList.get(a.id)
          const bConns = adjacencyList.get(b.id)
          const aCount = (aConns?.targets.length || 0) + (aConns?.sources.length || 0)
          const bCount = (bConns?.targets.length || 0) + (bConns?.sources.length || 0)
          return bCount - aCount // 연결 많은 것 먼저
        })
        break
      case 'custom':
        if (config.sequential?.tableOrder) {
          const orderMap = new Map(config.sequential.tableOrder.map((id, i) => [id, i]))
          sortedNodes.sort((a, b) =>
            (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
          )
        }
        break
    }

    sortedNodes.forEach((node, i) => {
      const tableName = node.data?.label || node.id
      const adj = adjacencyList.get(node.id)

      // 노드 스텝
      generatedSteps.push({
        id: `seq-node-${node.id}`,
        type: 'node',
        nodeIds: [node.id],
        edgeIds: [],
        description: `${i + 1}. ${tableName} 테이블`,
        duration: BASE_STEP_DURATION,
        metadata: {
          tableName,
        },
      })

      // 컬럼 포함 시
      if (config.sequential?.includeColumns && node.data?.columns) {
        const columns = node.data.columns as Array<{ name: string; type: string }>
        columns.forEach((col, j) => {
          generatedSteps.push({
            id: `seq-col-${node.id}-${j}`,
            type: 'node',
            nodeIds: [node.id],
            edgeIds: [],
            description: `  └ ${col.name}: ${col.type}`,
            duration: BASE_STEP_DURATION / 2,
            metadata: {
              tableName,
              columnName: col.name,
            },
          })
        })
      }

      // 연결된 엣지 표시
      if (adj && adj.edgeIds.length > 0) {
        generatedSteps.push({
          id: `seq-edges-${node.id}`,
          type: 'multi',
          nodeIds: [node.id, ...adj.targets],
          edgeIds: adj.edgeIds,
          description: `  → ${adj.targets.length}개 테이블과 연결됨`,
          duration: BASE_STEP_DURATION / 2,
        })
      }
    })

    return generatedSteps
  }, [nodes, adjacencyList, config.sequential])

  // 스텝 생성 (모드에 따라)
  const generateSteps = useCallback(() => {
    let newSteps: SimulationStep[] = []

    switch (config.mode) {
      case 'fk-flow':
        newSteps = generateFKFlowSteps()
        break
      case 'crud':
        newSteps = generateCRUDSteps()
        break
      case 'sequential':
        newSteps = generateSequentialSteps()
        break
    }

    setSteps(newSteps)
    setCurrentStepIndex(-1)
    setActiveNodeIds(new Set())
    setActiveEdgeIds(new Set())
    setVisitedNodeIds(new Set())
    setVisitedEdgeIds(new Set())
  }, [config.mode, generateFKFlowSteps, generateCRUDSteps, generateSequentialSteps])

  // 스텝 적용
  const applyStep = useCallback((index: number) => {
    if (index < 0 || index >= steps.length) {
      setActiveNodeIds(new Set())
      setActiveEdgeIds(new Set())
      return
    }

    const step = steps[index]
    const newNodeIds = new Set(step.nodeIds)
    const newEdgeIds = new Set(step.edgeIds)

    setActiveNodeIds(newNodeIds)
    setActiveEdgeIds(newEdgeIds)
    setCurrentStepIndex(index)

    // 방문 노드 누적 업데이트
    setVisitedNodeIds(prev => {
      const updated = new Set(prev)
      step.nodeIds.forEach(id => updated.add(id))
      return updated
    })
    setVisitedEdgeIds(prev => {
      const updated = new Set(prev)
      step.edgeIds.forEach(id => updated.add(id))
      return updated
    })

    // 콜백 호출 (방문 노드 정보도 함께 전달)
    setVisitedNodeIds(currentVisited => {
      const updatedVisited = new Set(currentVisited)
      step.nodeIds.forEach(id => updatedVisited.add(id))
      onNodeHighlight?.(newNodeIds, updatedVisited)
      return updatedVisited
    })
    setVisitedEdgeIds(currentVisited => {
      const updatedVisited = new Set(currentVisited)
      step.edgeIds.forEach(id => updatedVisited.add(id))
      onEdgeHighlight?.(newEdgeIds, updatedVisited)
      return updatedVisited
    })
  }, [steps, onNodeHighlight, onEdgeHighlight])

  // 다음 스텝 자동 재생
  const scheduleNextStep = useCallback(() => {
    if (state !== 'playing') return

    const currentStep = steps[currentStepIndex]
    const duration = currentStep
      ? (currentStep.duration / config.speed)
      : (BASE_STEP_DURATION / config.speed)

    timerRef.current = setTimeout(() => {
      setCurrentStepIndex(prev => {
        const next = prev + 1

        if (next >= steps.length) {
          if (config.loop) {
            return 0 // 처음으로
          } else {
            setState('completed')
            return prev
          }
        }

        return next
      })
    }, duration)
  }, [state, steps, currentStepIndex, config.speed, config.loop])

  // 재생
  const play = useCallback(() => {
    if (steps.length === 0) {
      generateSteps()
    }

    if (state === 'completed') {
      setCurrentStepIndex(0)
    } else if (currentStepIndex === -1) {
      setCurrentStepIndex(0)
    }

    setState('playing')
  }, [state, steps.length, currentStepIndex, generateSteps])

  // 일시정지
  const pause = useCallback(() => {
    clearTimer()
    setState('paused')
  }, [clearTimer])

  // 정지
  const stop = useCallback(() => {
    clearTimer()
    setState('idle')
    setCurrentStepIndex(-1)
    setActiveNodeIds(new Set())
    setActiveEdgeIds(new Set())
    setVisitedNodeIds(new Set())
    setVisitedEdgeIds(new Set())
    onNodeHighlight?.(new Set(), new Set())
    onEdgeHighlight?.(new Set(), new Set())
  }, [clearTimer, onNodeHighlight, onEdgeHighlight])

  // 다음 스텝
  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else if (config.loop) {
      setCurrentStepIndex(0)
    }
  }, [currentStepIndex, steps.length, config.loop])

  // 이전 스텝
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    } else if (config.loop) {
      setCurrentStepIndex(steps.length - 1)
    }
  }, [currentStepIndex, config.loop, steps.length])

  // 특정 스텝으로 이동
  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index)
    }
  }, [steps.length])

  // 속도 변경
  const setSpeed = useCallback((speed: number) => {
    setConfig(prev => ({ ...prev, speed: Math.max(0.5, Math.min(3, speed)) }))
  }, [])

  // 반복 토글
  const toggleLoop = useCallback(() => {
    setConfig(prev => ({ ...prev, loop: !prev.loop }))
  }, [])

  // 모드 변경
  const setMode = useCallback((mode: SimulationMode) => {
    stop()
    setConfig(prev => ({ ...prev, mode }))
  }, [stop])

  // 설정 업데이트
  const updateConfig = useCallback((newConfig: Partial<SimulationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }, [])

  // 스텝 인덱스 변경 시 적용
  useEffect(() => {
    if (currentStepIndex >= 0) {
      applyStep(currentStepIndex)
    }
  }, [currentStepIndex, applyStep])

  // 재생 중일 때 타이머 스케줄
  useEffect(() => {
    if (state === 'playing') {
      scheduleNextStep()
    }

    return () => clearTimer()
  }, [state, currentStepIndex, scheduleNextStep, clearTimer])

  // 노드/엣지 변경 시 스텝 재생성
  useEffect(() => {
    if (steps.length > 0) {
      generateSteps()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length])

  return {
    // State
    state,
    config,
    steps,
    currentStepIndex,
    activeNodeIds,
    activeEdgeIds,
    visitedNodeIds,
    visitedEdgeIds,
    progress,
    // Actions
    play,
    pause,
    stop,
    nextStep,
    prevStep,
    goToStep,
    setSpeed,
    toggleLoop,
    setMode,
    updateConfig,
    generateSteps,
  }
}
