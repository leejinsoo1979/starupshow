"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Zap } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

function ActivepiecesNodeComponent(props: NodeProps<AgentNodeData>) {
  return (
    <BaseAgentNode
      {...props}
      icon={<Zap className="w-5 h-5" />}
      color="#6366f1"
      bgColor="#6366f110"
      borderColor="#6366f140"
      inputHandles={1}
      outputHandles={1}
    >
      <div className="flex flex-col gap-2">
        {/* Flow Info */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider">Flow:</label>
          <div className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono truncate">
            {props.data.activepiecesFlowName || props.data.activepiecesFlowId || "선택되지 않음"}
          </div>
        </div>

        {/* Trigger Type */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            props.data.activepiecesTriggerType === "webhook"
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
          }`}>
            <Zap className="w-3 h-3" />
            {props.data.activepiecesTriggerType === "webhook" ? "Webhook" : "Manual"}
          </span>
          {props.data.activepiecesWaitForCompletion && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              동기
            </span>
          )}
        </div>

        {/* Webhook URL (if webhook type) */}
        {props.data.activepiecesTriggerType === "webhook" && props.data.activepiecesWebhookUrl && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider">Webhook:</label>
            <div className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
              {props.data.activepiecesWebhookUrl}
            </div>
          </div>
        )}
      </div>
    </BaseAgentNode>
  )
}

export const ActivepiecesNode = memo(ActivepiecesNodeComponent)
