"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Send } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function OutputNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<Send className="w-5 h-5" />}
      color="#22c55e"
      bgColor="#22c55e10"
      borderColor="#22c55e40"
      inputHandles={1}
      outputHandles={0}
    />
  )
}

export const OutputNode = memo(OutputNodeComponent)
