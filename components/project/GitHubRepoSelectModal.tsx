'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  Github,
  Search,
  X,
  Loader2,
  Lock,
  Globe,
  Star,
  GitFork,
  ChevronRight,
} from 'lucide-react'

interface Repo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  clone_url: string
  default_branch: string
  owner: {
    login: string
    avatar_url: string
  }
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
}

interface Props {
  onSelect: (repo: {
    owner: string
    name: string
    clone_url: string
    default_branch: string
  }) => void
  onClose: () => void
}

export default function GitHubRepoSelectModal({ onSelect, onClose }: Props) {
  const [repos, setRepos] = useState<Repo[]>([])
  const [filteredRepos, setFilteredRepos] = useState<Repo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  useEffect(() => {
    fetchRepos()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      setFilteredRepos(
        repos.filter(
          (repo) =>
            repo.name.toLowerCase().includes(query) ||
            repo.full_name.toLowerCase().includes(query) ||
            repo.description?.toLowerCase().includes(query)
        )
      )
    } else {
      setFilteredRepos(repos)
    }
  }, [searchQuery, repos])

  const fetchRepos = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/github/repos?per_page=100&sort=updated')
      if (!res.ok) {
        const data = await res.json()
        if (data.code === 'NOT_CONNECTED') {
          setError('GitHub 계정이 연결되어 있지 않습니다')
        } else if (data.code === 'TOKEN_EXPIRED') {
          setError('GitHub 토큰이 만료되었습니다. 다시 연결해주세요.')
        } else {
          setError(data.error || '레포지토리를 불러올 수 없습니다')
        }
        return
      }

      const data = await res.json()
      setRepos(data.repos)
      setFilteredRepos(data.repos)
    } catch (err) {
      console.error('Failed to fetch repos:', err)
      setError('레포지토리를 불러오는 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = () => {
    if (!selectedRepo) return

    onSelect({
      owner: selectedRepo.owner.login,
      name: selectedRepo.name,
      clone_url: selectedRepo.clone_url,
      default_branch: selectedRepo.default_branch,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl shadow-2xl ${
          isDark ? 'bg-zinc-900' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="flex items-center gap-3">
            <Github className={`w-5 h-5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`} />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              레포지토리 선택
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

        {/* Search */}
        <div className={`px-6 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className={`relative rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
            <input
              type="text"
              placeholder="레포지토리 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 bg-transparent outline-none ${
                isDark ? 'text-zinc-200 placeholder-zinc-500' : 'text-zinc-800 placeholder-zinc-400'
              }`}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : error ? (
            <div className={`text-center py-12 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              <p>{error}</p>
              <button
                onClick={fetchRepos}
                className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              {searchQuery ? '검색 결과가 없습니다' : '레포지토리가 없습니다'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRepos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => setSelectedRepo(repo)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedRepo?.id === repo.id
                      ? isDark
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-green-500 bg-green-50'
                      : isDark
                        ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={repo.owner.avatar_url}
                      alt={repo.owner.login}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {repo.full_name}
                        </span>
                        {repo.private ? (
                          <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        ) : (
                          <Globe className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                        )}
                      </div>
                      {repo.description && (
                        <p className={`text-sm mt-1 truncate ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        {repo.language && (
                          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {repo.language}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          <Star className="w-3 h-3" />
                          {repo.stargazers_count}
                        </span>
                        <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          <GitFork className="w-3 h-3" />
                          {repo.forks_count}
                        </span>
                      </div>
                    </div>
                    {selectedRepo?.id === repo.id && (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
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
            onClick={handleSelect}
            disabled={!selectedRepo}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            선택
          </button>
        </div>
      </div>
    </div>
  )
}
