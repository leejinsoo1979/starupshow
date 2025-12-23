#!/usr/bin/env node

/**
 * Neural Map MCP Server
 * Claude Code CLI에서 Neural Map을 제어할 수 있게 해주는 MCP 서버
 *
 * 기능:
 * - 프로젝트 파일 트리 조회/탐색
 * - 노드 선택/포커스
 * - 뷰 전환 (map, cosmic, logic, data, mermaid)
 * - 코드 프리뷰 열기
 * - 프로젝트 분석
 * - 검색
 * - 터미널 제어
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const WebSocket = require('ws');

// Neural Map 상태
let neuralMapState = {
  graph: null,
  files: [],
  selectedNodeIds: [],
  activeTab: 'map',
  projectPath: null,
  expandedNodeIds: [],
};

// WebSocket 연결
let wsConnection = null;
let wsReconnectTimer = null;
let wsReconnectAttempts = 0;
const WS_URL = 'ws://localhost:3002'; // Neural Map 전용 포트
const MAX_RECONNECT_ATTEMPTS = Infinity;
const RECONNECT_DELAY = 5000;

// 대기 중인 요청들
const pendingRequests = new Map();
let requestIdCounter = 0;

/**
 * WebSocket 연결 설정
 */
function connectWebSocket() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    return;
  }

  try {
    wsConnection = new WebSocket(WS_URL);

    wsConnection.on('open', () => {
      console.error('[Neural Map MCP] WebSocket 연결됨');
      wsReconnectAttempts = 0;
      wsConnection.send(JSON.stringify({ type: 'mcp-connect', client: 'neural-map' }));
    });

    wsConnection.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleWebSocketMessage(msg);
      } catch (e) {
        console.error('[Neural Map MCP] 메시지 파싱 실패:', e);
      }
    });

    wsConnection.on('close', () => {
      console.error('[Neural Map MCP] WebSocket 연결 끊김, 재연결 중...');
      wsConnection = null;
      scheduleReconnect();
    });

    wsConnection.on('error', (err) => {
      console.error('[Neural Map MCP] WebSocket 오류:', err.message);
    });
  } catch (e) {
    console.error('[Neural Map MCP] 연결 실패:', e);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (wsReconnectTimer) return;
  wsReconnectAttempts++;
  const delay = Math.min(RECONNECT_DELAY * Math.min(wsReconnectAttempts, 6), 30000);
  console.error(`[Neural Map MCP] ${delay/1000}초 후 재연결 시도 (${wsReconnectAttempts}회)...`);
  wsReconnectTimer = setTimeout(() => {
    wsReconnectTimer = null;
    connectWebSocket();
  }, delay);
}

function ensureConnection() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    return true;
  }
  if (!wsReconnectTimer) {
    connectWebSocket();
  }
  return false;
}

/**
 * WebSocket 메시지 처리
 */
function handleWebSocketMessage(msg) {
  switch (msg.type) {
    case 'neural-map-state':
      neuralMapState = {
        graph: msg.graph || null,
        files: msg.files || [],
        selectedNodeIds: msg.selectedNodeIds || [],
        activeTab: msg.activeTab || 'map',
        projectPath: msg.projectPath || null,
        expandedNodeIds: msg.expandedNodeIds || [],
      };
      break;

    case 'mcp-response':
      const callback = pendingRequests.get(msg.requestId);
      if (callback) {
        pendingRequests.delete(msg.requestId);
        callback(msg.result);
      }
      break;
  }
}

/**
 * 상태 요청
 */
function requestNeuralMapState() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    wsConnection.send(JSON.stringify({ type: 'get-neural-map-state' }));
  }
}

/**
 * MCP 명령 전송
 */
function sendMcpCommand(command, params) {
  return new Promise((resolve, reject) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket 연결 안됨. GlowUS Neural Map이 실행 중인지 확인하세요.'));
      return;
    }

    const requestId = ++requestIdCounter;
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('요청 시간 초과'));
    }, 10000);

    pendingRequests.set(requestId, (result) => {
      clearTimeout(timeout);
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result);
      }
    });

    wsConnection.send(JSON.stringify({
      type: 'mcp-command',
      requestId,
      command,
      params,
    }));
  });
}

