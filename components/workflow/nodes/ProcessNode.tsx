"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Settings } from "lucide-react"
import { BaseNode } from "./BaseNode"
import type { NodeData } from "@/lib/workflow"

function ProcessNodeComponent(props: NodeProps<NodeData>) {
  return (
    <BaseNode
      {...props}
      icon={<Settings className="w-4 h-4" />}
      color="#8b5cf6"
    >
      <div className="flex items-center gap-2">
        <span className="text-zinc-500">처리:</span>
        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
          {props.data.processType || "transform"}
        </span>
      </div>
    </BaseNode>
  )
}

export const ProcessNode = memo(ProcessNodeComponent)
