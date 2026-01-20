'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * 스트리밍 이벤트 타입 (super-agent-chat.ts의 StreamEvent와 동일)
 */
export interface StreamEvent {
  type: 'thinking' | 'planning' | 'tool_start' | 'tool_end' | 'tool_retry' | 'text' | 'memory_saved' | 'done' | 'error'
  content?: string
  tool?: { name: string; args?: Record<string, any> }
  result?: any
  error?: string
  plan?: {
    totalSteps: number
    steps: Array<{
      stepNumber: number
      description: string
      toolsLikely: string[]
    }>
    complexity: string
  }
  iteration?: number
  maxIterations?: number
}

export interface StreamingChatState {
  isStreaming: boolean
  events: StreamEvent[]
  currentStep: string
  finalResponse: string | null
  error: string | null
  toolsUsed: string[]
  progress: {
    current: number
    max: number
  }
}

/**
 * 스트리밍 채팅 훅
 * - SSE 스트리밍으로 에이전트 응답 실시간 수신
 * - 진행 상황, 도구 사용, 최종 응답 추적
 */
export function useStreamingChat(agentId: string) {
  const [state, setState] = useState<StreamingChatState>({
    isStreaming: false,
    events: [],
    currentStep: '',
    finalResponse: null,
    error: null,
    toolsUsed: [],
    progress: { current: 0, max: 0 },
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * 스트리밍 채팅 시작
   */
  const sendStreamingMessage = useCallback(
    async (
      message: string,
      options?: {
        conversationHistory?: Array<{ role: string; content: string }>
        projectPath?: string
      }
    ) => {
      // 이전 스트리밍 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      setState({
        isStreaming: true,
        events: [],
        currentStep: '🤖 에이전트 시작...',
        finalResponse: null,
        error: null,
        toolsUsed: [],
        progress: { current: 0, max: 0 },
      })

      try {
        const response = await fetch(`/api/agents/${agentId}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            conversation_history: options?.conversationHistory || [],
            projectPath: options?.projectPath,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('스트리밍 응답을 읽을 수 없습니다')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // SSE 이벤트 파싱
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || '' // 마지막 불완전한 라인은 버퍼에 유지

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: StreamEvent = JSON.parse(line.slice(6))
                handleEvent(event)
              } catch (e) {
                console.warn('[StreamingChat] Parse error:', e)
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('[StreamingChat] Aborted')
          return
        }

        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error.message || '스트리밍 오류',
          currentStep: '❌ 오류 발생',
        }))
      }
    },
    [agentId]
  )

  /**
   * 이벤트 처리
   */
  const handleEvent = useCallback((event: StreamEvent) => {
    setState(prev => {
      const newEvents = [...prev.events, event]
      const newToolsUsed = [...prev.toolsUsed]

      let currentStep = prev.currentStep
      let finalResponse = prev.finalResponse
      let error = prev.error
      let isStreaming = prev.isStreaming
      let progress = prev.progress

      switch (event.type) {
        case 'thinking':
          currentStep = event.content || '🤔 생각 중...'
          break

        case 'planning':
          if (event.plan) {
            currentStep = `📋 ${event.plan.totalSteps}단계 계획 수립 완료`
          } else {
            currentStep = event.content || '📋 계획 수립 중...'
          }
          break

        case 'tool_start':
          currentStep = `🔧 ${event.tool?.name || '도구'} 실행 중...`
          break

        case 'tool_end':
          if (event.tool?.name && !newToolsUsed.includes(event.tool.name)) {
            newToolsUsed.push(event.tool.name)
          }
          currentStep = event.error
            ? `❌ ${event.tool?.name} 실패: ${event.error}`
            : `✅ ${event.tool?.name} 완료`
          break

        case 'tool_retry':
          currentStep = `🔄 ${event.tool?.name} 재시도: ${event.content}`
          break

        case 'text':
          finalResponse = event.content || null
          currentStep = '📝 응답 생성 완료'
          break

        case 'memory_saved':
          currentStep = event.content || '💾 메모리 저장됨'
          break

        case 'done':
          isStreaming = false
          currentStep = '✅ 완료'
          break

        case 'error':
          isStreaming = false
          error = event.error || '알 수 없는 오류'
          currentStep = `❌ 오류: ${error}`
          break
      }

      // 진행률 업데이트
      if (event.iteration !== undefined && event.maxIterations !== undefined) {
        progress = { current: event.iteration, max: event.maxIterations }
      }

      return {
        ...prev,
        events: newEvents,
        currentStep,
        finalResponse,
        error,
        isStreaming,
        toolsUsed: newToolsUsed,
        progress,
      }
    })
  }, [])

  /**
   * 스트리밍 취소
   */
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setState(prev => ({
      ...prev,
      isStreaming: false,
      currentStep: '🛑 취소됨',
    }))
  }, [])

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setState({
      isStreaming: false,
      events: [],
      currentStep: '',
      finalResponse: null,
      error: null,
      toolsUsed: [],
      progress: { current: 0, max: 0 },
    })
  }, [])

  return {
    ...state,
    sendStreamingMessage,
    cancelStreaming,
    reset,
  }
}
