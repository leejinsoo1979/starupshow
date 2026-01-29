'use client'

import { Bot, X, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageModalProps {
  isDark: boolean
  agent: {
    id: string
    name: string
    avatar_url?: string | null
  } | null
  avatarUrl?: string
  message: string
  setMessage: (value: string) => void
  isLoading: boolean
  onClose: () => void
  onSubmit: () => void
}

export function MessageModal({
  isDark,
  agent,
  avatarUrl,
  message,
  setMessage,
  isLoading,
  onClose,
  onSubmit,
}: MessageModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={cn(
          'w-full max-w-md p-6 rounded-2xl shadow-xl',
          isDark ? 'bg-zinc-900' : 'bg-white'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
            {avatarUrl || agent?.avatar_url ? (
              <img
                src={avatarUrl || agent?.avatar_url || undefined}
                alt={agent?.name || '에이전트'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={cn('w-full h-full flex items-center justify-center', isDark ? 'bg-zinc-800' : 'bg-zinc-200')}>
                <Bot className="w-7 h-7 text-accent" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
              {agent?.name}에게 메시지
            </h3>
            <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              메시지를 입력하고 보내세요
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 메시지 입력 */}
        <div className="mb-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`${agent?.name}에게 전달할 메시지를 입력하세요...`}
            className={cn(
              'w-full h-32 px-4 py-3 rounded-xl border resize-none text-sm',
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
                : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
            )}
            autoFocus
          />
        </div>

        {/* 버튼들 */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              onClose()
              setMessage('')
            }}
            className={cn(
              'flex-1 py-3 rounded-xl font-medium transition-colors',
              isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            )}
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={!message.trim() || isLoading}
            className={cn(
              'flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
              message.trim()
                ? 'bg-accent text-white hover:bg-accent/90'
                : isDark
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            보내기
          </button>
        </div>
      </div>
    </div>
  )
}
