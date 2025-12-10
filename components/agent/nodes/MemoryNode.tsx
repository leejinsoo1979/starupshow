"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Database } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function MemoryNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<Database className="w-5 h-5" />}
      color="#06b6d4"
      bgColor="#06b6d410"
      borderColor="#06b6d440"
      inputHandles={1}
      outputHandles={1}
    />
  )
}

export const MemoryNode = memo(MemoryNodeComponent)
