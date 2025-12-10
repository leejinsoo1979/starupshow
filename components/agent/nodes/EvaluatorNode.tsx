"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { CheckCircle } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function EvaluatorNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<CheckCircle className="w-5 h-5" />}
      color="#f97316"
      bgColor="#f9731610"
      borderColor="#f9731640"
      inputHandles={1}
      outputHandles={2}
    />
  )
}

export const EvaluatorNode = memo(EvaluatorNodeComponent)
