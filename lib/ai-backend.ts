/**
 * AI Backend Integration
 * Connects Next.js frontend with Python FastAPI backend
 */

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8000'

// ============================================
// Types
// ============================================
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AgentContext {
  project_id?: string
  team_id?: string
  sheet_id?: string
  doc_id?: string
  [key: string]: string | undefined
}

export interface AgentRunRequest {
  message: string
  model?: string
  temperature?: number
  system_prompt?: string
  tools?: string[]
  chat_history?: ChatMessage[]
  context?: AgentContext
  thread_id?: string
}

export interface AgentRunResponse {
  output: string
  intermediate_steps: Array<{
    tool: string
    input?: Record<string, unknown>
    output: string
  }>
  tool_calls_count: number
  metadata: Record<string, unknown>
  error?: string
}

export interface StreamEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'error' | 'done'
  content?: string
  tool?: string
  input?: Record<string, unknown>
  output?: string
  message?: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'xai' | 'ollama'
  recommended_for: string[]
}

export interface AgentTypeInfo {
  type: string
  name: string
  description: string
  default_model: string
  tools: string[]
}

// ============================================
// Generic Agent API
// ============================================
export async function runAgent(request: AgentRunRequest): Promise<AgentRunResponse> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/v2/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Agent execution failed')
  }

  return response.json()
}

export async function streamAgent(
  request: AgentRunRequest,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/v2/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Agent streaming failed')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent
          onEvent(event)
        } catch {
          // Ignore parsing errors for incomplete chunks
        }
      }
    }
  }
}

// ============================================
// Specialized Agent APIs
// ============================================

// Documents Agent
export async function runDocsAgent(
  message: string,
  context?: AgentContext,
  options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
): Promise<AgentRunResponse> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/docs/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      ...options,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Docs agent execution failed')
  }

  return response.json()
}

export async function streamDocsAgent(
  message: string,
  context: AgentContext | undefined,
  onEvent: (event: StreamEvent) => void,
  options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
): Promise<void> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/docs/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      ...options,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Docs agent streaming failed')
  }

  await processStream(response, onEvent)
}

// Sheet Agent
export async function runSheetAgent(
  message: string,
  context?: AgentContext,
  options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
): Promise<AgentRunResponse> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/sheet/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      ...options,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Sheet agent execution failed')
  }

  return response.json()
}

export async function streamSheetAgent(
  message: string,
  context: AgentContext | undefined,
  onEvent: (event: StreamEvent) => void,
  options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
): Promise<void> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/sheet/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      ...options,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Sheet agent streaming failed')
  }

  await processStream(response, onEvent)
}

// Email Agent
export async function runEmailAgent(
  message: string,
  context?: AgentContext,
  options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
): Promise<AgentRunResponse> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/email/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      ...options,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Email agent execution failed')
  }

  return response.json()
}

export async function streamEmailAgent(
  message: string,
  context: AgentContext | undefined,
  onEvent: (event: StreamEvent) => void,
  options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
): Promise<void> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/email/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      ...options,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Email agent streaming failed')
  }

  await processStream(response, onEvent)
}

// Multi-capability Agent
export async function runMultiAgent(
  message: string,
  context?: AgentContext,
  options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
): Promise<AgentRunResponse> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/multi/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      ...options,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Multi agent execution failed')
  }

  return response.json()
}

export async function streamMultiAgent(
  message: string,
  context: AgentContext | undefined,
  onEvent: (event: StreamEvent) => void,
  options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
): Promise<void> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/multi/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      ...options,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Multi agent streaming failed')
  }

  await processStream(response, onEvent)
}

// ============================================
// Factory API
// ============================================
export type AgentType = 'general' | 'docs' | 'sheet' | 'email' | 'multi'

export async function createAndRunAgent(
  agentType: AgentType,
  message: string,
  context?: AgentContext,
  options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
): Promise<AgentRunResponse> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/create/${agentType}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      ...options,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Agent creation/execution failed')
  }

  return response.json()
}

// ============================================
// Utility APIs
// ============================================
export async function getAvailableModels(): Promise<{ models: ModelInfo[] }> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/models`)

  if (!response.ok) {
    throw new Error('Failed to fetch models')
  }

  return response.json()
}

export async function getAgentTypes(): Promise<{ agents: AgentTypeInfo[] }> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/agents`)

  if (!response.ok) {
    throw new Error('Failed to fetch agent types')
  }

  return response.json()
}

export async function checkHealth(): Promise<{
  status: string
  version: string
  features: Record<string, boolean>
}> {
  const response = await fetch(`${AI_BACKEND_URL}/api/agents/health`)

  if (!response.ok) {
    throw new Error('Health check failed')
  }

  return response.json()
}

// ============================================
// Tool APIs
// ============================================
export interface ToolInfo {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export async function getAvailableTools(): Promise<{ tools: ToolInfo[] }> {
  const response = await fetch(`${AI_BACKEND_URL}/api/tools/`)

  if (!response.ok) {
    throw new Error('Failed to fetch tools')
  }

  return response.json()
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ result: unknown }> {
  const response = await fetch(`${AI_BACKEND_URL}/api/tools/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool_name: toolName,
      arguments: args,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Tool execution failed')
  }

  return response.json()
}

// ============================================
// Helpers
// ============================================
async function processStream(
  response: Response,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent
          onEvent(event)
        } catch {
          // Ignore parsing errors for incomplete chunks
        }
      }
    }
  }
}

// ============================================
// React Hook for Streaming
// ============================================
import { useState, useCallback } from 'react'

export interface UseAgentStreamResult {
  isStreaming: boolean
  content: string
  events: StreamEvent[]
  error: string | null
  stream: (
    agentType: AgentType,
    message: string,
    context?: AgentContext,
    options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
  ) => Promise<void>
  reset: () => void
}

export function useAgentStream(): UseAgentStreamResult {
  const [isStreaming, setIsStreaming] = useState(false)
  const [content, setContent] = useState('')
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setContent('')
    setEvents([])
    setError(null)
  }, [])

  const stream = useCallback(async (
    agentType: AgentType,
    message: string,
    context?: AgentContext,
    options?: { model?: string; temperature?: number; chat_history?: ChatMessage[] }
  ) => {
    reset()
    setIsStreaming(true)

    const handleEvent = (event: StreamEvent) => {
      setEvents(prev => [...prev, event])

      if (event.type === 'token' && event.content) {
        setContent(prev => prev + event.content)
      } else if (event.type === 'error') {
        setError(event.message || 'Unknown error')
      }
    }

    try {
      const streamFn = {
        general: (msg: string, ctx: AgentContext | undefined, cb: (e: StreamEvent) => void) =>
          streamAgent({ message: msg, context: ctx, ...options }, cb),
        docs: streamDocsAgent,
        sheet: streamSheetAgent,
        email: streamEmailAgent,
        multi: streamMultiAgent,
      }[agentType]

      if (agentType === 'general') {
        await streamFn(message, context, handleEvent)
      } else {
        await (streamFn as typeof streamDocsAgent)(message, context, handleEvent, options)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsStreaming(false)
    }
  }, [reset])

  return { isStreaming, content, events, error, stream, reset }
}
