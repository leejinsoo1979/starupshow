import { v4 as uuidv4 } from "uuid"
import type {
  AgentNode,
  AgentNodeData,
  AgentEdge,
  AgentType,
  AgentNodeTypeConfig,
  AgentTemplate,
} from "./types"

// Generate unique node ID
export function generateAgentNodeId(type: AgentType): string {
  return `${type}-${uuidv4().slice(0, 8)}`
}

// Node type configurations
export const AGENT_NODE_CONFIGS: Record<AgentType, AgentNodeTypeConfig> = {
  llm: {
    type: "llm",
    label: "LLM",
    labelKo: "LLM 모델",
    description: "Large Language Model node for text generation",
    descriptionKo: "텍스트 생성을 위한 대규모 언어 모델",
    icon: "Brain",
    color: "#8b5cf6",
    bgColor: "#8b5cf620",
    borderColor: "#8b5cf6",
    category: "core",
    handles: { inputs: 1, outputs: 1 },
  },
  router: {
    type: "router",
    label: "Router",
    labelKo: "라우터",
    description: "Route conversations to different paths",
    descriptionKo: "대화를 다른 경로로 분기",
    icon: "GitBranch",
    color: "#f59e0b",
    bgColor: "#f59e0b20",
    borderColor: "#f59e0b",
    category: "control",
    handles: { inputs: 1, outputs: 3 },
  },
  memory: {
    type: "memory",
    label: "Memory",
    labelKo: "메모리",
    description: "Store and retrieve conversation context",
    descriptionKo: "대화 컨텍스트 저장 및 검색",
    icon: "Database",
    color: "#06b6d4",
    bgColor: "#06b6d420",
    borderColor: "#06b6d4",
    category: "memory",
    handles: { inputs: 1, outputs: 1 },
  },
  tool: {
    type: "tool",
    label: "Tool",
    labelKo: "도구",
    description: "External tool or API integration",
    descriptionKo: "외부 도구 또는 API 연동",
    icon: "Wrench",
    color: "#ec4899",
    bgColor: "#ec489920",
    borderColor: "#ec4899",
    category: "tools",
    handles: { inputs: 1, outputs: 1 },
  },
  rag: {
    type: "rag",
    label: "RAG",
    labelKo: "RAG 검색",
    description: "Retrieval Augmented Generation",
    descriptionKo: "검색 증강 생성 (벡터 검색)",
    icon: "Search",
    color: "#10b981",
    bgColor: "#10b98120",
    borderColor: "#10b981",
    category: "memory",
    handles: { inputs: 1, outputs: 1 },
  },
  input: {
    type: "input",
    label: "Input",
    labelKo: "입력",
    description: "User or system input node",
    descriptionKo: "사용자 또는 시스템 입력",
    icon: "MessageSquare",
    color: "#3b82f6",
    bgColor: "#3b82f620",
    borderColor: "#3b82f6",
    category: "io",
    handles: { inputs: 0, outputs: 1 },
  },
  output: {
    type: "output",
    label: "Output",
    labelKo: "출력",
    description: "Final output node",
    descriptionKo: "최종 출력 노드",
    icon: "Send",
    color: "#22c55e",
    bgColor: "#22c55e20",
    borderColor: "#22c55e",
    category: "io",
    handles: { inputs: 1, outputs: 0 },
  },
  chain: {
    type: "chain",
    label: "Chain",
    labelKo: "체인",
    description: "Chain multiple operations together",
    descriptionKo: "여러 작업을 연결",
    icon: "Link",
    color: "#6366f1",
    bgColor: "#6366f120",
    borderColor: "#6366f1",
    category: "control",
    handles: { inputs: 1, outputs: 1 },
  },
  evaluator: {
    type: "evaluator",
    label: "Evaluator",
    labelKo: "평가자",
    description: "Evaluate output quality",
    descriptionKo: "출력 품질 평가",
    icon: "CheckCircle",
    color: "#f97316",
    bgColor: "#f9731620",
    borderColor: "#f97316",
    category: "control",
    handles: { inputs: 1, outputs: 2 },
  },
  function: {
    type: "function",
    label: "Function",
    labelKo: "함수",
    description: "Custom function call",
    descriptionKo: "커스텀 함수 호출",
    icon: "Code",
    color: "#64748b",
    bgColor: "#64748b20",
    borderColor: "#64748b",
    category: "tools",
    handles: { inputs: 1, outputs: 1 },
  },
}

