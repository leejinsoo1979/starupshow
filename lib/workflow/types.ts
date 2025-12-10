import type { Node } from "reactflow"

export interface NodeData {
  label: string
  description?: string
  required?: boolean

  // Input node properties
  dataSource?: "manual" | "api" | "database" | "file" | "webhook"
  sampleData?: string

  // Output node properties
  outputType?: "console" | "api" | "database" | "file" | "notification"
  outputFormat?: "json" | "csv" | "xml" | "text"

  // Process node properties
  processType?: "transform" | "filter" | "aggregate" | "sort" | "merge"
  processConfig?: string

  // Conditional node properties
  condition?: string
  trueLabel?: string
  falseLabel?: string

  // Code node properties
  codeLanguage?: "javascript" | "typescript" | "python"
  code?: string

  // AI node properties
  aiModel?: "gpt-4" | "gpt-3.5" | "claude"
  aiPrompt?: string
  aiTemperature?: number

  // Delay node properties
  delayMs?: number
  delayUnit?: "ms" | "s" | "m" | "h"

  // HTTP node properties
  httpMethod?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  httpUrl?: string
  httpHeaders?: string
  httpBody?: string

  // Notification node properties
  notificationType?: "email" | "slack" | "webhook"
  notificationTarget?: string
  notificationMessage?: string
}

export type WorkflowNode = Node<NodeData>

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  label?: string
  data?: Record<string, unknown>
}

export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: Date
  updatedAt: Date
  status: "draft" | "active" | "paused" | "error"
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: "pending" | "running" | "completed" | "failed"
  startedAt: Date
  completedAt?: Date
  logs: ExecutionLog[]
  result?: unknown
  error?: string
}

export interface ExecutionLog {
  nodeId: string
  timestamp: Date
  level: "info" | "warn" | "error" | "debug"
  message: string
  data?: unknown
}

export type NodeType =
  | "input"
  | "output"
  | "process"
  | "conditional"
  | "code"
  | "ai"
  | "delay"
  | "http"
  | "notification"
  | "trigger"

export interface NodeTypeConfig {
  type: NodeType
  label: string
  description: string
  icon: string
  color: string
  category: "input" | "process" | "output" | "control" | "integration"
  disabled?: boolean
}
