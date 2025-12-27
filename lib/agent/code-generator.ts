/**
 * Agent Code Generator
 * 에이전트 노드들을 코드 파일로 변환하는 유틸리티
 */

import type { AgentNodeData, AgentType } from './types'

export interface NodeInfo {
  id: string
  type: string
  data: Partial<AgentNodeData> & { label?: string }
  position: { x: number; y: number }
}

export interface EdgeInfo {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export interface AgentFolderStructure {
  folderPath: string
  files: { path: string; content: string }[]
  agentJson: object
}

type PartialNodeData = Partial<AgentNodeData> & { label?: string }

/**
 * 노드 타입별 코드 템플릿 생성
 */
export function generateNodeCode(node: NodeInfo): string {
  const { id, type, data } = node
  const nodeName = sanitizeName(data.label || `node_${id}`)

  switch (type) {
    case 'start':
      return generateStartNodeCode(nodeName, data as PartialNodeData)
    case 'end':
      return generateEndNodeCode(nodeName, data as PartialNodeData)
    case 'llm':
      return generateLLMNodeCode(nodeName, data as PartialNodeData)
    case 'prompt':
      return generatePromptNodeCode(nodeName, data as PartialNodeData)
    case 'router':
      return generateRouterNodeCode(nodeName, data as PartialNodeData)
    case 'memory':
      return generateMemoryNodeCode(nodeName, data as PartialNodeData)
    case 'tool':
      return generateToolNodeCode(nodeName, data as PartialNodeData)
    case 'rag':
      return generateRAGNodeCode(nodeName, data as PartialNodeData)
    case 'javascript':
      return generateJavaScriptNodeCode(nodeName, data as PartialNodeData)
    case 'function':
      return generateFunctionNodeCode(nodeName, data as PartialNodeData)
    case 'evaluator':
      return generateEvaluatorNodeCode(nodeName, data as PartialNodeData)
    case 'input':
      return generateInputNodeCode(nodeName, data as PartialNodeData)
    case 'output':
      return generateOutputNodeCode(nodeName, data as PartialNodeData)
    case 'chain':
      return generateChainNodeCode(nodeName, data as PartialNodeData)
    case 'image_generation':
      return generateImageGenerationNodeCode(nodeName, data as PartialNodeData)
    case 'embedding':
      return generateEmbeddingNodeCode(nodeName, data as PartialNodeData)
    case 'custom_tool':
      return generateCustomToolNodeCode(nodeName, data as PartialNodeData)
    case 'activepieces':
      return generateActivepiecesNodeCode(nodeName, data as PartialNodeData)
    default:
      return generateGenericNodeCode(nodeName, type, data as PartialNodeData)
  }
}

/**
 * Start 노드 코드 생성
 */
function generateStartNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Start Node: ${data.label || name}
 * ${data.description || '에이전트 실행 시작점'}
 */

export interface StartInput {
  message: string
  context?: Record<string, unknown>
}

export interface StartOutput {
  message: string
  timestamp: number
  metadata: Record<string, unknown>
}

export async function execute(input: StartInput): Promise<StartOutput> {
  console.log('[${name}] Agent started with input:', input.message)

  return {
    message: input.message,
    timestamp: Date.now(),
    metadata: {
      inputType: '${data.inputType || 'text'}',
      ...input.context,
    },
  }
}

export const nodeConfig = {
  type: 'start',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * End 노드 코드 생성
 */
function generateEndNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * End Node: ${data.label || name}
 * ${data.description || '에이전트 실행 종료점'}
 */

export interface EndInput {
  result: unknown
  metadata?: Record<string, unknown>
}

export interface EndOutput {
  success: boolean
  result: unknown
  executionTime: number
}

let startTime = Date.now()

export function setStartTime(time: number) {
  startTime = time
}

export async function execute(input: EndInput): Promise<EndOutput> {
  const executionTime = Date.now() - startTime

  console.log('[${name}] Agent completed in', executionTime, 'ms')

  return {
    success: true,
    result: input.result,
    executionTime,
  }
}

export const nodeConfig = {
  type: 'end',
  label: '${data.label || name}',
  description: '${data.description || ''}',
  outputType: '${data.outputType || 'text'}',
  outputFormat: '${data.outputFormat || ''}',
}
`
}

/**
 * LLM 노드 코드 생성
 */
function generateLLMNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * LLM Node: ${data.label || name}
 * ${data.description || 'LLM을 사용한 텍스트 생성'}
 */

export interface LLMInput {
  prompt: string
  systemPrompt?: string
  context?: Record<string, unknown>
}

export interface LLMOutput {
  response: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export const config = {
  model: '${data.model || 'gpt-4o-mini'}',
  temperature: ${data.temperature || 0.7},
  maxTokens: ${data.maxTokens || 2048},
  systemPrompt: \`${data.systemPrompt || ''}\`,
}

export async function execute(input: LLMInput): Promise<LLMOutput> {
  const { prompt, systemPrompt, context } = input

  // TODO: 실제 LLM API 호출 구현
  // 현재는 플레이스홀더
  console.log('[${name}] LLM 호출:', { prompt, model: config.model })

  const response = await callLLM({
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt || config.systemPrompt },
      { role: 'user', content: prompt },
    ],
  })

  return {
    response: response.content,
    model: config.model,
    usage: response.usage,
  }
}

async function callLLM(params: any): Promise<any> {
  // 실제 구현에서는 OpenAI, Anthropic 등의 API를 호출
  return {
    content: '[LLM Response Placeholder]',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  }
}

export const nodeConfig = {
  type: 'llm',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Prompt 노드 코드 생성
 */
function generatePromptNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Prompt Node: ${data.label || name}
 * ${data.description || '프롬프트 템플릿 처리'}
 */

export interface PromptInput {
  variables: Record<string, string>
}

export interface PromptOutput {
  prompt: string
  variables: Record<string, string>
}

export const template = \`${data.prompt || '{{input}}'}\`

export async function execute(input: PromptInput): Promise<PromptOutput> {
  let prompt = template

  // 변수 치환
  for (const [key, value] of Object.entries(input.variables)) {
    prompt = prompt.replace(new RegExp(\`{{\\s*\${key}\\s*}}\`, 'g'), value)
  }

  console.log('[${name}] 프롬프트 생성 완료')

  return {
    prompt,
    variables: input.variables,
  }
}

export const nodeConfig = {
  type: 'prompt',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Router 노드 코드 생성
 */
function generateRouterNodeCode(name: string, data: PartialNodeData): string {
  const routes = data.routes || []
  return `/**
 * Router Node: ${data.label || name}
 * ${data.description || '조건 기반 라우팅'}
 */

export interface RouterInput {
  value: unknown
  context?: Record<string, unknown>
}

export interface RouterOutput {
  route: string
  targetNodeId: string
  value: unknown
}

export const routes = ${JSON.stringify(routes, null, 2)}

export const routingLogic = '${data.routingLogic || 'conditional'}'

export async function execute(input: RouterInput): Promise<RouterOutput> {
  const { value, context } = input

  // 라우팅 로직 평가
  for (const route of routes) {
    if (evaluateCondition(route.condition, value, context)) {
      console.log('[${name}] 라우팅:', route.label || route.targetNodeId)
      return {
        route: route.label || route.id,
        targetNodeId: route.targetNodeId,
        value,
      }
    }
  }

  // 기본 라우트 (첫 번째)
  const defaultRoute = routes[0]
  return {
    route: defaultRoute?.label || 'default',
    targetNodeId: defaultRoute?.targetNodeId || '',
    value,
  }
}

function evaluateCondition(condition: string, value: unknown, context?: Record<string, unknown>): boolean {
  try {
    // 간단한 조건 평가 (실제 구현에서는 더 안전한 방식 사용)
    const evalContext = { value, context, ...context }
    return new Function('ctx', \`with(ctx) { return \${condition} }\`)(evalContext)
  } catch {
    return false
  }
}

export const nodeConfig = {
  type: 'router',
  label: '${data.label || name}',
  description: '${data.description || ''}',
  routingLogic: '${data.routingLogic || 'conditional'}',
}
`
}

/**
 * Memory 노드 코드 생성
 */
function generateMemoryNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Memory Node: ${data.label || name}
 * ${data.description || '대화 메모리 관리'}
 */

export interface MemoryInput {
  action: 'store' | 'retrieve' | 'clear'
  key?: string
  value?: unknown
}

export interface MemoryOutput {
  success: boolean
  data?: unknown
  memorySize: number
}

export const config = {
  memoryType: '${data.memoryType || 'buffer'}',
  memoryLimit: ${data.memoryLimit || 100},
}

// 인메모리 저장소 (실제 구현에서는 외부 저장소 사용)
const memoryStore: Map<string, unknown> = new Map()

export async function execute(input: MemoryInput): Promise<MemoryOutput> {
  const { action, key, value } = input

  switch (action) {
    case 'store':
      if (key) {
        memoryStore.set(key, value)
        // 메모리 제한 확인
        if (memoryStore.size > config.memoryLimit) {
          const firstKey = memoryStore.keys().next().value
          memoryStore.delete(firstKey)
        }
      }
      return { success: true, memorySize: memoryStore.size }

    case 'retrieve':
      return {
        success: true,
        data: key ? memoryStore.get(key) : Object.fromEntries(memoryStore),
        memorySize: memoryStore.size,
      }

    case 'clear':
      memoryStore.clear()
      return { success: true, memorySize: 0 }

    default:
      return { success: false, memorySize: memoryStore.size }
  }
}

export const nodeConfig = {
  type: 'memory',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Tool 노드 (HTTP Request) 코드 생성
 */
function generateToolNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Tool Node (HTTP Request): ${data.label || name}
 * ${data.description || 'HTTP API 호출'}
 */

export interface ToolInput {
  url?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: unknown
}

export interface ToolOutput {
  success: boolean
  status: number
  data: unknown
  error?: string
}

export const config = {
  url: '${data.url || ''}',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
}

export async function execute(input: ToolInput): Promise<ToolOutput> {
  const url = input.url || config.url
  const method = input.method || config.method

  if (!url) {
    return { success: false, status: 0, data: null, error: 'URL이 필요합니다' }
  }

  try {
    console.log('[${name}] HTTP Request:', method, url)

    const response = await fetch(url, {
      method,
      headers: { ...config.headers, ...input.headers },
      body: input.body ? JSON.stringify(input.body) : undefined,
    })

    const data = await response.json().catch(() => response.text())

    return {
      success: response.ok,
      status: response.status,
      data,
    }
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export const nodeConfig = {
  type: 'tool',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * RAG 노드 코드 생성
 */
function generateRAGNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * RAG Node: ${data.label || name}
 * ${data.description || '문서 검색 및 컨텍스트 보강'}
 */

export interface RAGInput {
  query: string
  topK?: number
}

export interface RAGOutput {
  documents: Array<{
    content: string
    metadata: Record<string, unknown>
    score: number
  }>
  context: string
}

export const config = {
  vectorStore: '${data.vectorStore || 'supabase'}',
  embeddingModel: '${data.embeddingModel || 'text-embedding-3-small'}',
  retrievalCount: ${data.retrievalCount || 5},
}

export async function execute(input: RAGInput): Promise<RAGOutput> {
  const { query, topK = config.retrievalCount } = input

  console.log('[${name}] RAG 검색:', query)

  // TODO: 실제 벡터 검색 구현
  // 현재는 플레이스홀더
  const documents = await searchDocuments(query, topK)

  // 검색된 문서들을 컨텍스트로 결합
  const context = documents
    .map((doc, i) => \`[문서 \${i + 1}] \${doc.content}\`)
    .join('\\n\\n')

  return { documents, context }
}

async function searchDocuments(query: string, topK: number): Promise<any[]> {
  // 실제 구현에서는 벡터 DB 검색
  return []
}

export const nodeConfig = {
  type: 'rag',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * JavaScript 노드 코드 생성
 */
function generateJavaScriptNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * JavaScript Node: ${data.label || name}
 * ${data.description || '커스텀 JavaScript 코드 실행'}
 */

export interface JSInput {
  input: unknown
  context?: Record<string, unknown>
}

export interface JSOutput {
  result: unknown
  logs: string[]
}

// 사용자 정의 코드
const userCode = \`
${data.code || '// 여기에 코드를 작성하세요\nreturn input;'}
\`

export async function execute(input: JSInput): Promise<JSOutput> {
  const logs: string[] = []
  const customConsole = {
    log: (...args: any[]) => logs.push(args.map(String).join(' ')),
    error: (...args: any[]) => logs.push('[ERROR] ' + args.map(String).join(' ')),
    warn: (...args: any[]) => logs.push('[WARN] ' + args.map(String).join(' ')),
  }

  try {
    const fn = new Function('input', 'context', 'console', userCode)
    const result = await fn(input.input, input.context || {}, customConsole)

    return { result, logs }
  } catch (error) {
    return {
      result: null,
      logs: [...logs, '[ERROR] ' + (error instanceof Error ? error.message : String(error))],
    }
  }
}

export const nodeConfig = {
  type: 'javascript',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Function 노드 코드 생성
 */
function generateFunctionNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Function Node: ${data.label || name}
 * ${data.description || '함수 호출'}
 */

export interface FunctionInput {
  args: Record<string, unknown>
}

export interface FunctionOutput {
  result: unknown
  success: boolean
  error?: string
}

export const config = {
  functionName: '${data.functionName || ''}',
  functionArgs: ${JSON.stringify(data.functionArgs || '{}')},
}

export async function execute(input: FunctionInput): Promise<FunctionOutput> {
  try {
    console.log('[${name}] 함수 호출:', config.functionName)

    // TODO: 등록된 함수 호출 구현
    const result = await callFunction(config.functionName, {
      ...JSON.parse(config.functionArgs),
      ...input.args,
    })

    return { result, success: true }
  } catch (error) {
    return {
      result: null,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function callFunction(name: string, args: Record<string, unknown>): Promise<unknown> {
  // 실제 구현에서는 함수 레지스트리에서 함수 조회 및 호출
  return null
}

export const nodeConfig = {
  type: 'function',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Evaluator 노드 코드 생성
 */
function generateEvaluatorNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Evaluator Node: ${data.label || name}
 * ${data.description || '결과 평가'}
 */

export interface EvaluatorInput {
  value: unknown
  expectedValue?: unknown
  criteria?: string
}

export interface EvaluatorOutput {
  score: number
  passed: boolean
  evaluation: string
}

export const config = {
  evaluationType: '${data.evaluationType || 'quality'}',
  threshold: ${data.threshold || 0.7},
}

export async function execute(input: EvaluatorInput): Promise<EvaluatorOutput> {
  const { value, expectedValue, criteria } = input

  console.log('[${name}] 평가 타입:', config.evaluationType)

  // 평가 로직
  let score = 0
  let evaluation = ''

  switch (config.evaluationType) {
    case 'quality':
      score = evaluateQuality(value)
      evaluation = score >= config.threshold ? '품질 기준 충족' : '품질 개선 필요'
      break
    case 'relevance':
      score = evaluateRelevance(value, criteria)
      evaluation = score >= config.threshold ? '관련성 높음' : '관련성 낮음'
      break
    case 'accuracy':
      score = evaluateAccuracy(value, expectedValue)
      evaluation = score >= config.threshold ? '정확도 높음' : '정확도 낮음'
      break
    case 'safety':
      score = evaluateSafety(value)
      evaluation = score >= config.threshold ? '안전' : '위험 요소 감지'
      break
  }

  return {
    score,
    passed: score >= config.threshold,
    evaluation,
  }
}

function evaluateQuality(value: unknown): number {
  // 품질 평가 로직
  return 0.8
}

function evaluateRelevance(value: unknown, criteria?: string): number {
  // 관련성 평가 로직
  return 0.8
}

function evaluateAccuracy(value: unknown, expected?: unknown): number {
  // 정확도 평가 로직
  return value === expected ? 1.0 : 0.5
}

function evaluateSafety(value: unknown): number {
  // 안전성 평가 로직
  return 0.9
}

export const nodeConfig = {
  type: 'evaluator',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Input 노드 코드 생성
 */
function generateInputNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Input Node: ${data.label || name}
 * ${data.description || '입력 처리'}
 */

export interface InputPayload {
  type: '${data.inputType || 'text'}'
  data: unknown
  metadata?: Record<string, unknown>
}

export interface InputOutput {
  processed: boolean
  data: unknown
  inputType: string
}

export const config = {
  inputType: '${data.inputType || 'text'}',
  inputConfig: ${JSON.stringify(data.inputConfig || {})},
}

export async function execute(payload: InputPayload): Promise<InputOutput> {
  console.log('[${name}] 입력 처리:', config.inputType)

  // 입력 타입별 처리
  let processedData = payload.data

  switch (config.inputType) {
    case 'text':
      processedData = String(payload.data)
      break
    case 'file':
      // 파일 처리 로직
      break
    case 'api':
      // API 입력 처리
      break
    case 'webhook':
      // 웹훅 처리
      break
    case 'schedule':
      // 스케줄 트리거 처리
      break
  }

  return {
    processed: true,
    data: processedData,
    inputType: config.inputType,
  }
}

export const nodeConfig = {
  type: 'input',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Output 노드 코드 생성
 */
function generateOutputNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Output Node: ${data.label || name}
 * ${data.description || '출력 처리'}
 */

export interface OutputInput {
  data: unknown
  format?: string
}

export interface OutputResult {
  formatted: unknown
  outputType: string
  success: boolean
}

export const config = {
  outputType: '${data.outputType || 'text'}',
  outputFormat: '${data.outputFormat || ''}',
}

export async function execute(input: OutputInput): Promise<OutputResult> {
  console.log('[${name}] 출력 타입:', config.outputType)

  let formatted = input.data

  switch (config.outputType) {
    case 'text':
      formatted = String(input.data)
      break
    case 'json':
      formatted = typeof input.data === 'string'
        ? JSON.parse(input.data)
        : input.data
      break
    case 'stream':
      // 스트리밍 출력 처리
      break
    case 'file':
      // 파일 출력 처리
      break
  }

  return {
    formatted,
    outputType: config.outputType,
    success: true,
  }
}

export const nodeConfig = {
  type: 'output',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Chain 노드 코드 생성
 */
function generateChainNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Chain Node: ${data.label || name}
 * ${data.description || '여러 노드를 순차적으로 실행'}
 */

export interface ChainInput {
  initialData: unknown
  steps?: string[]
}

export interface ChainOutput {
  result: unknown
  stepResults: Array<{ step: string; result: unknown }>
  success: boolean
}

export async function execute(input: ChainInput): Promise<ChainOutput> {
  console.log('[${name}] Chain 실행 시작')

  const stepResults: Array<{ step: string; result: unknown }> = []
  let currentData = input.initialData

  // 각 스텝 순차 실행
  for (const step of input.steps || []) {
    try {
      // TODO: 실제 스텝 실행 구현
      const result = await executeStep(step, currentData)
      stepResults.push({ step, result })
      currentData = result
    } catch (error) {
      return {
        result: null,
        stepResults,
        success: false,
      }
    }
  }

  return {
    result: currentData,
    stepResults,
    success: true,
  }
}

async function executeStep(stepId: string, data: unknown): Promise<unknown> {
  // 실제 구현에서는 해당 노드 실행
  return data
}

export const nodeConfig = {
  type: 'chain',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Image Generation 노드 코드 생성
 */
function generateImageGenerationNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Image Generation Node: ${data.label || name}
 * ${data.description || '이미지 생성'}
 */

export interface ImageInput {
  prompt: string
  negativePrompt?: string
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792'
  style?: 'vivid' | 'natural'
}

export interface ImageOutput {
  imageUrl: string
  revisedPrompt?: string
  success: boolean
}

export const config = {
  model: '${data.model || 'dall-e-3'}',
  defaultSize: '1024x1024',
  defaultStyle: 'vivid',
}

export async function execute(input: ImageInput): Promise<ImageOutput> {
  console.log('[${name}] 이미지 생성:', input.prompt.substring(0, 50))

  try {
    // TODO: 실제 이미지 생성 API 호출
    const result = await generateImage({
      model: config.model,
      prompt: input.prompt,
      negative_prompt: input.negativePrompt,
      size: input.size || config.defaultSize,
      style: input.style || config.defaultStyle,
    })

    return {
      imageUrl: result.url,
      revisedPrompt: result.revised_prompt,
      success: true,
    }
  } catch (error) {
    return {
      imageUrl: '',
      success: false,
    }
  }
}

async function generateImage(params: any): Promise<any> {
  // 실제 구현에서는 DALL-E, Stable Diffusion 등 API 호출
  return { url: '', revised_prompt: '' }
}

export const nodeConfig = {
  type: 'image_generation',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Embedding 노드 코드 생성
 */
function generateEmbeddingNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Embedding Node: ${data.label || name}
 * ${data.description || '텍스트 임베딩 생성'}
 */

export interface EmbeddingInput {
  text: string | string[]
}

export interface EmbeddingOutput {
  embeddings: number[][]
  model: string
  dimensions: number
}

export const config = {
  model: '${data.embeddingModel || 'text-embedding-3-small'}',
}

export async function execute(input: EmbeddingInput): Promise<EmbeddingOutput> {
  const texts = Array.isArray(input.text) ? input.text : [input.text]

  console.log('[${name}] 임베딩 생성:', texts.length, '개 텍스트')

  // TODO: 실제 임베딩 API 호출
  const result = await createEmbeddings(texts, config.model)

  return {
    embeddings: result.embeddings,
    model: config.model,
    dimensions: result.embeddings[0]?.length || 0,
  }
}

async function createEmbeddings(texts: string[], model: string): Promise<any> {
  // 실제 구현에서는 OpenAI, Cohere 등 API 호출
  return { embeddings: texts.map(() => new Array(1536).fill(0)) }
}

export const nodeConfig = {
  type: 'embedding',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Custom Tool 노드 코드 생성
 */
function generateCustomToolNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Custom Tool Node: ${data.label || name}
 * ${data.description || '커스텀 Python 도구'}
 */

export interface CustomToolInput {
  args: Record<string, unknown>
}

export interface CustomToolOutput {
  result: unknown
  success: boolean
  error?: string
}

export const config = {
  toolName: '${data.pythonToolName || ''}',
  toolDescription: '${data.pythonToolDescription || ''}',
  parameters: ${JSON.stringify(data.pythonToolParameters || {}, null, 2)},
}

export async function execute(input: CustomToolInput): Promise<CustomToolOutput> {
  console.log('[${name}] Python 도구 호출:', config.toolName)

  try {
    // TODO: Python 도구 실행 구현
    const result = await executePythonTool(config.toolName, input.args)

    return { result, success: true }
  } catch (error) {
    return {
      result: null,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function executePythonTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  // 실제 구현에서는 Python 런타임 호출
  return null
}

export const nodeConfig = {
  type: 'custom_tool',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * Activepieces 노드 코드 생성
 */
function generateActivepiecesNodeCode(name: string, data: PartialNodeData): string {
  return `/**
 * Activepieces Node: ${data.label || name}
 * ${data.description || 'Activepieces 자동화 플로우 실행'}
 */

export interface ActivepiecesInput {
  inputs?: Record<string, unknown>
}

export interface ActivepiecesOutput {
  flowId: string
  result: unknown
  success: boolean
}

export const config = {
  flowId: '${data.activepiecesFlowId || ''}',
  flowName: '${data.activepiecesFlowName || ''}',
  webhookUrl: '${data.activepiecesWebhookUrl || ''}',
  triggerType: '${data.activepiecesTriggerType || 'webhook'}',
  waitForCompletion: ${data.activepiecesWaitForCompletion ?? true},
}

export async function execute(input: ActivepiecesInput): Promise<ActivepiecesOutput> {
  console.log('[${name}] Activepieces 플로우 실행:', config.flowName)

  try {
    // 웹훅 트리거
    if (config.triggerType === 'webhook' && config.webhookUrl) {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input.inputs || {}),
      })

      const result = await response.json()

      return {
        flowId: config.flowId,
        result,
        success: response.ok,
      }
    }

    return {
      flowId: config.flowId,
      result: null,
      success: false,
    }
  } catch (error) {
    return {
      flowId: config.flowId,
      result: null,
      success: false,
    }
  }
}

export const nodeConfig = {
  type: 'activepieces',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * 일반 노드 코드 생성 (알 수 없는 타입)
 */
function generateGenericNodeCode(name: string, type: string, data: PartialNodeData): string {
  return `/**
 * ${type} Node: ${data.label || name}
 * ${data.description || ''}
 */

export interface NodeInput {
  data: unknown
}

export interface NodeOutput {
  result: unknown
  success: boolean
}

export const config = ${JSON.stringify(data, null, 2)}

export async function execute(input: NodeInput): Promise<NodeOutput> {
  console.log('[${name}] 노드 실행 (타입: ${type})')

  // TODO: 노드 로직 구현
  return {
    result: input.data,
    success: true,
  }
}

export const nodeConfig = {
  type: '${type}',
  label: '${data.label || name}',
  description: '${data.description || ''}',
}
`
}

/**
 * agent.json 생성
 */
export function generateAgentJson(
  agentName: string,
  description: string,
  nodes: NodeInfo[],
  edges: EdgeInfo[],
  metadata: Record<string, unknown> = {}
): string {
  const workflow = {
    name: agentName,
    description,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.type,
      file: `${sanitizeName(n.data.label || n.id)}.ts`,
      position: n.position,
      config: {
        label: n.data.label,
        description: n.data.description,
      },
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
    metadata: {
      ...metadata,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
  }

  return JSON.stringify(workflow, null, 2)
}

/**
 * index.ts 생성 (메인 진입점)
 */
export function generateIndexFile(agentName: string, nodes: NodeInfo[]): string {
  const imports = nodes.map(n => {
    const fileName = sanitizeName(n.data.label || n.id)
    return `import * as ${fileName} from './${fileName}'`
  }).join('\n')

  const nodeMap = nodes.map(n => {
    const fileName = sanitizeName(n.data.label || n.id)
    return `  '${n.id}': ${fileName},`
  }).join('\n')

  return `/**
 * ${agentName} - Agent Entry Point
 * 자동 생성된 에이전트 실행 파일
 */

${imports}
import agentConfig from './agent.json'

// 노드 맵
export const nodes = {
${nodeMap}
}

// 에이전트 설정
export const config = agentConfig

// 에이전트 실행
export async function execute(input: unknown): Promise<unknown> {
  console.log('[${agentName}] 에이전트 실행 시작')

  // 시작 노드 찾기
  const startNode = agentConfig.nodes.find(n => n.type === 'start')
  if (!startNode) {
    throw new Error('시작 노드를 찾을 수 없습니다')
  }

  // 워크플로우 실행
  let currentNodeId = startNode.id
  let currentData = input

  while (currentNodeId) {
    const nodeModule = nodes[currentNodeId as keyof typeof nodes]
    if (!nodeModule) break

    // 노드 실행
    currentData = await nodeModule.execute(currentData as any)

    // 다음 노드 찾기
    const outgoingEdge = agentConfig.edges.find(e => e.source === currentNodeId)
    currentNodeId = outgoingEdge?.target || ''

    // 종료 노드 확인
    const currentNode = agentConfig.nodes.find(n => n.id === currentNodeId)
    if (currentNode?.type === 'end') {
      const endModule = nodes[currentNodeId as keyof typeof nodes]
      if (endModule) {
        return endModule.execute(currentData as any)
      }
      break
    }
  }

  return currentData
}

export default { execute, nodes, config }
`
}

/**
 * 전체 폴더 구조 생성
 */
export function generateAgentFolder(
  agentName: string,
  description: string,
  nodes: NodeInfo[],
  edges: EdgeInfo[],
  metadata: Record<string, unknown> = {}
): AgentFolderStructure {
  const safeName = sanitizeName(agentName)
  const folderPath = `agents/${safeName}`

  const files: { path: string; content: string }[] = []

  // 각 노드에 대한 코드 파일 생성
  for (const node of nodes) {
    const fileName = sanitizeName(node.data.label || node.id)
    const code = generateNodeCode(node)
    files.push({
      path: `${folderPath}/${fileName}.ts`,
      content: code,
    })
  }

  // agent.json 생성
  const agentJson = generateAgentJson(agentName, description, nodes, edges, metadata)
  files.push({
    path: `${folderPath}/agent.json`,
    content: agentJson,
  })

  // index.ts 생성
  const indexFile = generateIndexFile(agentName, nodes)
  files.push({
    path: `${folderPath}/index.ts`,
    content: indexFile,
  })

  return {
    folderPath,
    files,
    agentJson: JSON.parse(agentJson),
  }
}

/**
 * 파일명으로 사용 가능하도록 이름 정제
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'node'
}
