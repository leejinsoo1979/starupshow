"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Clock } from "lucide-react"
import { BaseNode } from "./BaseNode"
import type { NodeData } from "@/lib/workflow"

function DelayNodeComponent(props: NodeProps<NodeData>) {
  const formatDelay = () => {
    const ms = props.data.delayMs || 1000
    const unit = props.data.delayUnit || "ms"

    switch (unit) {
      case "s":
        return `${ms / 1000}초`
      case "m":
        return `${ms / 60000}분`
      case "h":
        return `${ms / 3600000}시간`
      default:
        return `${ms}ms`
    }
  }

  return (
    <BaseNode
      {...props}
      icon={<Clock className="w-4 h-4" />}
      color="#64748b"
    >
      <div className="flex items-center gap-2">
        <span className="text-zinc-500">대기:</span>
        <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 rounded text-xs">
          {formatDelay()}
        </span>
      </div>
    </BaseNode>
  )
}

export const DelayNode = memo(DelayNodeComponent)
