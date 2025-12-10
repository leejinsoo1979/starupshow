"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Link } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function ChainNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<Link className="w-5 h-5" />}
      color="#6366f1"
      bgColor="#6366f110"
      borderColor="#6366f140"
      inputHandles={1}
      outputHandles={1}
    />
  )
}

export const ChainNode = memo(ChainNodeComponent)
