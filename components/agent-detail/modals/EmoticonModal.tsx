'use client'

import { Smile, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Emoticon {
  id: string
  name: string
  image_url: string
  image_urls: string[]
  category: string
  keywords: string[]
}

interface EmoticonModalProps {
  isDark: boolean
  emoticons: Emoticon[]
  emoticonsLoading: boolean
  onSelect: (emoticon: { image_url: string; name: string }) => void
  onClose: () => void
}

export function EmoticonModal({
  isDark,
  emoticons,
  emoticonsLoading,
  onSelect,
  onClose,
}: EmoticonModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={cn(
          'w-full sm:max-w-md sm:mx-4 p-4 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[70vh] overflow-hidden flex flex-col',
          isDark ? 'bg-zinc-900' : 'bg-white'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn('text-lg font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-zinc-900')}>
            <Smile className="w-5 h-5 text-yellow-500" />
            이모티콘
          </h3>
          <button
            onClick={onClose}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 이모티콘 그리드 */}
        <div className="flex-1 overflow-y-auto">
          {emoticonsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : emoticons.length === 0 ? (
            <div className={cn('text-center py-12', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              <Smile className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-2">이모티콘이 없어요</p>
              <a
                href="/dashboard-group/mypage/emoticons"
                className="text-xs text-accent hover:underline"
                onClick={onClose}
              >
                이모티콘 라이브러리에서 추가하기 →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {emoticons.map((emoticon) => {
                const imageUrls = emoticon.image_urls?.length > 0 ? emoticon.image_urls : [emoticon.image_url]
                return (
                  <button
                    key={emoticon.id}
                    onClick={() => onSelect(emoticon)}
                    className={cn(
                      'aspect-square rounded-xl overflow-hidden transition-transform hover:scale-105 active:scale-95 p-0.5',
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'
                    )}
                    title={emoticon.name}
                  >
                    {imageUrls.length === 1 ? (
                      <img
                        src={imageUrls[0]}
                        alt={emoticon.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-full">
                        {imageUrls.slice(0, 4).map((url, idx) => (
                          <div key={idx} className="rounded-sm overflow-hidden">
                            <img src={url} alt={`${emoticon.name}-${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {imageUrls.length < 4 && Array.from({ length: 4 - imageUrls.length }).map((_, idx) => (
                          <div key={`empty-${idx}`} className={cn('rounded-sm', isDark ? 'bg-zinc-700/50' : 'bg-zinc-200/50')} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
