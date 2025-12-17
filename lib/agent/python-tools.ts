/**
 * Python Backend Tool Integration for Agent Executor
 * Converts Python backend tools to LangChain-compatible tools
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000'

export interface PythonToolDefinition {
  name: string
  description: string
  parameters?: {
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

/**
 * Fetch all available tools from Python backend
 */
export async function fetchPythonTools(): Promise<PythonToolDefinition[]> {
  try {
    const response = await fetch(`${AI_BACKEND_URL}/api/tools/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      console.error('Failed to fetch Python tools:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.tools || []
  } catch (error) {
    console.error('Error fetching Python tools:', error)
    return []
  }
}

/**
 * Execute a Python tool via backend API
 */
export async function executePythonTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
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
      return JSON.stringify({ error: error.detail || 'Python tool execution failed' })
    }

    const result = await response.json()
    return JSON.stringify(result)
  } catch (error) {
    console.error(`Error executing Python tool ${toolName}:`, error)
    return JSON.stringify({ error: `Tool execution failed: ${error}` })
  }
}

/**
 * Convert Python tool schema to Zod schema
 */
function pythonSchemaToZod(properties: Record<string, {
  type: string
  description?: string
  default?: unknown
  enum?: string[]
}>, required: string[] = []): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const [name, def] of Object.entries(properties)) {
    let zodType: z.ZodTypeAny

    switch (def.type) {
      case 'string':
        if (def.enum) {
          zodType = z.enum(def.enum as [string, ...string[]])
        } else {
          zodType = z.string()
        }
        break
      case 'integer':
      case 'number':
        zodType = z.number()
        break
      case 'boolean':
        zodType = z.boolean()
        break
      case 'array':
        zodType = z.array(z.any())
        break
      case 'object':
        zodType = z.record(z.string(), z.any())
        break
      default:
        zodType = z.any()
    }

    // Add description
    if (def.description) {
      zodType = zodType.describe(def.description)
    }

    // Add default if not required
    if (!required.includes(name)) {
      if (def.default !== undefined) {
        zodType = zodType.default(def.default)
      } else {
        zodType = zodType.optional()
      }
    }

    shape[name] = zodType
  }

  return z.object(shape)
}

/**
 * Create a LangChain tool from Python tool definition
 */
export function createLangChainToolFromPython(
  toolDef: PythonToolDefinition
): DynamicStructuredTool {
  const schema = toolDef.parameters?.properties
    ? pythonSchemaToZod(toolDef.parameters.properties, toolDef.parameters.required)
    : z.object({})

  return new DynamicStructuredTool({
    name: toolDef.name,
    description: toolDef.description,
    schema,
    func: async (args: Record<string, unknown>) => {
      console.log(`[Python Tool] Executing ${toolDef.name}:`, args)
      const result = await executePythonTool(toolDef.name, args)
      console.log(`[Python Tool] ${toolDef.name} result:`, result.substring(0, 200))
      return result
    },
  })
}

/**
 * Create LangChain tools for specific Python tool names
 */
export async function createPythonTools(
  toolNames: string[]
): Promise<DynamicStructuredTool[]> {
  const allTools = await fetchPythonTools()
  const tools: DynamicStructuredTool[] = []

  for (const name of toolNames) {
    const toolDef = allTools.find(t => t.name === name)
    if (toolDef) {
      tools.push(createLangChainToolFromPython(toolDef))
    } else {
      console.warn(`[Python Tool] Tool not found: ${name}`)
    }
  }

  return tools
}

/**
 * Create all available Python tools
 */
export async function createAllPythonTools(): Promise<DynamicStructuredTool[]> {
  const allTools = await fetchPythonTools()
  return allTools.map(createLangChainToolFromPython)
}

/**
 * Check if Python backend is available
 */
export async function checkPythonBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_BACKEND_URL}/api/agents/health`)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get Python tools by category
 */
export async function getPythonToolsByCategory(): Promise<Record<string, PythonToolDefinition[]>> {
  const allTools = await fetchPythonTools()
  const categories: Record<string, PythonToolDefinition[]> = {}

  const CATEGORY_PREFIXES: Record<string, string> = {
    'ai_docs': 'AI Docs',
    'ai_sheet': 'AI Sheet',
    'email': 'Email',
    'web_search': 'Web',
    'calculator': 'Utility',
  }

  for (const tool of allTools) {
    let category = 'Other'
    for (const [prefix, cat] of Object.entries(CATEGORY_PREFIXES)) {
      if (tool.name.startsWith(prefix)) {
        category = cat
        break
      }
    }

    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(tool)
  }

  return categories
}
