# Glowus AI Backend

Python FastAPI backend for AI agent execution and tool management.

## Features

- **LangGraph Agent Executor**: State-based agent execution with conditional routing
- **Multi-Model Support**: OpenAI, Anthropic Claude, xAI Grok, Local Ollama
- **Specialized Agents**: Documents, Spreadsheet, Email, Multi-capability
- **Streaming Responses**: Real-time token and tool execution events
- **Tool Registry**: Modular tool system with automatic registration

## Quick Start

```bash
cd ai-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000
```

Or use the run script:
```bash
chmod +x run.sh
./run.sh
```

## API Endpoints

### Legacy Endpoints (v1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/run` | Execute an agent |
| POST | `/api/agents/stream` | Stream agent response |
| GET | `/api/agents/models` | List available models |

### LangGraph Endpoints (v2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/v2/run` | Execute with LangGraph |
| POST | `/api/agents/v2/stream` | Stream with detailed events |

### Specialized Agent Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/docs/run` | Document agent |
| POST | `/api/agents/docs/stream` | Stream document agent |
| POST | `/api/agents/sheet/run` | Spreadsheet agent |
| POST | `/api/agents/sheet/stream` | Stream spreadsheet agent |
| POST | `/api/agents/email/run` | Email agent |
| POST | `/api/agents/email/stream` | Stream email agent |
| POST | `/api/agents/multi/run` | Multi-capability agent |
| POST | `/api/agents/multi/stream` | Stream multi agent |

### Factory Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/create/{type}/run` | Create agent by type |

### Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/models` | List available models |
| GET | `/api/agents/agents` | List agent types |
| GET | `/api/agents/health` | Health check |

### Tools Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tools/` | List all tools |
| POST | `/api/tools/execute` | Execute a tool |
| GET | `/api/tools/{tool_name}` | Get tool info |

## Available Tools

### AI Docs (Document Management)
| Tool | Description |
|------|-------------|
| `ai_docs_create` | Create new document |
| `ai_docs_search` | Search documents by keyword |
| `ai_docs_get` | Get document by ID |
| `ai_docs_analyze` | AI analysis (summary, key_points, etc.) |
| `ai_docs_update` | Update document |
| `ai_docs_list` | List project documents |
| `ai_docs_delete` | Archive document |

### AI Sheet (Spreadsheet Management)
| Tool | Description |
|------|-------------|
| `ai_sheet_create` | Create new spreadsheet |
| `ai_sheet_get` | Get spreadsheet with stats |
| `ai_sheet_add_rows` | Add rows to sheet |
| `ai_sheet_update_cell` | Update specific cell |
| `ai_sheet_analyze` | AI analysis (stats, trends, etc.) |
| `ai_sheet_query` | Natural language query |
| `ai_sheet_add_column` | Add new column |
| `ai_sheet_list` | List team sheets |

### Email (Email Management)
| Tool | Description |
|------|-------------|
| `email_get` | Get email by ID |
| `email_list` | List emails (folder filter) |
| `email_analyze` | AI analysis (urgency, sentiment) |
| `email_translate` | Translate email |
| `email_draft_reply` | Generate reply draft |
| `email_search` | Search emails |
| `email_mark_read` | Mark as read/unread |
| `email_summarize_inbox` | Summarize inbox |

### Web Tools
| Tool | Description |
|------|-------------|
| `web_search_tool` | Search the web |
| `calculator_tool` | Evaluate math expressions |

## Supported Models

### OpenAI
- `gpt-4o` - Default for most agents
- `gpt-4o-mini` - Quick tasks
- `gpt-4-turbo` - Complex analysis

### Anthropic
- `claude-3-5-sonnet-20241022` - Docs, analysis
- `claude-3-5-haiku-20241022` - Quick tasks

### xAI
- `grok-3-fast` - Default for email agent
- `grok-4-1-fast` - Email, analysis
- `grok-3-mini` - Quick tasks

### Ollama (Local)
- `ollama/llama3.2` - Offline, privacy
- `ollama/mistral` - Offline, privacy

## Adding New Tools

1. Create a new file in `tools/` directory:

