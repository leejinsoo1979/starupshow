/**
 * Mission Control - Agent Pool
 *
 * 에이전트 관리 및 병렬 실행
 * - 에이전트 설정 관리
 * - API 호출 추상화
 * - 병렬 실행 제어
 */

import { AgentRole, AgentConfig, AgentCallRequest, AgentCallResponse } from './types'

// ============================================================================
// Agent Configurations
// ============================================================================

export const AGENT_CONFIGS: Record<AgentRole, AgentConfig> = {
  orchestrator: {
    id: 'orchestrator',
    name: 'Orchestrator',
    nameKr: '오케스트레이터',
    color: '#8B5CF6',
    description: '요구사항 분석 및 작업 라우팅',
    model: 'gemini-2.0-flash-exp',
    maxTokens: 4096,
    temperature: 0.3,
    systemPrompt: `당신은 Mission Control의 Orchestrator입니다.
사용자의 요청을 분석하고 작업을 계획하는 역할을 합니다.

## 응답 형식
반드시 JSON 형식으로 응답하세요.`,
  },
  planner: {
    id: 'planner',
    name: 'Planner',
    nameKr: '플래너',
    color: '#3B82F6',
    description: '설계 및 아키텍처 결정',
    model: 'gemini-2.0-flash-exp',
    maxTokens: 8192,
    temperature: 0.5,
    systemPrompt: `당신은 Mission Control의 Planner입니다.
아키텍처 설계, 데이터 흐름 정의, 인터페이스 설계를 담당합니다.

## 응답에 포함할 것
1. 아키텍처 설계 (폴더 구조, 모듈)
2. 데이터 흐름도
3. 인터페이스 정의 (TypeScript 타입)
4. 구현 가이드라인`,
  },
  implementer: {
    id: 'implementer',
    name: 'Implementer',
    nameKr: '임플리멘터',
    color: '#10B981',
    description: '실제 코드 구현',
    model: 'gemini-2.0-flash-exp',
    maxTokens: 16384,
    temperature: 0.2,
    systemPrompt: `당신은 Mission Control의 Implementer입니다.
실제 코드를 작성하는 역할을 합니다.

## 규칙
1. 설명 없이 바로 코드 작성
2. 완전하고 실행 가능한 코드 작성
3. 타입 안전한 TypeScript 코드
4. 에러 핸들링 포함`,
  },
  tester: {
    id: 'tester',
    name: 'Tester',
    nameKr: '테스터',
    color: '#F59E0B',
    description: '테스트 및 검증',
    model: 'gemini-2.0-flash-exp',
    maxTokens: 8192,
    temperature: 0.2,
    systemPrompt: `당신은 Mission Control의 Tester입니다.
테스트 케이스 작성 및 품질 검증을 담당합니다.

## 응답에 포함할 것
1. 단위 테스트 코드
2. 테스트 케이스 목록
3. 엣지 케이스 분석`,
  },
  reviewer: {
    id: 'reviewer',
    name: 'Reviewer',
    nameKr: '리뷰어',
    color: '#EF4444',
    description: '코드 리뷰 및 품질 감시',
    model: 'gemini-2.0-flash-exp',
    maxTokens: 4096,
    temperature: 0.3,
    systemPrompt: `당신은 Mission Control의 Reviewer입니다.
코드 품질, 보안, 성능을 검토합니다.

## 응답 형식
### 검토 결과
✅ 통과 항목: ...
⚠️ 경고: ...
❌ 블로커: ...

### 최종 판정: APPROVE | REQUEST_CHANGES | REJECT`,
  },
}

// ============================================================================
// Model Provider Configuration
// ============================================================================

export type ModelProvider = 'deepseek' | 'groq' | 'anthropic' | 'openai' | 'google'

export interface ModelConfig {
  id: string
  name: string
  provider: ModelProvider
  contextWindow: number
  inputPrice: number   // per 1M tokens
  outputPrice: number  // per 1M tokens
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    contextWindow: 128000,
    inputPrice: 0.27,
    outputPrice: 1.10,
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: 'deepseek',
    contextWindow: 128000,
    inputPrice: 0.14,
    outputPrice: 0.28,
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    contextWindow: 128000,
    inputPrice: 0,
    outputPrice: 0,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    contextWindow: 1000000,
    inputPrice: 0.075,
    outputPrice: 0.30,
  },
]

// ============================================================================
// Agent Pool Class
// ============================================================================

