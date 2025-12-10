"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Search } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function RAGNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<Search className="w-5 h-5" />}
      color="#10b981"
      bgColor="#10b98110"
      borderColor="#10b98140"
      inputHandles={1}
      outputHandles={1}
    />
  )
}

export const RAGNode = memo(RAGNodeComponent)
