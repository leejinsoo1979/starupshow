import OpenAI from 'openai'

// OpenAI 클라이언트 초기화
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 모델 설정
export const AI_CONFIG = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.3,
  maxTokens: 2000,
}

// 응답 타입
export interface AIResponse<T> {
  success: boolean
  data?: T
  error?: string
}
