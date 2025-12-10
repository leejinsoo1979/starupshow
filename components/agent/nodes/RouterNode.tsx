"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { GitBranch } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function RouterNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<GitBranch className="w-5 h-5" />}
      color="#f59e0b"
      bgColor="#f59e0b10"
      borderColor="#f59e0b40"
      inputHandles={1}
      outputHandles={3}
    />
  )
}

export const RouterNode = memo(RouterNodeComponent)