```python
from langchain_core.tools import tool
from .registry import register_tool

@tool
def my_new_tool(arg1: str, arg2: int = 5) -> str:
    """
    Description of what this tool does.

    Args:
        arg1: Description of arg1
        arg2: Description of arg2 (default: 5)

    Returns:
        Description of return value
    """
    # Tool logic here
    return result

register_tool(my_new_tool)
```

2. Import in `tools/__init__.py`:

```python
from .my_tool import my_new_tool
```

## Usage Examples

### Run Document Agent

```bash
curl -X POST http://localhost:8000/api/agents/docs/run \
  -H "Content-Type: application/json" \
  -d '{
    "message": "프로젝트 c123의 문서 목록을 보여줘",
    "context": {"project_id": "c123"}
  }'
```

### Stream Email Agent

```bash
curl -X POST http://localhost:8000/api/agents/email/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "받은 편지함을 요약해줘",
    "context": {"team_id": "team123"}
  }'
```

### Use LangGraph v2 API

```bash
curl -X POST http://localhost:8000/api/agents/v2/run \
  -H "Content-Type: application/json" \
  -d '{
    "message": "이 데이터를 분석해줘",
    "model": "gpt-4o",
    "tools": ["ai_sheet_analyze", "calculator_tool"],
    "context": {"sheet_id": "sheet123"}
  }'
```

## Environment Variables

Copy from the main project's `.env.local` or set these:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...
TAVILY_API_KEY=tvly-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Project Structure

```
ai-backend/
├── main.py                    # FastAPI entry point
├── config.py                  # Configuration
├── requirements.txt           # Dependencies
├── agents/
│   ├── __init__.py
│   ├── base.py               # Base agent class
│   ├── executor.py           # Legacy agent executor
│   ├── langgraph_executor.py # LangGraph-based executor
│   └── router.py             # Agent API routes
├── tools/
│   ├── __init__.py           # Tool exports
│   ├── registry.py           # Tool registry
│   ├── router.py             # Tool API routes
│   ├── web_search.py         # Web search tool
│   ├── calculator.py         # Calculator tool
│   ├── ai_docs.py            # Document tools (7 tools)
│   ├── ai_sheet.py           # Spreadsheet tools (8 tools)
│   └── email.py              # Email tools (8 tools)
├── models/
│   ├── __init__.py
│   └── schemas.py            # Pydantic schemas
└── utils/
    ├── __init__.py
    └── supabase.py           # Supabase client
```

## Integration with Next.js

From Next.js, call the Python backend:

```typescript
// lib/ai-backend.ts
const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8000'

// Run specialized agent
export async function runDocsAgent(message: string, context: Record<string, any>) {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/docs/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  })
  return response.json()
}

// Stream agent with events
export async function streamEmailAgent(
  message: string,
  context: Record<string, any>,
  onEvent: (event: StreamEvent) => void
) {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/email/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader!.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        const event = JSON.parse(line.slice(6))
        onEvent(event)
      }
    }
  }
}

// Stream event types
interface StreamEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'error' | 'done'
  content?: string
  tool?: string
  input?: Record<string, any>
  output?: string
  message?: string
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Port 8000)                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Agents    │  │    Tools    │  │      LLM Providers      │  │
│  │   Router    │  │   Router    │  │  ┌───────┐ ┌─────────┐  │  │
│  └──────┬──────┘  └──────┬──────┘  │  │OpenAI │ │Anthropic│  │  │
│         │                │         │  └───────┘ └─────────┘  │  │
│         ▼                ▼         │  ┌───────┐ ┌──────────┐ │  │
│  ┌─────────────────────────────┐   │  │  xAI  │ │  Ollama  │ │  │
│  │    LangGraph Executor       │   │  └───────┘ └──────────┘ │  │
│  │  ┌─────────────────────┐   │   └─────────────────────────┘  │
│  │  │   State Management  │   │                                 │
│  │  └─────────────────────┘   │                                 │
│  │  ┌─────────────────────┐   │                                 │
│  │  │ Conditional Routing │   │                                 │
│  │  └─────────────────────┘   │                                 │
│  └─────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │
│  │   users    │  │   teams     │  │   project_documents      │  │
│  └────────────┘  └─────────────┘  └──────────────────────────┘  │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  projects  │  │   sheets    │  │   email_messages         │  │
│  └────────────┘  └─────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## License

MIT
