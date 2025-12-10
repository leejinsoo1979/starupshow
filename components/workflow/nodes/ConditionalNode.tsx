"use client"

import { memo } from "react"
import { NodeProps, Position } from "reactflow"
import { GitBranch } from "lucide-react"
import { BaseNode } from "./BaseNode"
import type { NodeData } from "@/lib/workflow"

function ConditionalNodeComponent(props: NodeProps<NodeData>) {
  return (
    <BaseNode
      {...props}
      icon={<GitBranch className="w-4 h-4" />}
      color="#f59e0b"
      showSourceHandle={false}
      sourceHandles={[
        {
          id: "true",
          position: Position.Bottom,
          label: props.data.trueLabel || "Yes",
          style: { left: "25%" },
        },
        {
          id: "false",
          position: Position.Bottom,
          label: props.data.falseLabel || "No",
          style: { left: "75%" },
        },
      ]}
    >
      <div className="space-y-2">
        <div className="text-zinc-500 text-[10px]">조건식:</div>
        <div className="p-2 bg-zinc-800 rounded font-mono text-amber-400 text-[11px]">
          {props.data.condition || "data.value > 0"}
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-green-400">{props.data.trueLabel || "Yes"} →</span>
          <span className="text-red-400">← {props.data.falseLabel || "No"}</span>
        </div>
      </div>
    </BaseNode>
  )
}

export const ConditionalNode = memo(ConditionalNodeComponent)