// Default node data by type
function getDefaultAgentNodeData(type: AgentType): Partial<AgentNodeData> {
  const config = AGENT_NODE_CONFIGS[type]

  const baseData: Partial<AgentNodeData> = {
    label: config.labelKo,
    description: config.descriptionKo,
    agentType: type,
  }

  switch (type) {
    case "llm":
      return {
        ...baseData,
        model: "gpt-4-turbo",
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: "You are a helpful assistant.",
      }
    case "router":
      return {
        ...baseData,
        routingLogic: "conditional",
        routes: [],
      }
    case "memory":
      return {
        ...baseData,
        memoryType: "buffer",
        memoryLimit: 10,
      }
    case "tool":
      return {
        ...baseData,
        tools: [],
      }
    case "rag":
      return {
        ...baseData,
        vectorStore: "supabase",
        embeddingModel: "text-embedding-3-small",
        retrievalCount: 5,
      }
    case "input":
      return {
        ...baseData,
        inputType: "text",
      }
    case "output":
      return {
        ...baseData,
        outputType: "text",
      }
    case "chain":
      return baseData
    case "evaluator":
      return {
        ...baseData,
        evaluationType: "quality",
        threshold: 0.8,
      }
    case "function":
      return {
        ...baseData,
        functionName: "",
        functionArgs: "{}",
      }
    default:
      return baseData
  }
}

// Create new agent node
export function createAgentNode({
  type,
  position,
  id,
}: {
  type: AgentType
  position: { x: number; y: number }
  id?: string
}): AgentNode {
  const nodeId = id || generateAgentNodeId(type)
  const config = AGENT_NODE_CONFIGS[type]
  const data = getDefaultAgentNodeData(type)

  return {
    id: nodeId,
    type,
    position,
    data: {
      label: data.label || config.labelKo,
      ...data,
    },
  }
}

// Validate agent configuration
export function validateAgent(
  nodes: AgentNode[],
  edges: AgentEdge[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for input node
  const inputNodes = nodes.filter((n) => n.type === "input")
  if (inputNodes.length === 0) {
    errors.push("입력 노드가 필요합니다.")
  }

  // Check for output node
  const outputNodes = nodes.filter((n) => n.type === "output")
  if (outputNodes.length === 0) {
    errors.push("출력 노드가 필요합니다.")
  }

  // Check for at least one LLM node
  const llmNodes = nodes.filter((n) => n.type === "llm")
  if (llmNodes.length === 0) {
    errors.push("최소 하나의 LLM 노드가 필요합니다.")
  }

  // Check connectivity
  const connectedNodeIds = new Set<string>()
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.source)
    connectedNodeIds.add(edge.target)
  })

  const disconnectedNodes = nodes.filter(
    (n) => n.type !== "input" && !connectedNodeIds.has(n.id)
  )
  if (disconnectedNodes.length > 0) {
    errors.push(`연결되지 않은 노드가 있습니다: ${disconnectedNodes.map((n) => n.data.label).join(", ")}`)
  }

  // Check LLM configurations
  llmNodes.forEach((node) => {
    if (!node.data.model) {
      errors.push(`LLM 노드 "${node.data.label}"에 모델이 설정되지 않았습니다.`)
    }
  })

  return { valid: errors.length === 0, errors }
}

// Export agent to JSON
export function exportAgentToJson(
  nodes: AgentNode[],
  edges: AgentEdge[],
  metadata?: { name?: string; description?: string }
): string {
  return JSON.stringify(
    {
      version: "1.0",
      type: "agent",
      metadata: {
        name: metadata?.name || "Untitled Agent",
        description: metadata?.description || "",
        exportedAt: new Date().toISOString(),
      },
      nodes,
      edges,
    },
    null,
    2
  )
}

// Import agent from JSON
export function importAgentFromJson(json: string): {
  nodes: AgentNode[]
  edges: AgentEdge[]
  metadata?: { name?: string; description?: string }
} | null {
  try {
    const data = JSON.parse(json)
    if (data.type !== "agent" || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      return null
    }
    return {
      nodes: data.nodes,
      edges: data.edges,
      metadata: data.metadata,
    }
  } catch {
    return null
  }
}

