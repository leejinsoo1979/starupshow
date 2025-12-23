# 08. GlowUS 통합

## 🔗 기존 인프라 매핑

GlowUS에 이미 구축된 인프라를 NeuraMap에 활용합니다.

---

## 📊 기존 인프라 현황

### 1. LangGraph Executor (이미 있음)

**위치**: `/ai-backend/agents/langgraph_executor.py`

**기능**:
- StateGraph 기반 워크플로우 실행
- 멀티 모델 지원 (GPT-4o, Claude, Grok, Gemini, Ollama)
- 스트리밍 실행
- 도구 바인딩

**NeuraMap 매핑**:
```python
# Agentic Loop를 LangGraph StateGraph로 구현
def create_neuramap_executor():
    workflow = StateGraph(AgentState)

    # 노드 정의
    workflow.add_node("plan", plan_node)
    workflow.add_node("modify", modify_node)
    workflow.add_node("verify", verify_node)
    workflow.add_node("commit", commit_node)

    # 엣지 정의
    workflow.set_entry_point("plan")
    workflow.add_edge("plan", "modify")
    workflow.add_edge("modify", "verify")
    workflow.add_conditional_edges(
        "verify",
        should_retry,
        {
            "retry": "modify",    # 실패 시 재시도
            "commit": "commit",   # 성공 시 커밋
        }
    )
    workflow.add_edge("commit", END)

    return workflow.compile()
```

### 2. Terminal Server (이미 있음)

**위치**: `/server/terminal-server.js`

**기능**:
- WebSocket 기반
- node-pty 통합
- 멀티 클라이언트 지원

**NeuraMap 매핑**:
```typescript
// repo.run() 구현에 사용
import WebSocket from 'ws';

class TerminalClient {
  private ws: WebSocket;

  async executeCommand(command: string, args: string[]): Promise<RunResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      this.ws.send(JSON.stringify({
        type: 'execute',
        command,
        args,
      }));

      this.ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'stdout') {
          stdout += msg.data;
        } else if (msg.type === 'stderr') {
          stderr += msg.data;
        } else if (msg.type === 'exit') {
          resolve({
            success: msg.code === 0,
            exitCode: msg.code,
            stdout,
            stderr,
            executionTime: Date.now() - startTime,
            timedOut: false,
          });
        }
      });
    });
  }
}
```

### 3. Tool Registry (이미 있음)

**위치**: `/ai-backend/tools/registry.py`

**기능**:
- 도구 등록 시스템
- 7개 특화 도구 (Docs, Sheet, Email 등)

**NeuraMap 매핑**:
```python
# 코딩 전용 도구 추가 등록
from ai_backend.tools.registry import register_tool
from ai_backend.tools.repo import (
    RepoSearchTool,
    RepoReadTool,
    RepoSymbolsTool,
    RepoPatchTool,
    RepoRunTool,
    RepoDiagnosticsTool,
    RepoGitTool,
    RepoLSPTool,
)

# 도구 등록
register_tool(RepoSearchTool())
register_tool(RepoReadTool())
register_tool(RepoSymbolsTool())
register_tool(RepoPatchTool())
register_tool(RepoRunTool())
register_tool(RepoDiagnosticsTool())
register_tool(RepoGitTool())
register_tool(RepoLSPTool())
```

### 4. Multi-Model Support (이미 있음)

**위치**: `/lib/ai/models.ts`

**기능**:
- Anthropic (Claude 3.5 Sonnet, Opus)
- OpenAI (GPT-4o, GPT-4 Turbo)
- Google (Gemini 1.5 Pro, 2.0 Flash)
- xAI (Grok-3-Fast)

**NeuraMap 매핑**:
```typescript
// 작업 유형별 최적 모델 선택
const MODEL_SELECTION: Record<string, string> = {
  plan: 'claude-3.5-sonnet',      // 긴 컨텍스트, 추론
  modify: 'gpt-4o',                // 코드 생성
  verify: 'grok-3-fast',           // 빠른 검증
  commit: 'gemini-2.0-flash-exp',  // 요약 생성
};

function selectModelForStage(stage: string): string {
  return MODEL_SELECTION[stage] || 'claude-3.5-sonnet';
}
```

---

