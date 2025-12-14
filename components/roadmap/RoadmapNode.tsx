'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Loader2,
  Lightbulb,
  Palette,
  Code,
  TestTube,
  FileText,
  Search,
  Database,
  Settings
} from 'lucide-react'
import type { RoadmapNodeStatus, NodeAgentType, AutomationLevel } from '@/types/database'

interface RoadmapNodeData {
  id: string
  title: string
  description?: string
  status: RoadmapNodeStatus
  agent_type: NodeAgentType
  automation_level: AutomationLevel
  priority: number
  assignee?: { id: string; name: string; avatar_url?: string }
  assigned_agent?: { id: string; name: string; avatar_url?: string }
  ai_suggestion?: string
  estimated_hours?: number
  onClick?: (id: string) => void
}

const statusConfig: Record<RoadmapNodeStatus, {
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  label: string
}> = {
  pending: {
    icon: Clock,
    color: 'text-gray-400',
    bgColor: 'bg-gray-900/50',
    borderColor: 'border-gray-700',
    label: '대기 중'
  },
  ready: {
    icon: Play,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-950/30',
    borderColor: 'border-cyan-500/50',
    label: '실행 가능'
  },
  running: {
    icon: Loader2,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-950/30',
    borderColor: 'border-yellow-500/50',
    label: '실행 중'
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-950/30',
    borderColor: 'border-green-500/50',
    label: '완료'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-950/30',
    borderColor: 'border-red-500/50',
    label: '실패'
  },
  paused: {
    icon: Pause,
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/30',
    borderColor: 'border-orange-500/50',
    label: '일시정지'
  },
}

const agentTypeConfig: Record<NodeAgentType, {
  icon: React.ElementType
  label: string
  color: string
}> = {
  planner: { icon: Lightbulb, label: '기획', color: 'text-purple-400' },
  designer: { icon: Palette, label: '디자인', color: 'text-pink-400' },
  developer: { icon: Code, label: '개발', color: 'text-blue-400' },
  qa: { icon: TestTube, label: 'QA', color: 'text-green-400' },
  content: { icon: FileText, label: '콘텐츠', color: 'text-yellow-400' },
  research: { icon: Search, label: '리서치', color: 'text-cyan-400' },
  data: { icon: Database, label: '데이터', color: 'text-orange-400' },
  general: { icon: Settings, label: '일반', color: 'text-gray-400' },
}

const automationBadge: Record<AutomationLevel, { label: string; color: string }> = {
  full: { label: '자동', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  assisted: { label: 'AI보조', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  manual: { label: '수동', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
}

function RoadmapNodeComponent({ data, selected }: NodeProps<RoadmapNodeData>) {
  const status = statusConfig[data.status]
  const agentType = agentTypeConfig[data.agent_type]
  const automation = automationBadge[data.automation_level]
  const StatusIcon = status.icon
  const AgentIcon = agentType.icon

  const handleClick = () => {
    data.onClick?.(data.id)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'min-w-[200px] max-w-[280px] rounded-lg border-2 p-3 cursor-pointer transition-all duration-200',
        status.bgColor,
        status.borderColor,
        selected && 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-950',
        'hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/10'
      )}
    >
      {/* Target Handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-400 hover:!bg-cyan-500 hover:!border-cyan-400 transition-colors"
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn('p-1.5 rounded-md', status.bgColor)}>
            <StatusIcon className={cn('w-4 h-4', status.color, data.status === 'running' && 'animate-spin')} />
          </div>
          <span className="text-xs text-gray-500 truncate">{status.label}</span>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border', automation.color)}>
          {automation.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">
        {data.title}
      </h3>

      {/* Description */}
      {data.description && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">
          {data.description}
        </p>
      )}

      {/* Agent Type & Assignee */}
      <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-700/50">
        <div className={cn('flex items-center gap-1', agentType.color)}>
          <AgentIcon className="w-3 h-3" />
          <span>{agentType.label}</span>
        </div>

        {data.assignee ? (
          <div className="flex items-center gap-1.5">
            {data.assignee.avatar_url ? (
              <img
                src={data.assignee.avatar_url}
                alt={data.assignee.name}
                className="w-4 h-4 rounded-full"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300">
                {data.assignee.name.charAt(0)}
              </div>
            )}
            <span className="text-gray-400 truncate max-w-[60px]">{data.assignee.name}</span>
          </div>
        ) : data.assigned_agent ? (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-cyan-900/50 flex items-center justify-center">
              <Settings className="w-2.5 h-2.5 text-cyan-400" />
            </div>
            <span className="text-cyan-400 truncate max-w-[60px]">{data.assigned_agent.name}</span>
          </div>
        ) : null}
      </div>

      {/* AI Suggestion Indicator */}
      {data.ai_suggestion && data.status === 'ready' && (
        <div className="mt-2 pt-2 border-t border-gray-700/50">
          <div className="flex items-center gap-1.5 text-xs text-cyan-400">
            <Lightbulb className="w-3 h-3" />
            <span>AI 추천 대기 중</span>
          </div>
        </div>
      )}

      {/* Estimated Hours */}
      {data.estimated_hours && (
        <div className="absolute -top-2 -right-2 bg-gray-800 border border-gray-600 rounded-full px-1.5 py-0.5 text-[10px] text-gray-300">
          {data.estimated_hours}h
        </div>
      )}

      {/* Source Handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-400 hover:!bg-cyan-500 hover:!border-cyan-400 transition-colors"
      />
    </div>
  )
}

export const RoadmapNode = memo(RoadmapNodeComponent)
