"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { FileOutput } from "lucide-react"
import { BaseNode } from "./BaseNode"
import type { NodeData } from "@/lib/workflow"

function OutputNodeComponent(props: NodeProps<NodeData>) {
  return (
    <BaseNode
      {...props}
      icon={<FileOutput className="w-4 h-4" />}
      color="#10b981"
      showSourceHandle={false}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">대상:</span>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
            {props.data.outputType || "console"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">포맷:</span>
          <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded text-xs">
            {props.data.outputFormat || "json"}
          </span>
        </div>
      </div>
    </BaseNode>
  )
}

export const OutputNode = memo(OutputNodeComponent)
