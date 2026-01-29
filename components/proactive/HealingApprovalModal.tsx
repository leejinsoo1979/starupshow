'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import type { AgentHealingRecord, HealingAction, IssueSeverity } from '@/lib/proactive/types'
import {
  AlertTriangle,
  ShieldCheck,
  Activity,
  Wrench,
  RefreshCw,
  Trash2,
  RotateCcw,
  Server,
  Bell,
  Zap,
  X,
  Check,
  Info,
  AlertCircle,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface HealingApprovalModalProps {
  record: AgentHealingRecord
  isOpen: boolean
  onClose: () => void
  onApprove: (recordId: string) => Promise<void>
  onReject: (recordId: string, reason?: string) => Promise<void>
}

// ============================================================================
// Helpers
// ============================================================================

const severityConfig: Record<IssueSeverity, { color: string; icon: React.ReactNode; label: string }> = {
  low: {
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    icon: <Info className="w-4 h-4" />,
    label: '낮음',
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    icon: <AlertCircle className="w-4 h-4" />,
    label: '중간',
  },
  high: {
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: '높음',
  },
  critical: {
    color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: '심각',
  },
}

const actionTypeConfig: Record<string, { icon: React.ReactNode; label: string; description: string }> = {
  retry_with_backoff: {
    icon: <RefreshCw className="w-4 h-4" />,
    label: '재시도',
    description: '지수 백오프로 작업을 다시 시도합니다',
  },
  refresh_connection: {
    icon: <Activity className="w-4 h-4" />,
    label: '연결 갱신',
    description: 'API 연결을 새로고침합니다',
  },
  clear_cache: {
    icon: <Trash2 className="w-4 h-4" />,
    label: '캐시 삭제',
    description: '캐시된 데이터를 삭제합니다',
  },
  reset_state: {
    icon: <RotateCcw className="w-4 h-4" />,
    label: '상태 초기화',
    description: '에이전트 상태를 초기화합니다',
  },
  use_fallback: {
    icon: <Server className="w-4 h-4" />,
    label: '대체 사용',
    description: '대체 방법으로 전환합니다',
  },
  notify_admin: {
    icon: <Bell className="w-4 h-4" />,
    label: '관리자 알림',
    description: '관리자에게 알림을 보냅니다',
  },
  auto_restart: {
    icon: <Zap className="w-4 h-4" />,
    label: '자동 재시작',
    description: '에이전트를 재시작합니다',
  },
  custom: {
    icon: <Wrench className="w-4 h-4" />,
    label: '커스텀',
    description: '사용자 정의 액션을 실행합니다',
  },
}

const riskLevelColors: Record<string, string> = {
  safe: 'text-green-600 dark:text-green-400',
  low: 'text-blue-600 dark:text-blue-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high: 'text-red-600 dark:text-red-400',
}

// ============================================================================
// Component
// ============================================================================

export function HealingApprovalModal({
  record,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: HealingApprovalModalProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const severityInfo = severityConfig[record.issueSeverity]
  const actions = record.healingAction ? [record.healingAction] : (record.diagnosis?.suggestedActions || [])

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await onApprove(record.id)
      onClose()
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await onReject(record.id, rejectReason || undefined)
      onClose()
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={cn(
                'w-full max-w-lg',
                'bg-white dark:bg-zinc-900',
                'rounded-2xl shadow-2xl',
                'border border-gray-200 dark:border-zinc-700',
                'overflow-hidden'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                  )}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      자가치유 승인 요청
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                      다음 치유 액션을 승인해주세요
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Issue Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    감지된 문제
                  </h3>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 dark:text-zinc-300">
                        {record.issueDescriptionKr || record.issueDescription}
                      </span>
                      <Badge className={cn('text-xs', severityInfo.color)}>
                        {severityInfo.icon}
                        <span className="ml-1">{severityInfo.label}</span>
                      </Badge>
                    </div>

                    {record.diagnosis?.rootCauseKr && (
                      <div className="pt-3 border-t border-gray-200 dark:border-zinc-700">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">근본 원인</p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                          {record.diagnosis.rootCauseKr}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proposed Actions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    제안된 치유 액션
                  </h3>
                  <div className="space-y-2">
                    {actions.map((action, index) => {
                      const config = actionTypeConfig[action.type] || actionTypeConfig.custom
                      return (
                        <div
                          key={index}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg',
                            'bg-gray-50 dark:bg-zinc-800/50',
                            'border border-gray-200 dark:border-zinc-700'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            'bg-accent/10 text-accent'
                          )}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                                {action.descriptionKr || config.label}
                              </span>
                              <span className={cn('text-xs font-medium', riskLevelColors[action.riskLevel])}>
                                위험도: {action.riskLevel}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {config.description}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Rejection reason input */}
                <AnimatePresence>
                  {showRejectInput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          거절 사유 (선택)
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="거절 사유를 입력하세요..."
                          className={cn(
                            'w-full px-3 py-2 rounded-lg',
                            'bg-white dark:bg-zinc-800',
                            'border border-gray-200 dark:border-zinc-700',
                            'text-sm text-zinc-900 dark:text-zinc-100',
                            'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                            'focus:outline-none focus:ring-2 focus:ring-accent/50'
                          )}
                          rows={2}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Warning */}
                <div className={cn(
                  'flex items-start gap-3 p-3 rounded-lg',
                  'bg-yellow-50 dark:bg-yellow-900/20',
                  'border border-yellow-200 dark:border-yellow-800/50'
                )}>
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    <p className="font-medium">주의</p>
                    <p className="text-xs mt-0.5 opacity-90">
                      승인 후 치유 액션이 자동으로 실행됩니다. 실행 전 내용을 확인해주세요.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (showRejectInput) {
                      handleReject()
                    } else {
                      setShowRejectInput(true)
                    }
                  }}
                  isLoading={isRejecting}
                  leftIcon={<X className="w-4 h-4" />}
                >
                  {showRejectInput ? '거절 확인' : '거절'}
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleApprove}
                  isLoading={isApproving}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  승인 및 실행
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default HealingApprovalModal
