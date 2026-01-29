'use client'

import { Plus, Edit3, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CustomEmotion } from '@/components/agent-detail/utils'

interface AddEmotionModalProps {
  isDark: boolean
  newEmotion: Partial<CustomEmotion>
  setNewEmotion: (emotion: Partial<CustomEmotion>) => void
  keywordInput: string
  setKeywordInput: (value: string) => void
  onAddKeyword: () => void
  onRemoveKeyword: (keyword: string) => void
  onClose: () => void
  onSubmit: () => void
}

export function AddEmotionModal({
  isDark,
  newEmotion,
  setNewEmotion,
  keywordInput,
  setKeywordInput,
  onAddKeyword,
  onRemoveKeyword,
  onClose,
  onSubmit,
}: AddEmotionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={cn(
          'w-full max-w-md mx-4 p-6 rounded-2xl shadow-xl',
          isDark ? 'bg-zinc-900' : 'bg-white'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={cn('text-lg font-semibold mb-4 flex items-center gap-2', isDark ? 'text-white' : 'text-zinc-900')}>
          <Plus className="w-5 h-5 text-pink-500" />
          새 감정 추가
        </h3>

        <div className="space-y-4">
          {/* 이름 */}
          <div>
            <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              감정 이름 *
            </label>
            <input
              type="text"
              value={newEmotion.label || ''}
              onChange={(e) => setNewEmotion({ ...newEmotion, label: e.target.value })}
              placeholder="예: 설렘, 당황, 집중..."
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
              )}
            />
          </div>

          {/* 설명 */}
          <div>
            <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              설명
            </label>
            <input
              type="text"
              value={(newEmotion as any).description || ''}
              onChange={(e) => setNewEmotion({ ...newEmotion, description: e.target.value } as any)}
              placeholder="언제 이 감정이 나타나는지 설명해주세요"
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
              )}
            />
          </div>

          {/* 키워드 */}
          <div>
            <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              감지 키워드 (대화에서 이 단어가 나오면 감정이 활성화됩니다)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAddKeyword()
                  }
                }}
                placeholder="키워드 입력 후 Enter"
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border',
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                )}
              />
              <button
                onClick={onAddKeyword}
                className={cn(
                  'px-3 py-2 rounded-lg',
                  isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
                )}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {(newEmotion.keywords?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newEmotion.keywords?.map((kw, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      'px-2 py-1 rounded-lg text-sm flex items-center gap-1',
                      isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
                    )}
                  >
                    {kw}
                    <button
                      onClick={() => onRemoveKeyword(kw)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-lg text-sm',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
            )}
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 rounded-lg text-sm text-white flex items-center gap-1 bg-pink-500 hover:bg-pink-600 active:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
      </div>
    </div>
  )
}

interface EditEmotionModalProps {
  isDark: boolean
  editingEmotion: CustomEmotion
  setEditingEmotion: (emotion: CustomEmotion | null) => void
  keywordInput: string
  setKeywordInput: (value: string) => void
  onAddKeyword: () => void
  onRemoveKeyword: (keyword: string) => void
  onClose: () => void
  onSubmit: () => void
}

export function EditEmotionModal({
  isDark,
  editingEmotion,
  setEditingEmotion,
  keywordInput,
  setKeywordInput,
  onAddKeyword,
  onRemoveKeyword,
  onClose,
  onSubmit,
}: EditEmotionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={cn(
          'w-full max-w-md mx-4 p-6 rounded-2xl shadow-xl',
          isDark ? 'bg-zinc-900' : 'bg-white'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={cn('text-lg font-semibold mb-4 flex items-center gap-2', isDark ? 'text-white' : 'text-zinc-900')}>
          <Edit3 className="w-5 h-5 text-pink-500" />
          감정 편집
        </h3>

        <div className="space-y-4">
          {/* 이모지 & 이름 */}
          <div className="flex gap-3">
            <div className="w-20">
              <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                이모지 *
              </label>
              <input
                type="text"
                value={editingEmotion.emoji || ''}
                onChange={(e) => setEditingEmotion({ ...editingEmotion, emoji: e.target.value })}
                maxLength={2}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-center text-2xl',
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-white'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                )}
              />
            </div>
            <div className="flex-1">
              <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                이름 *
              </label>
              <input
                type="text"
                value={editingEmotion.label || ''}
                onChange={(e) => setEditingEmotion({ ...editingEmotion, label: e.target.value })}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border',
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-white'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                )}
              />
            </div>
          </div>

          {/* 설명 */}
          <div>
            <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              설명
            </label>
            <input
              type="text"
              value={(editingEmotion as any).description || ''}
              onChange={(e) => setEditingEmotion({ ...editingEmotion, description: e.target.value } as any)}
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-white'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900'
              )}
            />
          </div>

          {/* 키워드 */}
          <div>
            <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              감지 키워드
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAddKeyword()
                  }
                }}
                placeholder="키워드 입력 후 Enter"
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border',
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                )}
              />
              <button
                onClick={onAddKeyword}
                className={cn(
                  'px-3 py-2 rounded-lg',
                  isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
                )}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {(editingEmotion.keywords?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {editingEmotion.keywords?.map((kw, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      'px-2 py-1 rounded-lg text-sm flex items-center gap-1',
                      isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
                    )}
                  >
                    {kw}
                    <button
                      onClick={() => onRemoveKeyword(kw)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-lg text-sm',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
            )}
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={!editingEmotion.label || !editingEmotion.emoji}
            className={cn(
              'px-4 py-2 rounded-lg text-sm text-white flex items-center gap-1',
              editingEmotion.label && editingEmotion.emoji
                ? 'bg-pink-500 hover:bg-pink-600'
                : 'bg-zinc-400 cursor-not-allowed'
            )}
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
