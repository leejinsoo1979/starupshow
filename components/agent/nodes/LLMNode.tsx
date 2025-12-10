"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Brain } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function LLMNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<Brain className="w-5 h-5" />}
      color="#8b5cf6"
      bgColor="#8b5cf610"
      borderColor="#8b5cf640"
      inputHandles={1}
      outputHandles={1}
    />
  )
}

export const LLMNode = memo(LLMNodeComponent)
