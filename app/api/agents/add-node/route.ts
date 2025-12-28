import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

// 노드 타입별 기본 파일 템플릿
const getNodeFileTemplate = (nodeType: string, nodeId: string, label: string) => {
  const templates: Record<string, string> = {
    start: `/**
 * Start Node - ${label}
 * 워크플로우 시작점
 */
export interface StartInput {
  data: unknown
}

export interface StartOutput {
  data: unknown
}

export async function execute(input: StartInput): Promise<StartOutput> {
  console.log('[${label}] 시작 노드 실행')
  return { data: input.data }
}
`,
    end: `/**
 * End Node - ${label}
 * 워크플로우 종료점
 */
export interface EndInput {
  data: unknown
}

export interface EndOutput {
  result: unknown
}

export async function execute(input: EndInput): Promise<EndOutput> {
  console.log('[${label}] 종료 노드 실행')
  return { result: input.data }
}
`,
    prompt: `/**
 * Prompt Node - ${label}
 * 프롬프트 텍스트 처리
 */
export interface PromptInput {
  text?: string
  variables?: Record<string, string>
}

export interface PromptOutput {
  prompt: string
}

export async function execute(input: PromptInput): Promise<PromptOutput> {
  console.log('[${label}] 프롬프트 노드 실행')
  let prompt = input.text || ''

  // 변수 치환
  if (input.variables) {
    for (const [key, value] of Object.entries(input.variables)) {
      prompt = prompt.replace(new RegExp(\`{{\\s*\${key}\\s*}}\`, 'g'), value)
    }
  }

  return { prompt }
}
`,
    llm: `/**
 * LLM Node - ${label}
 * AI 텍스트 생성
 */
export interface LLMInput {
  prompt: string
  model?: string
  temperature?: number
}

export interface LLMOutput {
  response: string
}

export async function execute(input: LLMInput): Promise<LLMOutput> {
  console.log('[${label}] LLM 노드 실행')
  // TODO: 실제 LLM API 호출 구현
  return { response: \`[LLM 응답] \${input.prompt.slice(0, 50)}...\` }
}
`,
    function: `/**
 * Function Node - ${label}
 * 커스텀 함수 실행
 */
export interface FunctionInput {
  data: unknown
  args?: unknown[]
}

export interface FunctionOutput {
  result: unknown
}

export async function execute(input: FunctionInput): Promise<FunctionOutput> {
  console.log('[${label}] 함수 노드 실행')
  // TODO: 커스텀 로직 구현
  return { result: input.data }
}
`,
    javascript: `/**
 * JavaScript Node - ${label}
 * JavaScript 코드 실행
 */
export interface JSInput {
  code?: string
  data?: unknown
}

export interface JSOutput {
  result: unknown
}

export async function execute(input: JSInput): Promise<JSOutput> {
  console.log('[${label}] JavaScript 노드 실행')
  // TODO: 안전한 JS 실행 환경 구현
  return { result: input.data }
}
`,
  }

  // 기본 템플릿 (알 수 없는 타입용)
  return templates[nodeType] || `/**
 * ${label} Node
 * 타입: ${nodeType}
 */
export interface NodeInput {
  data: unknown
}

export interface NodeOutput {
  result: unknown
}

export async function execute(input: NodeInput): Promise<NodeOutput> {
  console.log('[${label}] 노드 실행')
  return { result: input.data }
}
`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { folderName, projectPath, nodeType, nodeId, position, label } = body

    if (!folderName || !nodeType || !nodeId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다 (folderName, nodeType, nodeId)' },
        { status: 400 }
      )
    }

    const baseDir = projectPath || process.cwd()
    const agentDir = path.join(baseDir, 'agents', folderName)
    const agentJsonPath = path.join(agentDir, 'agent.json')

    // 폴더 존재 확인
    try {
      await fs.access(agentDir)
    } catch {
      return NextResponse.json({ error: '에이전트 폴더를 찾을 수 없습니다' }, { status: 404 })
    }

    // agent.json 읽기
    let agentConfig: any
    try {
      const content = await fs.readFile(agentJsonPath, 'utf-8')
      agentConfig = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'agent.json을 읽을 수 없습니다' }, { status: 500 })
    }

    // 파일명 생성 (nodeId 기반 또는 타입 기반)
    const fileName = `${nodeId}.ts`
    const filePath = path.join(agentDir, fileName)

    // 파일 생성
    const fileContent = getNodeFileTemplate(nodeType, nodeId, label || nodeType)
    await fs.writeFile(filePath, fileContent)

    // 새 노드 정보
    const newNode = {
      id: nodeId,
      type: nodeType,
      file: fileName,
      position: position || { x: 0, y: 0 },
      config: { label: label || nodeType }
    }

    // agent.json 업데이트
    agentConfig.nodes = agentConfig.nodes || []
    agentConfig.nodes.push(newNode)
    agentConfig.updatedAt = new Date().toISOString()
    agentConfig.metadata = {
      ...agentConfig.metadata,
      nodeCount: agentConfig.nodes.length,
      edgeCount: (agentConfig.edges || []).length
    }

    await fs.writeFile(agentJsonPath, JSON.stringify(agentConfig, null, 2))

    console.log('[API] Node added:', nodeId, 'file:', fileName)

    return NextResponse.json({
      success: true,
      node: newNode,
      fileName
    })
  } catch (error: any) {
    console.error('[API] Add node error:', error)
    return NextResponse.json(
      { error: error.message || '노드 추가 실패' },
      { status: 500 }
    )
  }
}
