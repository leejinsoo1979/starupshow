"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Wrench } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function ToolNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<Wrench className="w-5 h-5" />}
      color="#ec4899"
      bgColor="#ec489910"
      borderColor="#ec489940"
      inputHandles={1}
      outputHandles={1}
    />
  )
}

export const ToolNode = memo(ToolNodeComponent)
