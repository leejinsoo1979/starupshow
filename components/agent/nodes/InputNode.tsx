"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { MessageSquare } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function InputNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<MessageSquare className="w-5 h-5" />}
      color="#3b82f6"
      bgColor="#3b82f610"
      borderColor="#3b82f640"
      inputHandles={0}
      outputHandles={1}
    />
  )
}

export const InputNode = memo(InputNodeComponent)