// Agent templates
export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "chatbot-basic",
    name: "Basic Chatbot",
    nameKo: "기본 챗봇",
    description: "Simple conversational chatbot with memory",
    descriptionKo: "메모리가 있는 간단한 대화형 챗봇",
    category: "chatbot",
    nodes: [
      createAgentNode({ type: "input", position: { x: 100, y: 200 } }),
      createAgentNode({ type: "memory", position: { x: 300, y: 100 } }),
      createAgentNode({ type: "llm", position: { x: 300, y: 200 } }),
      createAgentNode({ type: "output", position: { x: 500, y: 200 } }),
    ],
    edges: [
      { id: "e1", source: "input-1", target: "memory-1" },
      { id: "e2", source: "memory-1", target: "llm-1" },
      { id: "e3", source: "llm-1", target: "output-1" },
    ],
  },
  {
    id: "rag-assistant",
    name: "RAG Assistant",
    nameKo: "RAG 어시스턴트",
    description: "Knowledge-augmented assistant with vector search",
    descriptionKo: "벡터 검색이 포함된 지식 증강 어시스턴트",
    category: "assistant",
    nodes: [
      createAgentNode({ type: "input", position: { x: 100, y: 200 } }),
      createAgentNode({ type: "rag", position: { x: 300, y: 100 } }),
      createAgentNode({ type: "llm", position: { x: 300, y: 250 } }),
      createAgentNode({ type: "output", position: { x: 500, y: 200 } }),
    ],
    edges: [
      { id: "e1", source: "input-1", target: "rag-1" },
      { id: "e2", source: "rag-1", target: "llm-1" },
      { id: "e3", source: "llm-1", target: "output-1" },
    ],
  },
  {
    id: "tool-agent",
    name: "Tool-Augmented Agent",
    nameKo: "도구 활용 에이전트",
    description: "Agent with external tool capabilities",
    descriptionKo: "외부 도구 활용 기능이 있는 에이전트",
    category: "assistant",
    nodes: [
      createAgentNode({ type: "input", position: { x: 100, y: 200 } }),
      createAgentNode({ type: "router", position: { x: 300, y: 200 } }),
      createAgentNode({ type: "tool", position: { x: 500, y: 100 } }),
      createAgentNode({ type: "llm", position: { x: 500, y: 300 } }),
      createAgentNode({ type: "output", position: { x: 700, y: 200 } }),
    ],
    edges: [
      { id: "e1", source: "input-1", target: "router-1" },
      { id: "e2", source: "router-1", target: "tool-1", sourceHandle: "a" },
      { id: "e3", source: "router-1", target: "llm-1", sourceHandle: "b" },
      { id: "e4", source: "tool-1", target: "output-1" },
      { id: "e5", source: "llm-1", target: "output-1" },
    ],
  },
  {
    id: "multi-agent",
    name: "Multi-Agent System",
    nameKo: "멀티 에이전트 시스템",
    description: "Multiple specialized agents working together",
    descriptionKo: "여러 전문 에이전트가 협업하는 시스템",
    category: "custom",
    nodes: [
      createAgentNode({ type: "input", position: { x: 100, y: 250 } }),
      createAgentNode({ type: "router", position: { x: 300, y: 250 } }),
      createAgentNode({ type: "llm", position: { x: 500, y: 100 } }),
      createAgentNode({ type: "llm", position: { x: 500, y: 250 } }),
      createAgentNode({ type: "llm", position: { x: 500, y: 400 } }),
      createAgentNode({ type: "evaluator", position: { x: 700, y: 250 } }),
      createAgentNode({ type: "output", position: { x: 900, y: 250 } }),
    ],
    edges: [
      { id: "e1", source: "input-1", target: "router-1" },
      { id: "e2", source: "router-1", target: "llm-1", sourceHandle: "a" },
      { id: "e3", source: "router-1", target: "llm-2", sourceHandle: "b" },
      { id: "e4", source: "router-1", target: "llm-3", sourceHandle: "c" },
      { id: "e5", source: "llm-1", target: "evaluator-1" },
      { id: "e6", source: "llm-2", target: "evaluator-1" },
      { id: "e7", source: "llm-3", target: "evaluator-1" },
      { id: "e8", source: "evaluator-1", target: "output-1" },
    ],
  },
]

// Get category label
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    core: "코어",
    memory: "메모리",
    tools: "도구",
    io: "입출력",
    control: "제어",
  }
  return labels[category] || category
}
