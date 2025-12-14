'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  X,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Edit2,
  Clock,
  User,
  Bot,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { RoadmapNode, RoadmapNodeStatus, AutomationLevel, NodeAgentType } from '@/types/database'

interface NodeDetailPanelProps {
  projectId: string
  nodeId: string
  onClose: () => void
  onUpdate: (node: RoadmapNode) => void
  onDelete: (nodeId: string) => void
}

const statusLabels: Record<RoadmapNodeStatus, string> = {
  pending: '대기 중',
  ready: '실행 가능',
  running: '실행 중',
  completed: '완료',
  failed: '실패',
  paused: '일시정지',
}

const agentTypeLabels: Record<NodeAgentType, string> = {
  planner: '기획',
  designer: '디자인',
  developer: '개발',
  qa: 'QA',
  content: '콘텐츠',
  research: '리서치',
  data: '데이터',
  general: '일반',
}

export function NodeDetailPanel({
  projectId,
  nodeId,
  onClose,
  onUpdate,
  onDelete,
}: NodeDetailPanelProps) {
  const [node, setNode] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch node details
  const fetchNode = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/roadmap/${nodeId}`)
      if (!response.ok) throw new Error('Failed to fetch node')
      const data = await response.json()
      setNode(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, nodeId])

  useEffect(() => {
    fetchNode()
  }, [fetchNode])

  // Execute node
  const handleExecute = async () => {
    try {
      setIsExecuting(true)
      const response = await fetch(`/api/projects/${projectId}/roadmap/${nodeId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_data: {} }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to execute node')
      }

      const result = await response.json()
      await fetchNode() // Refresh node data

      if (result.status === 'awaiting_approval') {
        // AI suggestion ready
      } else if (result.status === 'completed') {
        onUpdate(result)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsExecuting(false)
    }
  }

  // Approve/Reject AI suggestion
  const handleApprove = async (approved: boolean) => {
    try {
      setIsApproving(true)
      const response = await fetch(`/api/projects/${projectId}/roadmap/${nodeId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved,
          output_data: node.ai_analysis?.expected_output,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve')
      }

      await fetchNode()
      onUpdate(node)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsApproving(false)
    }
  }

  // Delete node
  const handleDelete = async () => {
    if (!confirm('이 노드를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/projects/${projectId}/roadmap/${nodeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete node')

      onDelete(nodeId)
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (isLoading) {
    return (
      <div className="absolute right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 p-4 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    )
  }

  if (!node) {
    return (
      <div className="absolute right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 p-4">
        <div className="text-red-400">노드를 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="font-semibold text-white truncate">{node.title}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/50 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
            <div className="text-sm text-red-400">{error}</div>
          </div>
        )}

        {/* Status & Type */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">상태</div>
            <div className="text-sm text-white">{statusLabels[node.status as RoadmapNodeStatus]}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">에이전트 유형</div>
            <div className="text-sm text-white">{agentTypeLabels[node.agent_type as NodeAgentType]}</div>
          </div>
        </div>

        {/* Description */}
        {node.description && (
          <div>
            <div className="text-xs text-gray-500 mb-1">설명</div>
            <p className="text-sm text-gray-300">{node.description}</p>
          </div>
        )}

        {/* Goal */}
        {node.goal && (
          <div>
            <div className="text-xs text-gray-500 mb-1">목표</div>
            <p className="text-sm text-gray-300">{node.goal}</p>
          </div>
        )}

        {/* Assignee */}
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-2">담당</div>
          <div className="flex items-center gap-2">
            {node.assignee ? (
              <>
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-white">{node.assignee.name}</span>
              </>
            ) : node.assigned_agent ? (
              <>
                <Bot className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-400">{node.assigned_agent.name}</span>
              </>
            ) : (
              <span className="text-sm text-gray-500">미배정</span>
            )}
          </div>
        </div>

        {/* Dependencies */}
        {node.dependencies && node.dependencies.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-2">선행 노드</div>
            <div className="space-y-1">
              {node.dependencies.map((dep: any) => (
                <div
                  key={dep.id}
                  className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1.5 text-sm"
                >
                  {dep.source_node?.status === 'completed' ? (
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  ) : (
                    <Clock className="w-3 h-3 text-gray-400" />
                  )}
                  <span className="text-gray-300">{dep.source_node?.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggestion */}
        {node.ai_suggestion && (
          <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-400">AI 추천</span>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {node.ai_suggestion}
            </p>
          </div>
        )}

        {/* AI Analysis */}
        {node.ai_analysis && (
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">AI 분석</div>
            <div className="space-y-2 text-sm text-gray-300">
              {node.ai_analysis.considerations && (
                <div>
                  <div className="text-xs text-gray-500">주의사항</div>
                  <ul className="list-disc list-inside">
                    {node.ai_analysis.considerations.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {node.ai_analysis.next_steps && (
                <div>
                  <div className="text-xs text-gray-500">다음 단계</div>
                  <ul className="list-disc list-inside">
                    {node.ai_analysis.next_steps.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Output Data */}
        {node.output_data && Object.keys(node.output_data).length > 0 && (
          <div className="bg-green-950/30 border border-green-500/30 rounded-lg p-3">
            <div className="text-xs text-green-400 mb-2">결과 데이터</div>
            <pre className="text-xs text-gray-300 overflow-auto">
              {JSON.stringify(node.output_data, null, 2)}
            </pre>
          </div>
        )}

        {/* Execution Logs */}
        {node.logs && node.logs.length > 0 && (
          <div>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 mb-2"
            >
              {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              실행 로그 ({node.logs.length})
            </button>
            {showLogs && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {node.logs.map((log: any) => (
                  <div
                    key={log.id}
                    className={cn(
                      'text-xs px-2 py-1 rounded',
                      log.log_type === 'error' && 'bg-red-950/30 text-red-400',
                      log.log_type === 'info' && 'bg-gray-800 text-gray-400',
                      log.log_type === 'ai_response' && 'bg-cyan-950/30 text-cyan-400',
                      log.log_type === 'user_action' && 'bg-purple-950/30 text-purple-400'
                    )}
                  >
                    <span className="text-gray-600">{new Date(log.created_at).toLocaleTimeString()}</span>
                    {' '}
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        {/* Execute Button */}
        {(node.status === 'ready' || node.status === 'pending') && !node.ai_suggestion && (
          <Button
            onClick={handleExecute}
            disabled={isExecuting || node.status === 'pending'}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {node.status === 'pending' ? '선행 노드 완료 필요' : 'AI 실행'}
          </Button>
        )}

        {/* Approve/Reject Buttons */}
        {node.status === 'ready' && node.ai_suggestion && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleApprove(true)}
              disabled={isApproving}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white gap-2"
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              승인
            </Button>
            <Button
              onClick={() => handleApprove(false)}
              disabled={isApproving}
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-950/30 gap-2"
            >
              <XCircle className="w-4 h-4" />
              거절
            </Button>
          </div>
        )}

        {/* Delete Button */}
        <Button
          onClick={handleDelete}
          variant="ghost"
          className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30 gap-2"
        >
          <Trash2 className="w-4 h-4" />
          노드 삭제
        </Button>
      </div>
    </div>
  )
}
