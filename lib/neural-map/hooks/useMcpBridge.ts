'use client'

/**
 * Neural Map MCP Bridge Hook
 * WebSocket을 통해 MCP 서버와 통신하여 Neural Map을 제어합니다.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useNeuralMapStore } from '../store'

const WS_URL = 'ws://localhost:3002'

interface McpCommand {
  type: 'mcp-command'
  requestId: number
  command: string
  params: Record<string, unknown>
}

export function useMcpBridge() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectedRef = useRef(false)

  // Store actions
  const {
    // State
    graph,
    files,
    selectedNodeIds,
    activeTab,
    projectPath,
    expandedNodeIds,
    // Actions
    selectNode,
    selectNodes,
    setSelectedNodes,
    deselectAll,
    focusOnNode,
    setActiveTab,
    setMermaidDiagramType,
    expandNode,
    collapseNode,
    setExpandedNodes,
    toggleLeftPanel,
    toggleRightPanel,
    setRightPanelTab,
    resetCamera,
    setCameraState,
    setLayoutMode,
    resetLayout,
    setTheme,
    toggleTerminal,
    setSearchQuery,
    searchResults,
    setSearchResults,
    openCodePreview,
    buildGraphFromFilesAsync,
    setFiles,
  } = useNeuralMapStore()

  /**
   * 현재 상태를 WS 서버로 전송
   */
  const sendState = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'neural-map-state',
        graph: graph ? {
          nodes: graph.nodes,
          edges: graph.edges,
          clusters: graph.clusters,
          title: graph.title,
        } : null,
        files,
        selectedNodeIds,
        activeTab,
        projectPath,
        expandedNodeIds: Array.from(expandedNodeIds),
      }))
    }
  }, [graph, files, selectedNodeIds, activeTab, projectPath, expandedNodeIds])

  /**
   * MCP 응답 전송
   */
  const sendResponse = useCallback((requestId: number, result: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mcp-response',
        requestId,
        result,
      }))
    }
  }, [])

  /**
   * MCP 명령 처리
   */
  const handleMcpCommand = useCallback(async (msg: McpCommand) => {
    const { requestId, command, params } = msg
    let result: unknown = { success: true }

    try {
      switch (command) {
        // ============ 상태 조회 ============
        case 'get_file_tree':
          result = {
            files: files.map(f => ({
              id: f.id,
              name: f.name,
              path: f.path,
              type: f.type,
            })),
            count: files.length,
          }
          break

        case 'get_node_info':
          const nodeId = params.nodeId as string
          const node = graph?.nodes.find(n => n.id === nodeId)
          if (node) {
            result = {
              id: node.id,
              type: node.type,
              title: node.title,
              summary: node.summary,
              tags: node.tags,
              parentId: node.parentId,
              expanded: node.expanded,
              position: node.position,
            }
          } else {
            result = { error: `노드를 찾을 수 없습니다: ${nodeId}` }
          }
          break

        // ============ 노드 선택/포커스 ============
        case 'select_node':
          selectNode(params.nodeId as string, params.multi as boolean)
          result = { success: true, selectedNodeIds: [params.nodeId] }
          break

        case 'select_nodes':
          selectNodes(params.nodeIds as string[])
          result = { success: true, selectedNodeIds: params.nodeIds }
          break

        case 'focus_node':
          focusOnNode(params.nodeId as string)
          result = { success: true, focusedNodeId: params.nodeId }
          break

        case 'deselect_all':
          deselectAll()
          result = { success: true }
          break

        // ============ 뷰 전환 ============
        case 'switch_view':
          setActiveTab(params.view as any)
          result = { success: true, activeTab: params.view }
          break

        case 'set_mermaid_type':
          setMermaidDiagramType(params.type as any)
          result = { success: true, mermaidType: params.type }
          break

        // ============ 파일 작업 ============
        case 'open_file':
          const filePath = params.filePath as string
          const file = files.find(f => f.path === filePath || f.name === filePath)
          if (file) {
            openCodePreview(file)
            result = { success: true, file: { id: file.id, name: file.name, path: file.path } }
          } else {
            result = { error: `파일을 찾을 수 없습니다: ${filePath}` }
          }
          break

        case 'read_file':
          const readPath = params.filePath as string
          const readFile = files.find(f => f.path === readPath || f.name === readPath)
          if (readFile) {
            result = {
              id: readFile.id,
              name: readFile.name,
              path: readFile.path,
              type: readFile.type,
              content: readFile.content || '(내용 없음)',
            }
          } else {
            result = { error: `파일을 찾을 수 없습니다: ${readPath}` }
          }
          break

        // ============ 프로젝트 분석 ============
        case 'analyze_project':
          // Electron 환경에서만 작동
          if (typeof window !== 'undefined' && (window as any).electron?.fs) {
            const analyzePath = params.path as string
            try {
              const scanResult = await (window as any).electron.fs.scanTree(analyzePath, {
                includeContent: true,
                maxDepth: 10,
              })
              if (scanResult.success) {
                setFiles(scanResult.files)
                await buildGraphFromFilesAsync()
                result = { success: true, fileCount: scanResult.files.length }
              } else {
                result = { error: scanResult.error }
              }
            } catch (e: any) {
              result = { error: e.message }
            }
          } else {
            result = { error: 'Electron 환경에서만 프로젝트 분석이 가능합니다.' }
          }
          break

        case 'refresh_graph':
          await buildGraphFromFilesAsync()
          result = { success: true, nodeCount: graph?.nodes?.length || 0 }
          break

        // ============ 검색 ============
        case 'search_nodes':
          const query = (params.query as string).toLowerCase()
          const matchedNodes = graph?.nodes.filter(n =>
            n.title.toLowerCase().includes(query) ||
            n.summary?.toLowerCase().includes(query) ||
            n.tags.some(t => t.toLowerCase().includes(query))
          ) || []
          setSearchQuery(params.query as string)
          setSearchResults(matchedNodes)
          result = {
            query: params.query,
            count: matchedNodes.length,
            nodes: matchedNodes.map(n => ({
              id: n.id,
              type: n.type,
              title: n.title,
            })),
          }
          break

        case 'find_file':
          const pattern = (params.pattern as string).toLowerCase()
          const matchedFiles = files.filter(f => {
            const name = f.name.toLowerCase()
            const path = (f.path || '').toLowerCase()
            if (pattern.includes('*')) {
              // 간단한 glob 패턴 지원
              const regex = new RegExp(pattern.replace(/\*/g, '.*'))
              return regex.test(name) || regex.test(path)
            }
            return name.includes(pattern) || path.includes(pattern)
          })
          result = {
            pattern: params.pattern,
            count: matchedFiles.length,
            files: matchedFiles.map(f => ({
              id: f.id,
              name: f.name,
              path: f.path,
            })),
          }
          break

        // ============ 노드 확장/접기 ============
        case 'expand_node':
          expandNode(params.nodeId as string)
          result = { success: true }
          break

        case 'collapse_node':
          collapseNode(params.nodeId as string)
          result = { success: true }
          break

        case 'expand_all':
          const folderNodes = graph?.nodes.filter(n => n.type === 'folder' || n.type === 'project') || []
          setExpandedNodes(folderNodes.map(n => n.id))
          result = { success: true, expandedCount: folderNodes.length }
          break

        case 'collapse_all':
          setExpandedNodes([])
          result = { success: true }
          break

        // ============ 패널 제어 ============
        case 'toggle_panel':
          if (params.panel === 'left') {
            toggleLeftPanel()
          } else if (params.panel === 'right') {
            toggleRightPanel()
          } else if (params.panel === 'terminal') {
            toggleTerminal()
          }
          result = { success: true }
          break

        case 'set_right_panel_tab':
          setRightPanelTab(params.tab as any)
          result = { success: true, tab: params.tab }
          break

        // ============ 카메라 제어 ============
        case 'reset_camera':
          resetCamera()
          result = { success: true }
          break

        case 'set_camera':
          if (params.position || params.target) {
            setCameraState({
              position: params.position as any || { x: 0, y: 0, z: 200 },
              target: params.target as any || { x: 0, y: 0, z: 0 },
            })
          }
          result = { success: true }
          break

        // ============ 레이아웃 ============
        case 'set_layout':
          setLayoutMode(params.mode as any)
          result = { success: true, layout: params.mode }
          break

        case 'reset_layout':
          resetLayout()
          result = { success: true }
          break

        // ============ 테마 ============
        case 'set_theme':
          setTheme(params.themeId as string)
          result = { success: true, themeId: params.themeId }
          break

        // ============ 터미널 ============
        case 'open_terminal':
          if (!useNeuralMapStore.getState().terminalOpen) {
            toggleTerminal()
          }
          result = { success: true }
          break

        case 'close_terminal':
          if (useNeuralMapStore.getState().terminalOpen) {
            toggleTerminal()
          }
          result = { success: true }
          break

        case 'run_command':
          // 터미널에 명령 전송 (CustomEvent 사용)
          if (typeof window !== 'undefined') {
            const activeTerminalId = useNeuralMapStore.getState().activeTerminalId
            if (activeTerminalId) {
              window.dispatchEvent(new CustomEvent('terminal-write', {
                detail: {
                  id: activeTerminalId,
                  text: params.command + '\r',
                },
              }))
              result = { success: true, command: params.command }
            } else {
              result = { error: '활성 터미널이 없습니다.' }
            }
          }
          break

        default:
          result = { error: `알 수 없는 명령: ${command}` }
      }
    } catch (error: any) {
      result = { error: error.message }
    }

    sendResponse(requestId, result)
  }, [
    graph, files, selectedNodeIds, activeTab, projectPath, expandedNodeIds,
    selectNode, selectNodes, deselectAll, focusOnNode, setActiveTab,
    setMermaidDiagramType, expandNode, collapseNode, setExpandedNodes,
    toggleLeftPanel, toggleRightPanel, setRightPanelTab, resetCamera,
    setCameraState, setLayoutMode, resetLayout, setTheme, toggleTerminal,
    setSearchQuery, setSearchResults, openCodePreview, buildGraphFromFilesAsync,
    setFiles, sendResponse,
  ])

  /**
   * WebSocket 연결
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        console.log('[MCP Bridge] WebSocket 연결됨')
        isConnectedRef.current = true
        ws.send(JSON.stringify({ type: 'frontend-connect' }))
        // 초기 상태 전송
        setTimeout(sendState, 100)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === 'get-state') {
            sendState()
          } else if (msg.type === 'mcp-command') {
            handleMcpCommand(msg as McpCommand)
          }
        } catch (e) {
          console.error('[MCP Bridge] 메시지 파싱 실패:', e)
        }
      }

      ws.onclose = () => {
        console.log('[MCP Bridge] WebSocket 연결 해제됨')
        isConnectedRef.current = false
        wsRef.current = null

        // 5초 후 재연결
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            connect()
          }, 5000)
        }
      }

      ws.onerror = (err) => {
        console.error('[MCP Bridge] WebSocket 오류:', err)
      }

      wsRef.current = ws
    } catch (e) {
      console.error('[MCP Bridge] 연결 실패:', e)
    }
  }, [sendState, handleMcpCommand])

  /**
   * 초기 연결 및 정리
   */
  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  /**
   * 상태 변경 시 자동 동기화
   */
  useEffect(() => {
    if (isConnectedRef.current) {
      sendState()
    }
  }, [graph, files, selectedNodeIds, activeTab, projectPath, expandedNodeIds, sendState])

  return {
    isConnected: isConnectedRef.current,
    reconnect: connect,
  }
}