/**
 * MCP Server 생성
 */
const server = new Server(
  {
    name: 'neural-map',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * 도구 목록
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ============ 상태 조회 ============
      {
        name: 'get_neural_map_state',
        description: 'Neural Map의 현재 상태를 조회합니다 (그래프, 파일, 선택된 노드 등)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_file_tree',
        description: '프로젝트의 파일 트리를 조회합니다',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '조회할 디렉토리 경로 (선택사항, 기본: 프로젝트 루트)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_node_info',
        description: '특정 노드의 상세 정보를 조회합니다',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: '노드 ID',
            },
          },
          required: ['nodeId'],
        },
      },

      // ============ 노드 선택/포커스 ============
      {
        name: 'select_node',
        description: '노드를 선택합니다',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: '선택할 노드 ID',
            },
            multi: {
              type: 'boolean',
              description: '다중 선택 모드 (기존 선택 유지)',
            },
          },
          required: ['nodeId'],
        },
      },
      {
        name: 'select_nodes',
        description: '여러 노드를 선택합니다',
        inputSchema: {
          type: 'object',
          properties: {
            nodeIds: {
              type: 'array',
              items: { type: 'string' },
              description: '선택할 노드 ID 배열',
            },
          },
          required: ['nodeIds'],
        },
      },
      {
        name: 'focus_node',
        description: '노드로 카메라를 이동합니다',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: '포커스할 노드 ID',
            },
          },
          required: ['nodeId'],
        },
      },
      {
        name: 'deselect_all',
        description: '모든 노드 선택을 해제합니다',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },

      // ============ 뷰 전환 ============
      {
        name: 'switch_view',
        description: 'Neural Map 뷰를 전환합니다',
        inputSchema: {
          type: 'object',
          properties: {
            view: {
              type: 'string',
              enum: ['map', 'life-stream', 'data', 'logic', 'test', 'browser', 'mermaid'],
              description: '전환할 뷰',
            },
          },
          required: ['view'],
        },
      },
      {
        name: 'set_mermaid_type',
        description: 'Mermaid 다이어그램 타입을 설정합니다',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['flowchart', 'sequence', 'class', 'er', 'gantt', 'pie', 'state', 'gitgraph'],
              description: '다이어그램 타입',
            },
          },
          required: ['type'],
        },
      },

      // ============ 파일 작업 ============
      {
        name: 'open_file',
        description: '파일을 코드 프리뷰에서 엽니다',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: '열 파일 경로',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'read_file',
        description: '파일 내용을 읽습니다',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: '읽을 파일 경로',
            },
          },
          required: ['filePath'],
        },
      },

      // ============ 프로젝트 분석 ============
      {
        name: 'analyze_project',
        description: '프로젝트를 분석하여 Neural Map 그래프를 생성합니다',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '분석할 프로젝트 경로',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'refresh_graph',
        description: '현재 프로젝트의 그래프를 다시 빌드합니다',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },

      // ============ 검색 ============
      {
        name: 'search_nodes',
        description: '노드를 검색합니다',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '검색어',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'find_file',
        description: '파일을 이름으로 찾습니다',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: '파일 이름 패턴 (예: *.tsx, store.ts)',
            },
          },
          required: ['pattern'],
        },
      },

      // ============ 노드 확장/접기 ============
      {
        name: 'expand_node',
        description: '폴더 노드를 펼칩니다',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: '펼칠 노드 ID',
            },
          },
          required: ['nodeId'],
        },
      },
      {
        name: 'collapse_node',
        description: '폴더 노드를 접습니다',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: '접을 노드 ID',
            },
          },
          required: ['nodeId'],
        },
      },
      {
        name: 'expand_all',
        description: '모든 폴더 노드를 펼칩니다',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'collapse_all',
        description: '모든 폴더 노드를 접습니다',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },

      // ============ 패널 제어 ============
      {
        name: 'toggle_panel',
        description: '패널을 열거나 닫습니다',
        inputSchema: {
          type: 'object',
          properties: {
            panel: {
              type: 'string',
              enum: ['left', 'right', 'terminal'],
              description: '토글할 패널',
            },
          },
          required: ['panel'],
        },
      },
      {
        name: 'set_right_panel_tab',
        description: '오른쪽 패널의 탭을 변경합니다',
        inputSchema: {
          type: 'object',
          properties: {
            tab: {
              type: 'string',
              enum: ['inspector', 'actions', 'chat', 'settings'],
              description: '탭 이름',
            },
          },
          required: ['tab'],
        },
      },

      // ============ 카메라 제어 ============
      {
        name: 'reset_camera',
        description: '카메라를 초기 위치로 리셋합니다',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'set_camera',
        description: '카메라 위치를 설정합니다',
        inputSchema: {
          type: 'object',
          properties: {
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' },
              },
              description: '카메라 위치',
            },
            target: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' },
              },
              description: '카메라 타겟',
            },
          },
          required: [],
        },
      },

      // ============ 레이아웃 ============
      {
        name: 'set_layout',
        description: '그래프 레이아웃을 변경합니다',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['organic', 'radial', 'structural'],
              description: '레이아웃 모드',
            },
          },
          required: ['mode'],
        },
      },
      {
        name: 'reset_layout',
        description: '레이아웃을 초기화하고 시뮬레이션을 다시 시작합니다',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },

      // ============ 테마 ============
      {
        name: 'set_theme',
        description: '테마를 변경합니다',
        inputSchema: {
          type: 'object',
          properties: {
            themeId: {
              type: 'string',
              description: '테마 ID (cosmic-dark, ocean-depth, forest-mist 등)',
            },
          },
          required: ['themeId'],
        },
      },

      // ============ 터미널 ============
      {
        name: 'open_terminal',
        description: '터미널을 엽니다',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'close_terminal',
        description: '터미널을 닫습니다',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'run_command',
        description: '터미널에서 명령을 실행합니다',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: '실행할 명령',
            },
          },
          required: ['command'],
        },
      },
    ],
  };
});

