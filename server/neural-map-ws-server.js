#!/usr/bin/env node

/**
 * Neural Map WebSocket Server
 * MCP 서버와 프론트엔드 사이의 브릿지 역할
 * 포트: 3002
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 3002;

// 연결된 클라이언트들
let mcpClient = null;
let frontendClient = null;

// Neural Map 상태 캐시
let cachedState = {
  graph: null,
  files: [],
  selectedNodeIds: [],
  activeTab: 'map',
  projectPath: null,
  expandedNodeIds: [],
};

const wss = new WebSocket.Server({ port: PORT });

console.log(`[Neural Map WS] 서버 시작됨: ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('[Neural Map WS] 새 클라이언트 연결');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(ws, msg);
    } catch (e) {
      console.error('[Neural Map WS] 메시지 파싱 실패:', e);
    }
  });

  ws.on('close', () => {
    if (ws === mcpClient) {
      console.log('[Neural Map WS] MCP 클라이언트 연결 해제');
      mcpClient = null;
    } else if (ws === frontendClient) {
      console.log('[Neural Map WS] 프론트엔드 클라이언트 연결 해제');
      frontendClient = null;
    }
  });

  ws.on('error', (err) => {
    console.error('[Neural Map WS] WebSocket 오류:', err.message);
  });
});

/**
 * 메시지 처리
 */
function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'mcp-connect':
      // MCP 서버 연결
      mcpClient = ws;
      console.log('[Neural Map WS] MCP 클라이언트 등록됨');
      break;

    case 'frontend-connect':
      // 프론트엔드 연결
      frontendClient = ws;
      console.log('[Neural Map WS] 프론트엔드 클라이언트 등록됨');
      break;

    case 'get-neural-map-state':
      // MCP가 상태 요청
      if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
        frontendClient.send(JSON.stringify({ type: 'get-state' }));
      } else {
        // 캐시된 상태 반환
        ws.send(JSON.stringify({
          type: 'neural-map-state',
          ...cachedState,
        }));
      }
      break;

    case 'neural-map-state':
      // 프론트엔드에서 상태 업데이트
      cachedState = {
        graph: msg.graph || null,
        files: msg.files || [],
        selectedNodeIds: msg.selectedNodeIds || [],
        activeTab: msg.activeTab || 'map',
        projectPath: msg.projectPath || null,
        expandedNodeIds: msg.expandedNodeIds || [],
      };
      // MCP 클라이언트에 전달
      if (mcpClient && mcpClient.readyState === WebSocket.OPEN) {
        mcpClient.send(JSON.stringify({
          type: 'neural-map-state',
          ...cachedState,
        }));
      }
      break;

    case 'mcp-command':
      // MCP 명령을 프론트엔드로 전달
      if (frontendClient && frontendClient.readyState === WebSocket.OPEN) {
        frontendClient.send(JSON.stringify(msg));
      } else {
        // 프론트엔드 연결 안됨 - 오류 반환
        ws.send(JSON.stringify({
          type: 'mcp-response',
          requestId: msg.requestId,
          result: { error: 'Neural Map 프론트엔드가 연결되어 있지 않습니다.' },
        }));
      }
      break;

    case 'mcp-response':
      // 프론트엔드 응답을 MCP로 전달
      if (mcpClient && mcpClient.readyState === WebSocket.OPEN) {
        mcpClient.send(JSON.stringify(msg));
      }
      break;

    default:
      console.log('[Neural Map WS] 알 수 없는 메시지 타입:', msg.type);
  }
}

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('[Neural Map WS] 서버 종료 중...');
  wss.close(() => {
    console.log('[Neural Map WS] 서버 종료됨');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  wss.close(() => {
    process.exit(0);
  });
});
