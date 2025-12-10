"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Code } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function FunctionNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<Code className="w-5 h-5" />}
      color="#64748b"
      bgColor="#64748b10"
      borderColor="#64748b40"
      inputHandles={1}
      outputHandles={1}
    />
  )
}

export const FunctionNode = memo(FunctionNodeComponent)
