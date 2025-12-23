/**
 * Agent Action System
 * Agent API → 액션 반환 → 프론트엔드에서 Electron IPC로 실행
 */

// 액션 타입 정의
export type AgentAction =
  | WriteFileAction
  | CreateFileAction
  | TerminalAction
  | WebSearchAction

export interface WriteFileAction {
  type: 'write_file'
  path: string
  content: string
  originalContent?: string  // 롤백용
}

export interface CreateFileAction {
  type: 'create_file'
  path: string
  content: string
}

export interface TerminalAction {
  type: 'terminal_cmd'
  command: string
  cwd?: string
  waitForOutput?: boolean
}

export interface WebSearchAction {
  type: 'web_search'
  query: string
}

// 액션 실행 결과
export interface ActionResult {
  action: AgentAction
  success: boolean
  result?: unknown
  error?: string
}

// 프론트엔드에서 사용할 액션 실행기
export async function executeAction(action: AgentAction): Promise<ActionResult> {
  // window.electron이 없으면 (웹 모드) 시뮬레이션
  if (typeof window === 'undefined' || !window.electron) {
    return {
      action,
      success: false,
      error: 'Electron 환경에서만 실행 가능합니다'
    }
  }

  try {
    switch (action.type) {
      case 'write_file': {
        await window.electron?.fs?.writeFile?.(action.path, action.content)
        return {
          action,
          success: true,
          result: { path: action.path, bytesWritten: action.content.length }
        }
      }

      case 'create_file': {
        await window.electron?.fs?.writeFile?.(action.path, action.content)
        return {
          action,
          success: true,
          result: { path: action.path, created: true }
        }
      }

      case 'terminal_cmd': {
        // 터미널 ID 생성
        const terminalId = `agent-${Date.now()}`

        // 터미널 생성
        await window.electron?.terminal?.create?.(terminalId, action.cwd)

        // 명령어 실행
        await window.electron?.terminal?.write?.(terminalId, action.command + '\n')

        // 출력 대기 (간단한 구현)
        if (action.waitForOutput) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

        return {
          action,
          success: true,
          result: { command: action.command, terminalId }
        }
      }

      case 'web_search': {
        // 웹 검색은 API로 처리해야 함
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: action.query })
        })

        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()
        return {
          action,
          success: true,
          result: data
        }
      }

      default:
        return {
          action,
          success: false,
          error: `Unknown action type: ${(action as any).type}`
        }
    }
  } catch (error: any) {
    return {
      action,
      success: false,
      error: error.message
    }
  }
}

// 여러 액션 병렬 실행
export async function executeActions(actions: AgentAction[]): Promise<ActionResult[]> {
  return Promise.all(actions.map(executeAction))
}

// NOTE: window.electron 타입은 types/electron.d.ts에 정의되어 있습니다
