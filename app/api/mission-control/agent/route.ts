/**
 * Mission Control - Agent API Route
 *
 * 개별 에이전트 호출 엔드포인트
 * - agentMode: true → 도구 호출 지원 (generateSuperAgentResponse)
 * - agentMode: false/undefined → 텍스트 생성만 (generateText)
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText, streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { AgentRole } from '@/lib/mission-control/types'
import { generateSuperAgentResponse, SuperAgentMessage } from '@/lib/ai/super-agent-chat'

// ============================================================================
// Provider Configurations
// ============================================================================

// Google Gemini - GOOGLE_API_KEY 사용
const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
})

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
})

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
})

// XAI (Grok)
const xai = createOpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.XAI_API_KEY || '',
})

// ============================================================================
// Model Selection
// ============================================================================

function getModel(modelId: string) {
  // DeepSeek models
  if (modelId.startsWith('deepseek')) {
    return deepseek(modelId)
  }

  // Groq models (Llama, Mixtral)
  if (modelId.includes('llama') || modelId.includes('mixtral')) {
    return groq(modelId)
  }

  // XAI (Grok) models
  if (modelId.startsWith('grok')) {
    return xai(modelId)
  }

  // Google Gemini models
  if (modelId.startsWith('gemini')) {
    return googleAI(modelId)
  }

  // Default to Gemini
  return googleAI('gemini-2.0-flash-exp')
}

// ============================================================================
// Model to Provider Mapping (for Super Agent)
// ============================================================================

function mapModelToProvider(modelId: string): { provider: string; modelId: string } {
  // DeepSeek models
  if (modelId.startsWith('deepseek')) {
    return { provider: 'deepseek', modelId }
  }

  // Groq models (Llama, Mixtral)
  if (modelId.includes('llama') || modelId.includes('mixtral')) {
    return { provider: 'groq', modelId }
  }

  // XAI (Grok) models
  if (modelId.startsWith('grok')) {
    return { provider: 'grok', modelId }
  }

  // Google Gemini models
  if (modelId.startsWith('gemini')) {
    return { provider: 'google', modelId }
  }

  // OpenAI models
  if (modelId.startsWith('gpt')) {
    return { provider: 'openai', modelId }
  }

  // Anthropic models
  if (modelId.startsWith('claude')) {
    return { provider: 'anthropic', modelId }
  }

  // Default to Grok (good balance for tool calling)
  return { provider: 'grok', modelId: 'grok-3-fast' }
}

// ============================================================================
// Request Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      missionId,
      taskId,
      agentRole,
      systemPrompt,
      instruction,
      context,
      model = 'gemini-2.0-flash-exp',
      maxTokens = 4096,
      temperature = 0.3,
      stream = false,
      // 🔥 Tool Calling 지원
      agentMode = false,
      mapId,
      projectPath,
      userName,
      userRole,
      workContext,
    } = body

    // Validate required fields
    if (!agentRole || !instruction) {
      return NextResponse.json(
        { error: 'Missing required fields: agentRole, instruction' },
        { status: 400 }
      )
    }

    // ============================================================================
    // Agent Mode - Tool Calling 지원 (generateSuperAgentResponse)
    // ============================================================================
    if (agentMode) {
      console.log(`[Mission Control] Agent Mode enabled for ${agentRole}`)

      // Map model to provider
      const { provider, modelId } = mapModelToProvider(model)

      // Create virtual agent config
      const virtualAgent = {
        id: `mission-control-${agentRole}-${missionId || 'default'}`,
        name: `Mission Control ${agentRole}`,
        description: `Mission Control ${agentRole} agent with tool calling`,
        llm_provider: provider,
        model: modelId,
        temperature,
        system_prompt: systemPrompt,
      }

      // Build chat history from context if provided
      const chatHistory: SuperAgentMessage[] = []
      if (context) {
        chatHistory.push({
          role: 'user',
          content: `## 컨텍스트 (이전 작업 결과)\n\n${context}`,
        })
        chatHistory.push({
          role: 'assistant',
          content: '컨텍스트를 확인했습니다. 이를 바탕으로 작업을 진행하겠습니다.',
        })
      }

      // Call generateSuperAgentResponse for tool calling
      const result = await generateSuperAgentResponse(
        virtualAgent,
        instruction,
        chatHistory,
        {
          projectPath: projectPath || undefined,
          userName: userName || 'Mission Control User',
          userRole: userRole || 'developer',
          workContext: workContext || `Mission: ${missionId}, Task: ${taskId}`,
          skipMemorySave: true, // Mission Control manages its own state
        }
      )

      return NextResponse.json({
        response: result.message,
        missionId,
        taskId,
        agentRole,
        model,
        // 🔥 Tool calling 결과
        actions: result.actions,
        toolsUsed: result.toolsUsed,
        thinking: result.thinking,
        browserUrl: result.browserUrl,
        tokenUsage: {
          input: 0, // SuperAgentResponse doesn't provide token usage
          output: 0,
          total: 0,
        },
        finishReason: 'stop',
      })
    }

    // Build the full prompt
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = []

    // System prompt
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    // Context (이전 작업 결과)
    if (context) {
      messages.push({
        role: 'user',
        content: `## 컨텍스트 (이전 작업 결과)\n\n${context}`,
      })
      messages.push({
        role: 'assistant',
        content: '컨텍스트를 확인했습니다. 이를 바탕으로 작업을 진행하겠습니다.',
      })
    }

    // Main instruction
    messages.push({ role: 'user', content: instruction })

    // Select model
    const selectedModel = getModel(model)

    // Streaming response
    if (stream) {
      const result = await streamText({
        model: selectedModel,
        messages,
        maxOutputTokens: maxTokens,
        temperature,
      })

      // Return streaming response
      return new Response(result.textStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // Non-streaming response
    const result = await generateText({
      model: selectedModel,
      messages,
      maxOutputTokens: maxTokens,
      temperature,
    })

    // Calculate token usage (estimated if not provided)
    const inputTokens = result.usage?.inputTokens || Math.ceil(instruction.length / 4)
    const outputTokens = result.usage?.outputTokens || Math.ceil(result.text.length / 4)

    return NextResponse.json({
      response: result.text,
      missionId,
      taskId,
      agentRole,
      model,
      tokenUsage: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      finishReason: result.finishReason,
    })
  } catch (error) {
    console.error('[Mission Control Agent API] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Health Check
// ============================================================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'mission-control-agent',
    timestamp: new Date().toISOString(),
  })
}
