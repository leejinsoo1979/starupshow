'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, MessageSquare, Trash2, Calendar, ChevronRight } from 'lucide-react'

interface ConversationGroup {
  date: string
  messages: any[]
  messageCount: number
}

interface ChatHistoryViewProps {
  agentId: string
  isDark: boolean
}

export function ChatHistoryView({ agentId, isDark }: ChatHistoryViewProps) {
  const [conversations, setConversations] = useState<ConversationGroup[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deletingDate, setDeletingDate] = useState<string | null>(null)

  // 날짜별 대화 기록 가져오기
  const fetchHistory = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/agents/${agentId}/history`)
      if (res.ok) {
        const { data } = await res.json()
        if (data && data.length > 0) {
          // 날짜별로 그룹화
          const grouped = data.reduce((acc: any, msg: any) => {
            const date = new Date(msg.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
            if (!acc[date]) acc[date] = []
            acc[date].push(msg)
            return acc
          }, {})

          // 날짜 목록 생성 (최신순)
          const dateList = Object.keys(grouped).sort((a, b) => {
            return new Date(b).getTime() - new Date(a).getTime()
          })

          setConversations(dateList.map(date => ({
            date,
            messages: grouped[date],
            messageCount: grouped[date].length,
          })))
        } else {
          setConversations([])
        }
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [agentId])

  // 전체 대화 기록 삭제
  const handleDeleteAll = async () => {
    if (!confirm('모든 대화 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return

    try {
      setDeleting(true)
      const res = await fetch(`/api/agents/${agentId}/history`, { method: 'DELETE' })
      if (res.ok) {
        setConversations([])
        setSelectedDate(null)
      }
    } catch (err) {
      console.error('Failed to delete history:', err)
    } finally {
      setDeleting(false)
    }
  }

  // 특정 날짜의 대화 기록 삭제
  const handleDeleteDate = async (date: string, messages: any[]) => {
    if (!confirm(`${date}의 대화 기록(${messages.length}개)을 삭제하시겠습니까?`)) return

    try {
      setDeletingDate(date)
      const messageIds = messages.map(m => m.id).join(',')
      const res = await fetch(`/api/agents/${agentId}/history?messageIds=${messageIds}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.date !== date))
        if (selectedDate === date) setSelectedDate(null)
      }
    } catch (err) {
      console.error('Failed to delete date history:', err)
    } finally {
      setDeletingDate(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={cn('w-8 h-8 animate-spin', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className={cn(
        'text-center py-12 rounded-xl border',
        isDark ? 'bg-zinc-800/50 border-zinc-800 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-400'
      )}>
        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>아직 대화 기록이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 - 전체 삭제 버튼 */}
      <div className="flex items-center justify-between">
        <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          총 {conversations.reduce((acc, c) => acc + c.messageCount, 0)}개의 메시지
        </p>
        <button
          onClick={handleDeleteAll}
          disabled={deleting}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
            isDark
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : 'bg-red-50 text-red-500 hover:bg-red-100'
          )}
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          전체 삭제
        </button>
      </div>

      {/* 날짜별 대화 목록 */}
      {conversations.map((conv) => (
        <div
          key={conv.date}
          className={cn(
            'rounded-xl border overflow-hidden',
            isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-white border-zinc-200'
          )}
        >
          {/* 날짜 헤더 */}
          <div
            className={cn(
              'px-4 py-3 flex items-center justify-between transition-colors',
              isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'
            )}
          >
            <button
              onClick={() => setSelectedDate(selectedDate === conv.date ? null : conv.date)}
              className="flex items-center gap-3 flex-1"
            >
              <Calendar className={cn('w-5 h-5', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
              <span className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                {conv.date}
              </span>
              <span className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                {conv.messageCount}개 메시지
              </span>
              <ChevronRight
                className={cn(
                  'w-5 h-5 transition-transform',
                  isDark ? 'text-zinc-500' : 'text-zinc-400',
                  selectedDate === conv.date && 'rotate-90'
                )}
              />
            </button>
            {/* 개별 날짜 삭제 버튼 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteDate(conv.date, conv.messages)
              }}
              disabled={deletingDate === conv.date}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark
                  ? 'hover:bg-red-500/20 text-zinc-500 hover:text-red-400'
                  : 'hover:bg-red-50 text-zinc-400 hover:text-red-500'
              )}
              title={`${conv.date} 대화 삭제`}
            >
              {deletingDate === conv.date ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* 메시지 목록 (펼쳐졌을 때) */}
          {selectedDate === conv.date && (
            <div className={cn(
              'border-t px-4 py-3 space-y-3 max-h-96 overflow-y-auto',
              isDark ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50'
            )}>
              {conv.messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] px-3 py-2 rounded-xl text-sm',
                      msg.role === 'user'
                        ? 'bg-accent text-white'
                        : isDark
                          ? 'bg-zinc-800 text-zinc-200'
                          : 'bg-white text-zinc-800 border border-zinc-200'
                    )}
                  >
                    <p className="whitespace-pre-wrap select-text">{msg.content}</p>
                    <p className={cn(
                      'text-xs mt-1 opacity-60',
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    )}>
                      {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