## 🏗️ 새로운 컴포넌트 추가

### 1. Agent Chat Panel (신규)

**위치**: `/components/neural-map/AgentChatPanel.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useAgentExecution } from '@/lib/neural-map/hooks';

export function AgentChatPanel() {
  const [input, setInput] = useState('');
  const { execute, state, isExecuting } = useAgentExecution();

  const handleSubmit = async () => {
    await execute(input);
    setInput('');
  };

  return (
    <div className="agent-chat-panel">
      <ChatHistory messages={state.messages} />

      {state.plan && (
        <PlanCard
          plan={state.plan}
          onApprove={() => execute('approve')}
          onReject={() => execute('reject')}
        />
      )}

      {state.execution.stage !== 'idle' && (
        <ExecutionMonitor state={state} />
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isExecuting}
      />
    </div>
  );
}
```

### 2. Execution Hook (신규)

**위치**: `/lib/neural-map/hooks/useAgentExecution.ts`

```typescript
import { useState, useCallback } from 'react';

export function useAgentExecution() {
  const [state, setState] = useState<AgentState>(initialState);
  const [isExecuting, setIsExecuting] = useState(false);

  const execute = useCallback(async (input: string) => {
    setIsExecuting(true);

    const response = await fetch('/api/neural-map/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, state }),
    });

    // SSE 스트리밍
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const events = chunk.split('\n\n').filter(Boolean);

      for (const event of events) {
        if (event.startsWith('data: ')) {
          const data = JSON.parse(event.slice(6));
          setState(prev => updateState(prev, data));
        }
      }
    }

    setIsExecuting(false);
  }, [state]);

  return { execute, state, isExecuting };
}
```

### 3. API Route (신규)

**위치**: `/app/api/neural-map/execute/route.ts`

```typescript
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { input, state } = await req.json();

  // Python 백엔드로 요청
  const response = await fetch('http://localhost:8000/agent/neuramap/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, state }),
  });

  // 스트리밍 응답 전달
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### 4. Python Executor (신규)

**위치**: `/ai-backend/agents/neuramap_executor.py`

```python
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain_core.tools import BaseTool
from langgraph.graph import StateGraph, END
from typing import TypedDict, List
import asyncio

class NeuralMapState(TypedDict):
    messages: List[BaseMessage]
    context: dict
    plan: dict
    execution: dict
    metadata: dict

async def plan_node(state: NeuralMapState) -> NeuralMapState:
    """Plan Phase: 작업 분해 및 컨텍스트 수집"""
    user_request = state["messages"][-1].content

    # Tool 호출
    search_results = await repo_search_tool.ainvoke({"query": extract_keywords(user_request)})
    relevant_files = await repo_read_tool.ainvoke({"file": search_results[0]})

    # Plan 생성
    plan = generate_plan(user_request, search_results, relevant_files)

    return {
        **state,
        "plan": plan,
        "execution": {"stage": "plan"},
        "messages": state["messages"] + [AIMessage(content=f"Plan generated: {plan}")],
    }

async def modify_node(state: NeuralMapState) -> NeuralMapState:
    """Modify Phase: 코드 수정"""
    plan = state["plan"]
    current_task = plan["tasks"][plan["currentTaskIndex"]]

    # Patch 적용
    patch_result = await repo_patch_tool.ainvoke({
        "operations": current_task["operations"]
    })

    return {
        **state,
        "execution": {"stage": "modify", "result": patch_result},
        "messages": state["messages"] + [AIMessage(content=f"Applied patch: {patch_result}")],
    }

async def verify_node(state: NeuralMapState) -> NeuralMapState:
    """Verify Phase: 테스트 실행"""
    # Build, Lint, Test 실행
    build_result = await repo_run_tool.ainvoke({"command": "npm run build"})
    test_result = await repo_run_tool.ainvoke({"command": "npm test"})

    diagnostics = await repo_diagnostics_tool.ainvoke({})

    all_passed = (
        build_result["success"] and
        test_result["success"] and
        diagnostics["summary"]["errors"] == 0
    )

    return {
        **state,
        "execution": {
            "stage": "verify",
            "allPassed": all_passed,
            "results": {
                "build": build_result,
                "test": test_result,
                "diagnostics": diagnostics,
            }
        },
    }

