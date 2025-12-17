'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Clock,
  Bot,
  User,
  Link2,
  Sparkles,
  Brain,
  ChevronRight,
  Loader2,
  Hash,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import type { ImmutableMemoryRecord, MemoryEventType, MemoryAnalysis } from '@/types/memory'
import type { AccentColor } from '@/stores/themeStore'

interface EventTypeConfig {
  label: string
  icon: React.ElementType
  color: string
}

interface MemoryDetailModalProps {
  memory: ImmutableMemoryRecord
  onClose: () => void
  eventTypeConfig: Record<MemoryEventType, EventTypeConfig>
  accentColor: { id: AccentColor; name: string; color: string; hoverColor: string; rgb: string }
}

interface MemoryDetail {
  memory: ImmutableMemoryRecord
  embedding?: unknown
  analysis?: MemoryAnalysis
  chain?: ImmutableMemoryRecord[]
  similar?: ImmutableMemoryRecord[]
}

export function MemoryDetailModal({
  memory,
  onClose,
  eventTypeConfig,
  accentColor,
}: MemoryDetailModalProps) {
  const [detail, setDetail] = useState<MemoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'analysis' | 'chain' | 'similar'>('content')

  const config = eventTypeConfig[memory.event_type]
  const Icon = config?.icon || ChevronRight

  useEffect(() => {
    fetchDetail()
  }, [memory.id])

  const fetchDetail = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/memory/${memory.id}?include_analysis=true&include_chain=true&include_similar=true`
      )
      if (res.ok) {
        const { data } = await res.json()
        setDetail(data)
      }
    } catch (err) {
      console.error('Memory detail fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(memory.raw_content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${config?.color || '#64748b'}20` }}
            >
              <Icon className="w-6 h-6" style={{ color: config?.color || '#64748b' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${config?.color || '#64748b'}20`,
                    color: config?.color || '#64748b',
                  }}
                >
                  {config?.label || memory.event_type}
                </span>
                {memory.role && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    {memory.role === 'assistant' || memory.role === 'agent' ? (
                      <Bot className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    {memory.role === 'assistant' || memory.role === 'agent' ? '에이전트' : '사용자'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                <Clock className="w-3.5 h-3.5" />
                {formatDateTime(memory.timestamp)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-zinc-200 dark:border-zinc-800">
          {[
            { id: 'content', label: '내용' },
            { id: 'analysis', label: 'AI 분석' },
            { id: 'chain', label: '대화 체인' },
            { id: 'similar', label: '유사 기억' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-current text-zinc-900 dark:text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
              style={activeTab === tab.id ? { color: accentColor.color } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {/* Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-6">
                  {/* Category */}
                  {memory.context?.category && (
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {memory.context.category}
                      </h3>
                    </div>
                  )}

                  {/* Main Content */}
                  <div className="relative">
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-zinc-500" />
                        )}
                      </button>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 pr-14">
                      <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {memory.raw_content}
                      </p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Memory ID */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                        <Hash className="w-3.5 h-3.5" />
                        메모리 ID
                      </div>
                      <code className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                        {memory.id}
                      </code>
                    </div>

                    {/* Agent */}
                    {memory.source_agent && (
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                          <Bot className="w-3.5 h-3.5" />
                          에이전트
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                          {memory.source_agent}
                        </p>
                      </div>
                    )}

                    {/* Conversation */}
                    {memory.context?.conversation_id && (
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                          <Link2 className="w-3.5 h-3.5" />
                          대화 ID
                        </div>
                        <code className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                          {memory.context.conversation_id.slice(0, 12)}...
                        </code>
                      </div>
                    )}

                    {/* Parent Memory */}
                    {memory.parent_id && (
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                          <ExternalLink className="w-3.5 h-3.5" />
                          상위 메모리
                        </div>
                        <code className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                          {memory.parent_id.slice(0, 12)}...
                        </code>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {memory.context?.tags && Array.isArray(memory.context.tags) && memory.context.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        태그
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {memory.context.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  {detail?.analysis ? (
                    <>
                      {/* Importance Score */}
                      {detail.analysis.importance_score !== undefined && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              중요도 점수
                            </h4>
                            <span
                              className="text-2xl font-bold"
                              style={{ color: accentColor.color }}
                            >
                              {Math.round(detail.analysis.importance_score * 100)}%
                            </span>
                          </div>
                          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${detail.analysis.importance_score * 100}%`,
                                backgroundColor: accentColor.color,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Sentiment */}
                      {detail.analysis.sentiment && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            감정 분석
                          </h4>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              {detail.analysis.sentiment.label}
                            </span>
                            <span className="text-sm text-zinc-500">
                              신뢰도: {Math.round(Math.abs(detail.analysis.sentiment.score) * 100)}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Key Points */}
                      {detail.analysis.key_points && detail.analysis.key_points.length > 0 && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                            핵심 포인트
                          </h4>
                          <ul className="space-y-2">
                            {detail.analysis.key_points.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Sparkles
                                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                                  style={{ color: accentColor.color }}
                                />
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                  {point}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Summary */}
                      {detail.analysis.summary && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            요약
                          </h4>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {detail.analysis.summary}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                      <Brain className="w-12 h-12 mb-4 opacity-50" />
                      <p>아직 AI 분석이 생성되지 않았습니다</p>
                    </div>
                  )}
                </div>
              )}

              {/* Chain Tab */}
              {activeTab === 'chain' && (
                <div className="space-y-4">
                  {detail?.chain && detail.chain.length > 0 ? (
                    detail.chain.map((m) => {
                      const mConfig = eventTypeConfig[m.event_type]
                      const MIcon = mConfig?.icon || ChevronRight
                      return (
                        <div
                          key={m.id}
                          className={`bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 ${
                            m.id === memory.id ? 'ring-2' : ''
                          }`}
                          style={m.id === memory.id ? { borderColor: accentColor.color, borderWidth: '2px' } : {}}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${mConfig?.color || '#64748b'}20` }}
                            >
                              <MIcon
                                className="w-4 h-4"
                                style={{ color: mConfig?.color || '#64748b' }}
                              />
                            </div>
                            <div className="flex-1">
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: `${mConfig?.color || '#64748b'}20`,
                                  color: mConfig?.color || '#64748b',
                                }}
                              >
                                {mConfig?.label || m.event_type}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-500">
                              {new Date(m.timestamp).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {m.raw_content}
                          </p>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                      <Link2 className="w-12 h-12 mb-4 opacity-50" />
                      <p>대화 체인이 없습니다</p>
                    </div>
                  )}
                </div>
              )}

              {/* Similar Tab */}
              {activeTab === 'similar' && (
                <div className="space-y-4">
                  {detail?.similar && detail.similar.length > 0 ? (
                    detail.similar.map((m) => {
                      const mConfig = eventTypeConfig[m.event_type]
                      const MIcon = mConfig?.icon || ChevronRight
                      return (
                        <div
                          key={m.id}
                          className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${mConfig?.color || '#64748b'}20` }}
                            >
                              <MIcon
                                className="w-4 h-4"
                                style={{ color: mConfig?.color || '#64748b' }}
                              />
                            </div>
                            <div className="flex-1">
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: `${mConfig?.color || '#64748b'}20`,
                                  color: mConfig?.color || '#64748b',
                                }}
                              >
                                {mConfig?.label || m.event_type}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-500">
                              {new Date(m.timestamp).toLocaleDateString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {m.raw_content}
                          </p>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                      <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                      <p>유사한 기억이 없습니다</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
