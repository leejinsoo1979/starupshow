'use client'

import { useState, useCallback, useEffect } from 'react'

export interface PythonTool {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, {
      type: string
      description?: string
      default?: unknown
      enum?: string[]
    }>
    required?: string[]
  }
}

export interface PythonToolCategory {
  name: string
  tools: PythonTool[]
}

// Tool categories based on tool name prefix
const TOOL_CATEGORIES: Record<string, string> = {
  'ai_docs': 'AI Docs (문서)',
  'ai_sheet': 'AI Sheet (스프레드시트)',
  'email': 'Email (이메일)',
  'web_search': 'Web (웹)',
  'calculator': 'Utility (유틸리티)',
}

function getCategoryFromToolName(toolName: string): string {
  for (const [prefix, category] of Object.entries(TOOL_CATEGORIES)) {
    if (toolName.startsWith(prefix)) {
      return category
    }
  }
  return 'Other (기타)'
}

interface UsePythonToolsOptions {
  autoFetch?: boolean
  backendUrl?: string
}

export function usePythonTools(options: UsePythonToolsOptions = {}) {
  const {
    autoFetch = true,
    backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000'
  } = options

  const [tools, setTools] = useState<PythonTool[]>([])
  const [categorizedTools, setCategorizedTools] = useState<PythonToolCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Fetch all tools from Python backend
  const fetchTools = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`${backendUrl}/api/tools/`)

      if (!res.ok) {
        throw new Error(`Python Backend 연결 실패: ${res.status}`)
      }

      const data = await res.json()
      const toolList: PythonTool[] = data.tools || []

      setTools(toolList)
      setIsConnected(true)

      // Categorize tools
      const categoryMap = new Map<string, PythonTool[]>()

      for (const tool of toolList) {
        const category = getCategoryFromToolName(tool.name)
        if (!categoryMap.has(category)) {
          categoryMap.set(category, [])
        }
        categoryMap.get(category)!.push(tool)
      }

      const categories: PythonToolCategory[] = Array.from(categoryMap.entries())
        .map(([name, tools]) => ({ name, tools }))
        .sort((a, b) => a.name.localeCompare(b.name))

      setCategorizedTools(categories)

      return toolList
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Python 도구 조회 오류'
      setError(message)
      setIsConnected(false)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [backendUrl])

  // Get tool by name
  const getTool = useCallback((toolName: string): PythonTool | undefined => {
    return tools.find(t => t.name === toolName)
  }, [tools])

  // Execute a tool directly
  const executeTool = useCallback(async (
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ result: unknown } | null> => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`${backendUrl}/api/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: toolName,
          arguments: args,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || '도구 실행 실패')
      }

      return await res.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : '도구 실행 오류'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [backendUrl])

  // Check backend health
  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${backendUrl}/api/agents/health`)
      if (res.ok) {
        setIsConnected(true)
        return true
      }
      setIsConnected(false)
      return false
    } catch {
      setIsConnected(false)
      return false
    }
  }, [backendUrl])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchTools()
    }
  }, [autoFetch, fetchTools])

  return {
    // State
    tools,
    categorizedTools,
    isLoading,
    error,
    isConnected,

    // Actions
    fetchTools,
    getTool,
    executeTool,
    checkHealth,

    // Setters
    setError,
  }
}

// Helper hook to get tools for a specific category
export function usePythonToolsByCategory(category: string) {
  const { categorizedTools, ...rest } = usePythonTools()

  const categoryTools = categorizedTools.find(c => c.name === category)?.tools || []

  return {
    ...rest,
    tools: categoryTools,
    categorizedTools,
  }
}