async def commit_node(state: NeuralMapState) -> NeuralMapState:
    """Commit Phase: Git 커밋"""
    plan = state["plan"]

    # Git 커밋
    await repo_git_tool.ainvoke({"command": "add", "args": plan["files"]})
    commit_result = await repo_git_tool.ainvoke({
        "command": "commit",
        "args": ["-m", plan["commitMessage"]]
    })

    # GCC 체크포인트
    checkpoint_id = await gcc_commit(state)

    return {
        **state,
        "execution": {
            "stage": "commit",
            "commitSha": commit_result["output"],
            "checkpointId": checkpoint_id,
        },
    }

def should_retry(state: NeuralMapState) -> str:
    """Verify 결과에 따라 분기"""
    return "commit" if state["execution"]["allPassed"] else "retry"

# StateGraph 구성
workflow = StateGraph(NeuralMapState)
workflow.add_node("plan", plan_node)
workflow.add_node("modify", modify_node)
workflow.add_node("verify", verify_node)
workflow.add_node("commit", commit_node)

workflow.set_entry_point("plan")
workflow.add_edge("plan", "modify")
workflow.add_edge("modify", "verify")
workflow.add_conditional_edges("verify", should_retry, {
    "retry": "modify",
    "commit": "commit",
})
workflow.add_edge("commit", END)

neuramap_executor = workflow.compile()
```

---

## 🔄 데이터 플로우 통합

```
Frontend (React)
    │
    │ POST /api/neural-map/execute
    ▼
Next.js API Route
    │
    │ HTTP Request
    ▼
Python Backend (FastAPI)
    │
    │ LangGraph Executor
    ▼
NeuralMap Executor (StateGraph)
    │
    ├─→ Plan Node
    │   └─→ Tool: repo.search, repo.read, repo.symbols
    │
    ├─→ Modify Node
    │   └─→ Tool: repo.patch
    │
    ├─→ Verify Node
    │   └─→ Tool: repo.run (build, test)
    │   └─→ Tool: repo.diagnostics
    │
    └─→ Commit Node
        └─→ Tool: repo.git
        └─→ GCC.COMMIT
    │
    │ SSE Stream
    ▼
Next.js API Route (proxy)
    │
    │ SSE Stream
    ▼
Frontend (React)
    │
    └─→ UI Updates (ExecutionPanel, DiffViewer)
```

---

## 📦 패키지 구조

```
GlowUS/
├── app/
│   └── dashboard-group/
│       └── neural-map/
│           └── page.tsx                # NeuraMap 메인 페이지
├── components/
│   └── neural-map/
│       ├── AgentChatPanel.tsx
│       ├── PlanCard.tsx
│       ├── ExecutionMonitor.tsx
│       ├── DiffViewer.tsx
│       └── index.ts
├── lib/
│   └── neural-map/
│       ├── hooks/
│       │   └── useAgentExecution.ts
│       ├── store.ts                   # Zustand store
│       ├── types.ts
│       └── utils.ts
├── ai-backend/
│   ├── agents/
│   │   └── neuramap_executor.py      # LangGraph executor
│   └── tools/
│       └── repo/
│           ├── search.py
│           ├── read.py
│           ├── symbols.py
│           ├── patch.py
│           ├── run.py
│           ├── diagnostics.py
│           ├── git.py
│           └── lsp.py
└── .GCC/                              # Git-Context-Controller
    ├── main.md
    ├── checkpoints/
    └── logs/
```

---

## 🚀 배포 시나리오

### Development

```bash
# 1. Python 백엔드 시작
cd ai-backend
poetry run uvicorn main:app --reload --port 8000

# 2. Terminal Server 시작
node server/terminal-server.js

# 3. Next.js 프론트엔드 시작
npm run dev
```

### Production (Electron)

```bash
# 1. 빌드
npm run build

# 2. Electron 패키징 (모든 서비스 임베딩)
npm run package

# 3. 실행
./dist-electron/mac-arm64/GlowUS.app
```

---

## 📚 다음 문서

➡️ **[09-TESTING-VERIFICATION.md](./09-TESTING-VERIFICATION.md)** - 테스트 및 검증 전략
