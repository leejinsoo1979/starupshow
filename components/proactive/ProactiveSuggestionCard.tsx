'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import type { ProactiveSuggestion, SuggestionPriority, SuggestionType } from '@/lib/proactive/types'
import {
  Lightbulb,
  Bell,
  Heart,
  Wrench,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface ProactiveSuggestionCardProps {
  suggestion: ProactiveSuggestion
  onAccept?: (id: string, executeAction?: boolean) => void
  onDismiss?: (id: string, reason?: string) => void
  showActions?: boolean
  compact?: boolean
  className?: string
}

// ============================================================================
// Helpers
// ============================================================================

const priorityConfig: Record<SuggestionPriority, { color: string; icon: React.ReactNode }> = {
  low: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: null },
  medium: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: <Clock className="w-3 h-3" /> },
  high: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300', icon: <Zap className="w-3 h-3" /> },
  urgent: { color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', icon: <AlertTriangle className="w-3 h-3" /> },
}

const typeConfig: Record<SuggestionType, { icon: React.ReactNode; label: string; labelKr: string }> = {
  task_reminder: { icon: <Bell className="w-4 h-4" />, label: 'Task Reminder', labelKr: '작업 알림' },
  proactive_offer: { icon: <Lightbulb className="w-4 h-4" />, label: 'Suggestion', labelKr: '제안' },
  relationship_nudge: { icon: <Heart className="w-4 h-4" />, label: 'Relationship', labelKr: '관계' },
  skill_suggestion: { icon: <Wrench className="w-4 h-4" />, label: 'Skill', labelKr: '스킬' },
  self_improvement: { icon: <Sparkles className="w-4 h-4" />, label: 'Improvement', labelKr: '개선' },
  error_alert: { icon: <AlertTriangle className="w-4 h-4" />, label: 'Alert', labelKr: '알림' },
  insight_share: { icon: <MessageSquare className="w-4 h-4" />, label: 'Insight', labelKr: '인사이트' },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return '방금'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  return `${diffDays}일 전`
}

// ============================================================================
// Component
// ============================================================================

export function ProactiveSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  showActions = true,
  compact = false,
  className,
}: ProactiveSuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const typeInfo = typeConfig[suggestion.suggestionType]
  const priorityInfo = priorityConfig[suggestion.priority]

  const handleAccept = async (executeAction = false) => {
    if (!onAccept) return
    setIsLoading(true)
    try {
      await onAccept(suggestion.id, executeAction)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = async () => {
    if (!onDismiss) return
    setIsLoading(true)
    try {
      await onDismiss(suggestion.id)
    } finally {
      setIsLoading(false)
    }
  }

  // Compact mode for notification lists
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg',
          'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm',
          'border border-gray-200 dark:border-zinc-700',
          'hover:border-accent/50 transition-colors',
          className
        )}
      >
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          suggestion.priority === 'urgent' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' :
          suggestion.priority === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400' :
          'bg-accent/10 text-accent'
        )}>
          {typeInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {suggestion.titleKr}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {formatTimeAgo(suggestion.createdAt)}
          </p>
        </div>
        {showActions && (
          <div className="flex-shrink-0 flex gap-1">
            <button
              onClick={() => handleAccept(false)}
              disabled={isLoading}
              className="p-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleDismiss}
              disabled={isLoading}
              className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    )
  }

  // Full card mode
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'rounded-xl overflow-hidden',
        'bg-white dark:bg-zinc-900',
        'border border-gray-200 dark:border-zinc-700',
        'shadow-lg shadow-black/5 dark:shadow-black/20',
        suggestion.priority === 'urgent' && 'ring-2 ring-red-500/50',
        suggestion.priority === 'high' && 'ring-2 ring-orange-500/30',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-accent/10 text-accent'
            )}>
              {typeInfo.icon}
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {suggestion.titleKr}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {typeInfo.labelKr}
                </Badge>
                <Badge className={cn('text-xs', priorityInfo.color)}>
                  {priorityInfo.icon}
                  <span className="ml-1">{suggestion.priority}</span>
                </Badge>
              </div>
            </div>
          </div>

          <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
            {formatTimeAgo(suggestion.createdAt)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {suggestion.messageKr}
        </p>

        {/* Confidence Score */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                suggestion.confidenceScore >= 80 ? 'bg-green-500' :
                suggestion.confidenceScore >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
              )}
              style={{ width: `${suggestion.confidenceScore}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {suggestion.confidenceScore}% 확신
          </span>
        </div>

        {/* Expandable Context */}
        {suggestion.context && Object.keys(suggestion.context).length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              상세 정보
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <pre className="mt-2 p-2 text-xs bg-gray-50 dark:bg-zinc-800 rounded-md overflow-x-auto text-zinc-600 dark:text-zinc-400">
                    {JSON.stringify(suggestion.context, null, 2)}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="p-4 pt-0 flex items-center gap-2">
          {suggestion.suggestedAction && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => handleAccept(true)}
              isLoading={isLoading}
              leftIcon={<Zap className="w-4 h-4" />}
            >
              실행하기
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleAccept(false)}
            isLoading={isLoading}
          >
            확인
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            isLoading={isLoading}
          >
            무시
          </Button>
        </div>
      )}
    </motion.div>
  )
}

export default ProactiveSuggestionCard
