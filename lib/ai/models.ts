/**
 * AI Model Configuration - Single Source of Truth
 * 모든 AI 모델 정의는 이 파일에서 관리
 */

export type AIProvider = 'anthropic' | 'openai' | 'google' | 'xai'

export interface ModelConfig {
  id: string           // 내부 식별자 (UI + Store에서 사용)
  provider: AIProvider
  apiModel: string     // 실제 API 호출 시 사용되는 모델 ID
  displayName: string  // UI 표시명
  description?: string
  maxTokens?: number
  supportsVision?: boolean
  supportsStreaming?: boolean
}

// ============================================
// Model Definitions
// ============================================

export const MODELS: Record<string, ModelConfig> = {
  // Anthropic
  'claude-3.5-sonnet': {
    id: 'claude-3.5-sonnet',
    provider: 'anthropic',
    apiModel: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    supportsVision: true,
    supportsStreaming: true,
  },
  'claude-3-opus': {
    id: 'claude-3-opus',
    provider: 'anthropic',
    apiModel: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus',
    supportsVision: true,
    supportsStreaming: true,
  },

  // OpenAI
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    apiModel: 'gpt-4o',
    displayName: 'GPT-4o',
    supportsVision: true,
    supportsStreaming: true,
  },

  // Google
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    provider: 'google',
    apiModel: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    supportsVision: true,
    supportsStreaming: true,
  },
  'gemini-3-flash': {
    id: 'gemini-3-flash',
    provider: 'google',
    apiModel: 'gemini-2.0-flash-exp',  // 실제 API 모델명
    displayName: 'Gemini 3 Flash',
    supportsVision: true,
    supportsStreaming: true,
  },

  // xAI (Grok)
  'grok-4.1-fast': {
    id: 'grok-4.1-fast',
    provider: 'xai',
    apiModel: 'grok-3-fast',  // 실제 API 모델명
    displayName: 'Grok 4.1 Fast',
    supportsVision: false,
    supportsStreaming: true,
  },
} as const

// ============================================
// Type Exports (derived from MODELS)
// ============================================

export type ChatModelId = keyof typeof MODELS

export const MODEL_IDS = Object.keys(MODELS) as ChatModelId[]

// ============================================
// System Prompts
// ============================================

export const SYSTEM_PROMPTS = {
  coding: `You are a strict, professional Coding Agent.
1. NO EMOTICONS, NO EMOJIS, NO CHIT-CHAT (e.g. avoid 'Happy to help!', 'Here you go 🚀').
2. Be extremely concise. Give code usage instructions immediately.
3. Use dry, technical language only.
4. Provide production-ready code.`,

  general: `You are a helpful AI assistant. Be concise and accurate.`,
} as const

// ============================================
// Utility Functions
// ============================================

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODELS[modelId]
}

export function getApiModelId(modelId: string): string {
  return MODELS[modelId]?.apiModel ?? modelId
}

export function getProvider(modelId: string): AIProvider | undefined {
  return MODELS[modelId]?.provider
}

export function getModelsByProvider(provider: AIProvider): ModelConfig[] {
  return Object.values(MODELS).filter(m => m.provider === provider)
}

// UI용 모델 리스트
export function getModelList(): Array<{ id: ChatModelId; name: string }> {
  return Object.values(MODELS).map(m => ({
    id: m.id as ChatModelId,
    name: m.displayName,
  }))
}
