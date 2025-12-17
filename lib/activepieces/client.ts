/**
 * Activepieces API Client
 *
 * Activepieces를 Agent Builder의 스킬 플러그인으로 사용하기 위한 클라이언트
 *
 * 주요 기능:
 * - 플로우 목록 조회
 * - 플로우 트리거 실행
 * - 실행 결과 조회
 * - 앱 연동 관리
 */

const ACTIVEPIECES_URL = process.env.ACTIVEPIECES_URL || 'http://localhost:8080'

export interface ActivepiecesFlow {
  id: string
  name: string
  description?: string
  status: 'ENABLED' | 'DISABLED'
  trigger: {
    type: string
    settings: Record<string, any>
  }
  actions: Array<{
    type: string
    name: string
    settings: Record<string, any>
  }>
  createdAt: string
  updatedAt: string
}

export interface FlowRun {
  id: string
  flowId: string
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMEOUT'
  startTime: string
  finishTime?: string
  output?: any
  error?: string
}

export interface TriggerPayload {
  flowId: string
  inputs?: Record<string, any>
}

export class ActivepiecesClient {
  private baseUrl: string
  private apiKey: string | null = null

  constructor(baseUrl: string = ACTIVEPIECES_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * API 키 설정 (인증이 필요한 경우)
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Activepieces API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * 헬스 체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/flags`)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 프로젝트의 모든 플로우 목록 조회
   */
  async listFlows(projectId?: string): Promise<ActivepiecesFlow[]> {
    const query = projectId ? `?projectId=${projectId}` : ''
    return this.request<ActivepiecesFlow[]>(`/api/v1/flows${query}`)
  }

  /**
   * 특정 플로우 상세 조회
   */
  async getFlow(flowId: string): Promise<ActivepiecesFlow> {
    return this.request<ActivepiecesFlow>(`/api/v1/flows/${flowId}`)
  }

  /**
   * 웹훅으로 플로우 트리거
   */
  async triggerWebhook(
    webhookUrl: string,
    payload: Record<string, any>
  ): Promise<any> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Webhook trigger failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * 플로우 실행 (Manual Trigger)
   */
  async runFlow(flowId: string, inputs?: Record<string, any>): Promise<FlowRun> {
    return this.request<FlowRun>(`/api/v1/flow-runs`, {
      method: 'POST',
      body: JSON.stringify({
        flowId,
        payload: inputs || {},
      }),
    })
  }

  /**
   * 플로우 실행 상태 조회
   */
  async getFlowRun(runId: string): Promise<FlowRun> {
    return this.request<FlowRun>(`/api/v1/flow-runs/${runId}`)
  }

  /**
   * 플로우 실행 완료까지 대기
   */
  async waitForCompletion(
    runId: string,
    timeout: number = 60000,
    pollInterval: number = 1000
  ): Promise<FlowRun> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const run = await this.getFlowRun(runId)

      if (run.status !== 'RUNNING') {
        return run
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error(`Flow run timed out after ${timeout}ms`)
  }

  /**
   * 사용 가능한 앱(피스) 목록 조회
   */
  async listPieces(): Promise<any[]> {
    return this.request<any[]>(`/api/v1/pieces`)
  }

  /**
   * 특정 앱의 액션/트리거 목록 조회
   */
  async getPieceDetails(pieceName: string): Promise<any> {
    return this.request<any>(`/api/v1/pieces/${pieceName}`)
  }
}

// 싱글톤 인스턴스
export const activepieces = new ActivepiecesClient()

// 편의 함수들
export async function triggerActivepiesesFlow(
  flowId: string,
  inputs?: Record<string, any>
): Promise<FlowRun> {
  const run = await activepieces.runFlow(flowId, inputs)
  return activepieces.waitForCompletion(run.id)
}

export async function listAvailableFlows(): Promise<ActivepiecesFlow[]> {
  return activepieces.listFlows()
}
