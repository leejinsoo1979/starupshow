'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  Github,
  X,
  Loader2,
  Lock,
  Globe,
  AlertCircle,
} from 'lucide-react'

interface Props {
  defaultName?: string
  onCreated: (repo: {
    owner: string
    name: string
    clone_url: string
    default_branch: string
  }) => void
  onClose: () => void
}

export default function GitHubRepoCreateModal({ defaultName = '', onCreated, onClose }: Props) {
  const [name, setName] = useState(defaultName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  const handleNameChange = (value: string) => {
    // GitHub repo name requirements: alphanumeric, hyphens, underscores
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    setName(sanitized)
    setError(null)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('레포지토리 이름을 입력해주세요')
      return
    }

    if (name.length < 1 || name.length > 100) {
      setError('이름은 1-100자 사이여야 합니다')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          private: isPrivate,
          auto_init: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 422) {
          setError('이미 존재하는 레포지토리 이름입니다')
        } else {
          setError(data.error || '레포지토리 생성에 실패했습니다')
        }
        return
      }

      const data = await res.json()
      onCreated({
        owner: data.repo.owner.login,
        name: data.repo.name,
        clone_url: data.repo.clone_url,
        default_branch: data.repo.default_branch,
      })
    } catch (err) {
      console.error('Failed to create repo:', err)
      setError('레포지토리 생성 중 오류가 발생했습니다')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-xl shadow-2xl ${
          isDark ? 'bg-zinc-900' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="flex items-center gap-3">
            <Github className={`w-5 h-5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`} />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              새 레포지토리 생성
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
            }`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              레포지토리 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="my-awesome-project"
              className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:border-zinc-500'
                  : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-zinc-400'
              }`}
            />
            <p className={`mt-1 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              영문 소문자, 숫자, 하이픈, 언더스코어만 사용 가능
            </p>
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트에 대한 간단한 설명..."
              rows={3}
              className={`w-full px-4 py-2 rounded-lg border outline-none resize-none transition-colors ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:border-zinc-500'
                  : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-zinc-400'
              }`}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              공개 설정
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsPrivate(true)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isPrivate
                    ? isDark
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-green-500 bg-green-50'
                    : isDark
                      ? 'border-zinc-700 hover:border-zinc-600'
                      : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <Lock className={`w-4 h-4 ${isPrivate ? 'text-green-500' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Private</p>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>나만 접근</p>
                </div>
              </button>
              <button
                onClick={() => setIsPrivate(false)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  !isPrivate
                    ? isDark
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-green-500 bg-green-50'
                    : isDark
                      ? 'border-zinc-700 hover:border-zinc-600'
                      : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <Globe className={`w-4 h-4 ${!isPrivate ? 'text-green-500' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Public</p>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>누구나 볼 수 있음</p>
                </div>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${isDark ? 'bg-red-500/10' : 'bg-red-100'}`}>
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDark
                ? 'text-zinc-300 hover:bg-zinc-800'
                : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Github className="w-4 h-4" />
                레포지토리 생성
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
