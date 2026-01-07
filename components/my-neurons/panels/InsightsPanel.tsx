'use client'

import { useMemo } from 'react'
import { useMyNeuronsStore } from '@/lib/my-neurons/store'
import { NODE_COLORS, STATUS_COLORS, NODE_ICONS } from '@/lib/my-neurons/constants'
import type { BottleneckInsight, MyNeuronNode } from '@/lib/my-neurons/types'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  TrendingUp,
  ChevronRight,
  Flame,
  Clock,
} from 'lucide-react'

interface InsightsPanelProps {
  bottlenecks: BottleneckInsight[]
  priorities: MyNeuronNode[]
}

export function InsightsPanel({ bottlenecks, priorities }: InsightsPanelProps) {
  const selectNode = useMyNeuronsStore((s) => s.selectNode)
  const focusOnNode = useMyNeuronsStore((s) => s.focusOnNode)

  const handleNodeClick = (nodeId: string) => {
    selectNode(nodeId, false)
    focusOnNode(nodeId)
  }

  const severityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const criticalCount = bottlenecks.filter((b) => b.severity === 'critical').length
  const warningCount = bottlenecks.filter((b) => b.severity === 'warning').length

  return (
    <div className="h-full flex flex-col bg-zinc-900/95 text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-100">인사이트</h2>
        <p className="text-xs text-zinc-500 mt-0.5">병목과 우선순위</p>
      </div>

      {/* Summary Stats */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <Flame className="w-4 h-4 text-red-500" />
            <div>
              <div className="text-lg font-bold text-red-400">{criticalCount}</div>
              <div className="text-[10px] text-red-400/70">긴급</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <div>
              <div className="text-lg font-bold text-amber-400">{warningCount}</div>
              <div className="text-[10px] text-amber-400/70">주의</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Bottlenecks Section */}
        <div className="px-4 py-3">
          <h3 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            병목 ({bottlenecks.length})
          </h3>

          {bottlenecks.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">
              병목이 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {bottlenecks.slice(0, 10).map((bottleneck) => (
                <button
                  key={bottleneck.id}
                  onClick={() => handleNodeClick(bottleneck.nodeId)}
                  className={cn(
                    'w-full p-3 rounded-lg text-left transition-all',
                    'hover:bg-zinc-800/50 border',
                    bottleneck.severity === 'critical'
                      ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                      : bottleneck.severity === 'warning'
                      ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                      : 'bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {severityIcon(bottleneck.severity)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {bottleneck.message}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {bottleneck.suggestion}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priorities Section */}
        <div className="px-4 py-3 border-t border-zinc-800">
          <h3 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            우선순위 TOP 10
          </h3>

          <div className="space-y-1">
            {priorities.slice(0, 10).map((node, index) => (
              <button
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: NODE_COLORS[node.type] + '20',
                    color: NODE_COLORS[node.type],
                  }}
                >
                  {index + 1}
                </span>
                <span className="text-lg">{NODE_ICONS[node.type]}</span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm text-zinc-200 truncate">{node.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {node.daysUntilDeadline !== undefined && (
                      <span
                        className={cn(
                          'text-[10px] flex items-center gap-0.5',
                          node.daysUntilDeadline <= 3
                            ? 'text-red-400'
                            : node.daysUntilDeadline <= 7
                            ? 'text-amber-400'
                            : 'text-zinc-500'
                        )}
                      >
                        <Clock className="w-3 h-3" />
                        D-{node.daysUntilDeadline}
                      </span>
                    )}
                    {node.progress !== undefined && (
                      <span className="text-[10px] text-zinc-500">
                        {node.progress}%
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