/**
 * 도구 실행
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  ensureConnection();

  try {
    let result;

    switch (name) {
      // ============ 상태 조회 ============
      case 'get_neural_map_state':
        ensureConnection();
        requestNeuralMapState();
        await new Promise(resolve => setTimeout(resolve, 100));
        result = {
          hasGraph: !!neuralMapState.graph,
          nodeCount: neuralMapState.graph?.nodes?.length || 0,
          edgeCount: neuralMapState.graph?.edges?.length || 0,
          fileCount: neuralMapState.files?.length || 0,
          selectedNodeIds: neuralMapState.selectedNodeIds,
          activeTab: neuralMapState.activeTab,
          projectPath: neuralMapState.projectPath,
        };
        break;

      case 'get_file_tree':
        result = await sendMcpCommand('get_file_tree', args);
        break;

      case 'get_node_info':
        result = await sendMcpCommand('get_node_info', args);
        break;

      // ============ 노드 선택/포커스 ============
      case 'select_node':
        result = await sendMcpCommand('select_node', args);
        break;

      case 'select_nodes':
        result = await sendMcpCommand('select_nodes', args);
        break;

      case 'focus_node':
        result = await sendMcpCommand('focus_node', args);
        break;

      case 'deselect_all':
        result = await sendMcpCommand('deselect_all', args);
        break;

      // ============ 뷰 전환 ============
      case 'switch_view':
        result = await sendMcpCommand('switch_view', args);
        break;

      case 'set_mermaid_type':
        result = await sendMcpCommand('set_mermaid_type', args);
        break;

      // ============ 파일 작업 ============
      case 'open_file':
        result = await sendMcpCommand('open_file', args);
        break;

      case 'read_file':
        result = await sendMcpCommand('read_file', args);
        break;

      // ============ 프로젝트 분석 ============
      case 'analyze_project':
        result = await sendMcpCommand('analyze_project', args);
        break;

      case 'refresh_graph':
        result = await sendMcpCommand('refresh_graph', args);
        break;

      // ============ 검색 ============
      case 'search_nodes':
        result = await sendMcpCommand('search_nodes', args);
        break;

      case 'find_file':
        result = await sendMcpCommand('find_file', args);
        break;

      // ============ 노드 확장/접기 ============
      case 'expand_node':
        result = await sendMcpCommand('expand_node', args);
        break;

      case 'collapse_node':
        result = await sendMcpCommand('collapse_node', args);
        break;

      case 'expand_all':
        result = await sendMcpCommand('expand_all', args);
        break;

      case 'collapse_all':
        result = await sendMcpCommand('collapse_all', args);
        break;

      // ============ 패널 제어 ============
      case 'toggle_panel':
        result = await sendMcpCommand('toggle_panel', args);
        break;

      case 'set_right_panel_tab':
        result = await sendMcpCommand('set_right_panel_tab', args);
        break;

      // ============ 카메라 제어 ============
      case 'reset_camera':
        result = await sendMcpCommand('reset_camera', args);
        break;

      case 'set_camera':
        result = await sendMcpCommand('set_camera', args);
        break;

      // ============ 레이아웃 ============
      case 'set_layout':
        result = await sendMcpCommand('set_layout', args);
        break;

      case 'reset_layout':
        result = await sendMcpCommand('reset_layout', args);
        break;

      // ============ 테마 ============
      case 'set_theme':
        result = await sendMcpCommand('set_theme', args);
        break;

      // ============ 터미널 ============
      case 'open_terminal':
        result = await sendMcpCommand('open_terminal', args);
        break;

      case 'close_terminal':
        result = await sendMcpCommand('close_terminal', args);
        break;

      case 'run_command':
        result = await sendMcpCommand('run_command', args);
        break;

      default:
        throw new Error(`알 수 없는 도구: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `오류: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * 리소스 목록
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'neural-map://state',
        name: 'Neural Map 상태',
        description: '현재 Neural Map의 전체 상태 (그래프, 파일, 선택 등)',
        mimeType: 'application/json',
      },
      {
        uri: 'neural-map://graph',
        name: '그래프 데이터',
        description: '노드와 엣지 정보',
        mimeType: 'application/json',
      },
      {
        uri: 'neural-map://files',
        name: '파일 목록',
        description: '프로젝트 파일 목록',
        mimeType: 'application/json',
      },
    ],
  };
});

/**
 * 리소스 읽기
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  requestNeuralMapState();
  await new Promise(resolve => setTimeout(resolve, 100));

  switch (uri) {
    case 'neural-map://state':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              graph: neuralMapState.graph ? {
                nodeCount: neuralMapState.graph.nodes?.length || 0,
                edgeCount: neuralMapState.graph.edges?.length || 0,
                title: neuralMapState.graph.title,
              } : null,
              files: neuralMapState.files?.length || 0,
              selectedNodeIds: neuralMapState.selectedNodeIds,
              activeTab: neuralMapState.activeTab,
              projectPath: neuralMapState.projectPath,
            }, null, 2),
          },
        ],
      };

    case 'neural-map://graph':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              nodes: neuralMapState.graph?.nodes?.map(n => ({
                id: n.id,
                type: n.type,
                title: n.title,
                parentId: n.parentId,
              })) || [],
              edges: neuralMapState.graph?.edges?.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: e.type,
              })) || [],
            }, null, 2),
          },
        ],
      };

    case 'neural-map://files':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(neuralMapState.files?.map(f => ({
              id: f.id,
              name: f.name,
              path: f.path,
              type: f.type,
            })) || [], null, 2),
          },
        ],
      };

    default:
      throw new Error(`알 수 없는 리소스: ${uri}`);
  }
});

/**
 * 서버 시작
 */
async function main() {
  connectWebSocket();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[Neural Map MCP] 서버 시작됨');
}

main().catch((error) => {
  console.error('[Neural Map MCP] 치명적 오류:', error);
  process.exit(1);
});
