# Neural Map MCP Integration

Neural Map은 MCP (Model Context Protocol)를 통해 Claude Code CLI에서 완전히 제어할 수 있습니다.

## 설정 방법

### 1. Claude Code MCP 설정 추가

`~/.config/claude/mcp.json` 파일에 다음을 추가:

```json
{
  "mcpServers": {
    "neural-map": {
      "command": "node",
      "args": ["/path/to/GlowUS/server/neural-map-mcp-server.js"],
      "env": {}
    }
  }
}
```

경로를 실제 GlowUS 프로젝트 경로로 변경하세요.

### 2. WebSocket 브릿지 서버 실행

터미널에서:
```bash
cd /path/to/GlowUS
npm run mcp:neural-map-ws
```

또는 GlowUS를 Electron으로 실행하면 자동으로 시작됩니다:
```bash
npm run electron:dev
```

### 3. Neural Map 페이지 열기

GlowUS에서 Neural Map 페이지를 열면 자동으로 WebSocket에 연결됩니다.

## 사용 가능한 도구

### 상태 조회
- `get_neural_map_state` - 현재 상태 조회
- `get_file_tree` - 파일 트리 조회
- `get_node_info` - 특정 노드 정보 조회

### 노드 선택/포커스
- `select_node` - 노드 선택
- `select_nodes` - 여러 노드 선택
- `focus_node` - 노드로 카메라 이동
- `deselect_all` - 선택 해제

### 뷰 전환
- `switch_view` - 뷰 전환 (map, cosmic, logic, data, mermaid 등)
- `set_mermaid_type` - Mermaid 다이어그램 타입 설정

### 파일 작업
- `open_file` - 파일 열기
- `read_file` - 파일 읽기

### 프로젝트 분석
- `analyze_project` - 프로젝트 분석
- `refresh_graph` - 그래프 새로고침

### 검색
- `search_nodes` - 노드 검색
- `find_file` - 파일 찾기

### 노드 확장/접기
- `expand_node` - 폴더 펼치기
- `collapse_node` - 폴더 접기
- `expand_all` - 모두 펼치기
- `collapse_all` - 모두 접기

### 패널 제어
- `toggle_panel` - 패널 토글 (left, right, terminal)
- `set_right_panel_tab` - 오른쪽 패널 탭 변경

### 카메라 제어
- `reset_camera` - 카메라 리셋
- `set_camera` - 카메라 위치 설정

### 레이아웃
- `set_layout` - 레이아웃 모드 변경
- `reset_layout` - 레이아웃 초기화

### 테마
- `set_theme` - 테마 변경

### 터미널
- `open_terminal` - 터미널 열기
- `close_terminal` - 터미널 닫기
- `run_command` - 터미널 명령 실행

## 예제

Claude Code에서:

```
# 프로젝트 분석
/mcp neural-map analyze_project path=/path/to/project

# 뷰 전환
/mcp neural-map switch_view view=logic

# 파일 검색 및 열기
/mcp neural-map find_file pattern=*.tsx
/mcp neural-map open_file filePath=components/App.tsx

# 노드 검색 및 포커스
/mcp neural-map search_nodes query=store
/mcp neural-map focus_node nodeId=node-123
```

## 아키텍처

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Claude Code    │────▶│  MCP Server         │────▶│  WebSocket      │
│  CLI            │     │  (neural-map-mcp)   │     │  Bridge         │
└─────────────────┘     └─────────────────────┘     │  (port 3002)    │
                                                     └────────┬────────┘
                                                              │
                                                     ┌────────▼────────┐
                                                     │  Neural Map     │
                                                     │  Frontend       │
                                                     │  (useMcpBridge) │
                                                     └─────────────────┘
```

## 문제 해결

### WebSocket 연결 안됨
1. WebSocket 서버 실행 확인: `npm run mcp:neural-map-ws`
2. 포트 3002가 사용 중인지 확인: `lsof -i :3002`
3. Neural Map 페이지가 열려있는지 확인

### MCP 서버 등록 안됨
1. `~/.config/claude/mcp.json` 파일 경로 확인
2. 서버 경로가 절대 경로인지 확인
3. Claude Code 재시작
