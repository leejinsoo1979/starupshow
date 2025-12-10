"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Brain } from "lucide-react"
import { BaseNode } from "./BaseNode"
import type { NodeData } from "@/lib/workflow"

function AINodeComponent(props: NodeProps<NodeData>) {
  return (
    <BaseNode
      {...props}
      icon={<Brain className="w-4 h-4" />}
      color="#ec4899"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">모델:</span>
          <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded text-xs">
            {props.data.aiModel || "gpt-4"}
          </span>
        </div>
        {props.data.aiPrompt && (
          <div className="p-2 bg-zinc-800 rounded text-[10px] text-zinc-400 max-h-16 overflow-hidden">
            {props.data.aiPrompt.substring(0, 60)}
            {props.data.aiPrompt.length > 60 && "..."}
          </div>
        )}
        {props.data.aiTemperature !== undefined && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-zinc-500">Temperature:</span>
            <span className="text-zinc-300">{props.data.aiTemperature}</span>
          </div>
        )}
      </div>
    </BaseNode>
  )
}

export const AINode = memo(AINodeComponent)