export class AgentPool {
  private activeAgents: Set<AgentRole> = new Set()
  private maxConcurrent: number
  private queue: Array<{
    request: AgentCallRequest
    resolve: (response: AgentCallResponse) => void
    reject: (error: Error) => void
  }> = []

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent
  }

  /**
   * 에이전트 호출 요청
   */
  async callAgent(request: AgentCallRequest): Promise<AgentCallResponse> {
    // 동일 에이전트가 이미 작업 중이면 대기
    if (this.activeAgents.has(request.agentRole)) {
      return new Promise((resolve, reject) => {
        this.queue.push({ request, resolve, reject })
      })
    }

    // 동시 실행 제한 체크
    if (this.activeAgents.size >= this.maxConcurrent) {
      return new Promise((resolve, reject) => {
        this.queue.push({ request, resolve, reject })
      })
    }

    return this.executeAgent(request)
  }

  /**
   * 에이전트 실행
   */
  private async executeAgent(request: AgentCallRequest): Promise<AgentCallResponse> {
    this.activeAgents.add(request.agentRole)

    try {
      const config = AGENT_CONFIGS[request.agentRole]
      const response = await this.makeAPICall(request, config)
      return response
    } finally {
      this.activeAgents.delete(request.agentRole)
      this.processQueue()
    }
  }

  /**
   * 대기열 처리
   */
  private processQueue(): void {
    if (this.queue.length === 0) return
    if (this.activeAgents.size >= this.maxConcurrent) return

    // 대기 중인 요청 중 실행 가능한 것 찾기
    const index = this.queue.findIndex(
      (item) => !this.activeAgents.has(item.request.agentRole)
    )

    if (index !== -1) {
      const { request, resolve, reject } = this.queue.splice(index, 1)[0]
      this.executeAgent(request).then(resolve).catch(reject)
    }
  }

  /**
   * API 호출
   */
  private async makeAPICall(
    request: AgentCallRequest,
    config: AgentConfig
  ): Promise<AgentCallResponse> {
    const response = await fetch('/api/mission-control/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        missionId: request.missionId,
        taskId: request.taskId,
        agentRole: request.agentRole,
        systemPrompt: config.systemPrompt,
        instruction: request.instruction,
        context: request.context,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      response: data.response || data.message || '',
      artifacts: data.artifacts,
      toolsUsed: data.toolsUsed,
      tokenUsage: data.tokenUsage || { input: 0, output: 0, total: 0 },
    }
  }

  /**
   * 여러 에이전트 병렬 호출
   */
  async callAgentsParallel(requests: AgentCallRequest[]): Promise<AgentCallResponse[]> {
    return Promise.all(requests.map((req) => this.callAgent(req)))
  }

  /**
   * 현재 활성 에이전트 수
   */
  getActiveCount(): number {
    return this.activeAgents.size
  }

  /**
   * 특정 에이전트가 활성 상태인지
   */
  isAgentActive(role: AgentRole): boolean {
    return this.activeAgents.has(role)
  }

  /**
   * 대기열 크기
   */
  getQueueSize(): number {
    return this.queue.length
  }

  /**
   * 최대 동시 실행 수 변경
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max
    this.processQueue()
  }

  /**
   * 모든 대기 중인 요청 취소
   */
  clearQueue(): void {
    this.queue.forEach(({ reject }) => {
      reject(new Error('Queue cleared'))
    })
    this.queue = []
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let agentPool: AgentPool | null = null

export function getAgentPool(maxConcurrent?: number): AgentPool {
  if (!agentPool) {
    agentPool = new AgentPool(maxConcurrent)
  }
  return agentPool
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 모델 비용 계산
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = AVAILABLE_MODELS.find((m) => m.id === modelId)
  if (!model) return 0

  const inputCost = (inputTokens / 1_000_000) * model.inputPrice
  const outputCost = (outputTokens / 1_000_000) * model.outputPrice

  return inputCost + outputCost
}

/**
 * 에이전트 설정 가져오기
 */
export function getAgentConfig(role: AgentRole): AgentConfig {
  return AGENT_CONFIGS[role]
}

/**
 * 에이전트 모델 업데이트
 */
export function updateAgentModel(role: AgentRole, model: string): void {
  AGENT_CONFIGS[role].model = model
}

/**
 * 모든 에이전트 설정 가져오기
 */
export function getAllAgentConfigs(): AgentConfig[] {
  return Object.values(AGENT_CONFIGS)
}
