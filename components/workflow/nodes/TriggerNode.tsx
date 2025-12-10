"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Zap } from "lucide-react"
import { BaseNode } from "./BaseNode"
import type { NodeData } from "@/lib/workflow"

function TriggerNodeComponent(props: NodeProps<NodeData>) {
  return (
    <BaseNode
      {...props}
      icon={<Zap className="w-4 h-4" />}
      color="#22c55e"
      showTargetHandle={false}
    >
      <div className="flex items-center gap-2">
        <span className="text-zinc-500">타입:</span>
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
          {props.data.dataSource || "webhook"}
        </span>
      </div>
    </BaseNode>
  )
}

export const TriggerNode = memo(TriggerNodeComponent)
