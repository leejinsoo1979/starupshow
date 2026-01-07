'use client'

import { useMemo } from 'react'
import { useMyNeuronsStore } from '@/lib/my-neurons/store'
import { NODE_COLORS, STATUS_COLORS, NODE_ICONS } from '@/lib/my-neurons/constants'
import type { MyNeuronNode } from '@/lib/my-neurons/types'
import { cn } from '@/lib/utils'
import {
  X,
  ExternalLink,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface NodeInspectorPanelProps {
  node: MyNeuronNode | null
  connectedNodes?: MyNeuronNode[]
  onClose?: () => void
  onNavigate?: (sourceTable: string, sourceId: string) => void
}

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  active: { label: '진행 중', icon: <Play className="w-3.5 h-3.5" /> },
  blocked: { label: '막힘', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  urgent: { label: '긴급', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  waiting: { label: '대기', icon: <Pause className="w-3.5 h-3.5" /> },
  completed: { label: '완료', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  attention: { label: '주의', icon: <Eye className="w-3.5 h-3.5" /> },
}

const TYPE_LABELS: Record<string, string> = {
  self: '나',
  project: '프로젝트',
  task: '할 일',
  doc: '문서',
  person: '팀원',
  agent: '에이전트',
  objective: '목표',
  key_result: '핵심 결과',
  decision: '결정',
  memory: '기억',
  workflow: '워크플로우',
  insight: '인사이트',
  program: '정부지원',
  application: '지원서',
  milestone: '마일스톤',
  budget: '예산',
}

export function NodeInspectorPanel({
  node,
  connectedNodes = [],
  onClose,
  onNavigate,
}: NodeInspectorPanelProps) {
  const selectNode = useMyNeuronsStore((s) => s.selectNode)
  const focusOnNode = useMyNeuronsStore((s) => s.focusOnNode)

  if (!node) {
    return (
      <div className="h-full flex flex-col bg-zinc-900/95 text-zinc-100">
        <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">노드 상세</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          노드를 선택하세요
        </div>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[node.status] || { label: node.status, icon: null }

  const handleConnectedNodeClick = (nodeId: string) => {
    selectNode(nodeId, false)
    focusOnNode(nodeId)
  }

  const handleNavigate = () => {
    onNavigate?.(node.sourceTable, node.sourceId)
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900/95 text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: NODE_COLORS[node.type] + '30' }}
            >
              {NODE_ICONS[node.type]}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 line-clamp-1">
                {node.title}
              </h2>
              <p className="text-xs text-zinc-500">{TYPE_LABELS[node.type]}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Status & Priority */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div
              className={cn(
                'p-2.5 rounded-lg border',
                node.status === 'blocked' || node.status === 'urgent'
                  ? 'bg-red-500/10 border-red-500/30'
                  : node.status === 'completed'
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-zinc-800/50 border-zinc-700/50'
              )}
            >
              <div className="text-[10px] text-zinc-500 mb-1">상태</div>
              <div
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color: STATUS_COLORS[node.status] }}
              >
                {statusInfo.icon}
                {statusInfo.label}
              </div>
            </div>

            {/* Priority */}
            <div className="p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="text-[10px] text-zinc-500 mb-1">우선순위</div>
              <div
                className={cn(
                  'text-sm font-medium',
                  node.priority === 'critical'
                    ? 'text-red-400'
                    : node.priority === 'high'
                    ? 'text-orange-400'
                    : node.priority === 'medium'
                    ? 'text-amber-400'
                    : 'text-zinc-400'
                )}
              >
                {node.priority === 'critical'
                  ? '긴급'
                  : node.priority === 'high'
                  ? '높음'
                  : node.priority === 'medium'
                  ? '보통'
                  : '낮음'}
              </div>
            </div>
          </div>
        </div>

        {/* Progress & Deadline */}
        {(node.progress !== undefined || node.deadline) && (
          <div className="px-4 py-3 border-b border-zinc-800">
            {/* Progress */}
            {node.progress !== undefined && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-500">진행률</span>
                  <span className="text-xs font-medium text-zinc-300">
                    {node.progress}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${node.progress}%`,
                      backgroundColor: NODE_COLORS[node.type],
                    }}
                  />
                </div>
              </div>
            )}

            {/* Deadline */}
            {node.deadline && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar className="w-3.5 h-3.5" />
                  마감일
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300">
                    {format(new Date(node.deadline), 'yyyy.MM.dd', { locale: ko })}
                  </span>
                  {node.daysUntilDeadline !== undefined && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full',
                        node.daysUntilDeadline <= 3
                          ? 'bg-red-500/20 text-red-400'
                          : node.daysUntilDeadline <= 7
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-zinc-700 text-zinc-400'
                      )}
                    >
                      D-{node.daysUntilDeadline}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {node.summary && (
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1.5">설명</div>
            <p className="text-sm text-zinc-300 leading-relaxed">{node.summary}</p>
          </div>
        )}

        {/* Meta Info */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">정보</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">소스</span>
              <span className="text-zinc-400">{node.sourceTable}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">중요도</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      i < node.importance ? 'bg-amber-400' : 'bg-zinc-700'
                    )}
                  />
                ))}
              </div>
            </div>
            {node.createdAt && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">생성일</span>
                <span className="text-zinc-400">
                  {format(new Date(node.createdAt), 'yyyy.MM.dd HH:mm', {
                    locale: ko,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connected Nodes */}
        {connectedNodes.length > 0 && (
          <div className="px-4 py-3">
            <div className="text-xs text-zinc-500 mb-2">
              연결된 노드 ({connectedNodes.length})
            </div>
            <div className="space-y-1">
              {connectedNodes.slice(0, 5).map((cn) => (
                <button
                  key={cn.id}
                  onClick={() => handleConnectedNodeClick(cn.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                    style={{ backgroundColor: NODE_COLORS[cn.type] + '30' }}
                  >
                    {NODE_ICONS[cn.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{cn.title}</p>
                    <p className="text-[10px] text-zinc-500">
                      {TYPE_LABELS[cn.type]}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Navigate to source */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-zinc-800">
        <button
          onClick={handleNavigate}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm text-zinc-300"
        >
          <ExternalLink className="w-4 h-4" />
          원본으로 이동
        </button>
      </div>
    </div>
  )
}
