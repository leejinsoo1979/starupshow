'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Plus,
  Minus,
  File,
  RefreshCw,
  Upload,
  Download,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react'
import { useNeuralMapStore } from '@/lib/neural-map/store'

interface GitStatus {
  staged: string[]
  unstaged: string[]
  untracked: string[]
}

interface GitCommitInfo {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}

export default function GitPanel() {
  const { projectPath } = useNeuralMapStore()
  const [isGitRepo, setIsGitRepo] = useState(false)
  const [currentBranch, setCurrentBranch] = useState<string | null>(null)
  const [status, setStatus] = useState<GitStatus>({ staged: [], unstaged: [], untracked: [] })
  const [commits, setCommits] = useState<GitCommitInfo[]>([])
  const [commitMessage, setCommitMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    staged: true,
    unstaged: true,
    untracked: true,
    history: false,
  })
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  const checkGitRepo = useCallback(async () => {
    if (!projectPath || !window.electron?.git) {
      setIsGitRepo(false)
      setIsLoading(false)
      return
    }

    try {
      const result = await window.electron.git.isRepo?.(projectPath)
      setIsGitRepo(result?.isRepo || false)

      if (result?.isRepo) {
        await refreshGitStatus()
      }
    } catch (err) {
      console.error('Failed to check git repo:', err)
      setIsGitRepo(false)
    } finally {
      setIsLoading(false)
    }
  }, [projectPath])

  useEffect(() => {
    checkGitRepo()
  }, [checkGitRepo])

  const refreshGitStatus = async () => {
    if (!projectPath || !window.electron?.git) return

    setIsRefreshing(true)
    setError(null)

    try {
      // Get current branch
      const branchResult = await window.electron.git.currentBranch?.(projectPath)
      if (branchResult?.success) {
        setCurrentBranch(branchResult.branch || 'main')
      }

      // Get status
      const statusResult = await window.electron.git.status?.(projectPath)
      if (statusResult?.success && statusResult.output) {
        const parsedStatus = parseGitStatus(statusResult.output)
        setStatus(parsedStatus)
      }

      // Get recent commits
      const logResult = await window.electron.git.log?.(projectPath, { maxCommits: 10 })
      if (logResult) {
        const parsedCommits = parseGitLog(logResult)
        setCommits(parsedCommits)
      }
    } catch (err) {
      console.error('Failed to refresh git status:', err)
      setError('Git 상태를 가져오는데 실패했습니다')
    } finally {
      setIsRefreshing(false)
    }
  }

  const parseGitStatus = (output: string): GitStatus => {
    const lines = output.trim().split('\n').filter(Boolean)
    const staged: string[] = []
    const unstaged: string[] = []
    const untracked: string[] = []

    for (const line of lines) {
      const indexStatus = line[0]
      const workTreeStatus = line[1]
      const filename = line.substring(3)

      if (indexStatus === '?' && workTreeStatus === '?') {
        untracked.push(filename)
      } else {
        if (indexStatus !== ' ' && indexStatus !== '?') {
          staged.push(`${indexStatus} ${filename}`)
        }
        if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
          unstaged.push(`${workTreeStatus} ${filename}`)
        }
      }
    }

    return { staged, unstaged, untracked }
  }

  const parseGitLog = (output: string): GitCommitInfo[] => {
    // Parse git log --oneline --format="%H|%h|%s|%an|%ar" output
    const lines = output.trim().split('\n').filter(Boolean)
    return lines.map((line) => {
      const parts = line.split('|')
      if (parts.length >= 5) {
        return {
          hash: parts[0],
          shortHash: parts[1],
          message: parts[2],
          author: parts[3],
          date: parts[4],
        }
      }
      // Fallback for simple format
      return {
        hash: line.substring(0, 7),
        shortHash: line.substring(0, 7),
        message: line.substring(8) || line,
        author: 'Unknown',
        date: '',
      }
    })
  }

  const handleStageFile = async (filename: string) => {
    if (!projectPath || !window.electron?.git) return

    try {
      await window.electron.git.add?.(projectPath, filename)
      await refreshGitStatus()
    } catch (err) {
      console.error('Failed to stage file:', err)
      setError('파일 스테이징 실패')
    }
  }

  const handleUnstageFile = async (filename: string) => {
    if (!projectPath || !window.electron?.git) return

    try {
      // Reset specific file
      await window.electron.invoke?.('git:reset', projectPath, filename)
      await refreshGitStatus()
    } catch (err) {
      console.error('Failed to unstage file:', err)
      setError('파일 언스테이징 실패')
    }
  }

  const handleStageAll = async () => {
    if (!projectPath || !window.electron?.git) return

    try {
      await window.electron.git.add?.(projectPath, '.')
      await refreshGitStatus()
    } catch (err) {
      console.error('Failed to stage all:', err)
      setError('전체 스테이징 실패')
    }
  }

  const handleCommit = async () => {
    if (!projectPath || !window.electron?.git || !commitMessage.trim()) return

    setIsCommitting(true)
    setError(null)

    try {
      const result = await window.electron.git.commit?.(projectPath, commitMessage.trim())
      if (result?.success) {
        setCommitMessage('')
        await refreshGitStatus()
      } else {
        setError(result?.error || '커밋 실패')
      }
    } catch (err) {
      console.error('Failed to commit:', err)
      setError('커밋 실패')
    } finally {
      setIsCommitting(false)
    }
  }

  const handlePush = async () => {
    if (!projectPath || !window.electron?.git) return

    setIsPushing(true)
    setError(null)

    try {
      const result = await window.electron.git.push?.(projectPath)
      if (!result?.success) {
        setError(result?.error || 'Push 실패')
      }
      await refreshGitStatus()
    } catch (err) {
      console.error('Failed to push:', err)
      setError('Push 실패')
    } finally {
      setIsPushing(false)
    }
  }

  const handlePull = async () => {
    if (!projectPath || !window.electron?.git) return

    setIsPulling(true)
    setError(null)

    try {
      const result = await window.electron.git.pull?.(projectPath)
      if (!result?.success) {
        setError(result?.error || 'Pull 실패')
      }
      await refreshGitStatus()
    } catch (err) {
      console.error('Failed to pull:', err)
      setError('Pull 실패')
    } finally {
      setIsPulling(false)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const getStatusIcon = (status: string) => {
    switch (status[0]) {
      case 'M':
        return <span className="text-amber-400">M</span>
      case 'A':
        return <span className="text-green-400">A</span>
      case 'D':
        return <span className="text-red-400">D</span>
      case 'R':
        return <span className="text-blue-400">R</span>
      default:
        return <span className="text-zinc-400">?</span>
    }
  }

  if (isLoading) {
    return (
      <div className={`h-full flex items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (!projectPath) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
        <GitBranch className={`w-12 h-12 mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
        <p className={`text-center ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          프로젝트 폴더를 선택해주세요
        </p>
      </div>
    )
  }

  if (!isGitRepo) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
        <GitBranch className={`w-12 h-12 mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
        <p className={`text-center mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Git 저장소가 아닙니다
        </p>
        <button
          onClick={async () => {
            if (window.electron?.git?.init) {
              await window.electron.git.init(projectPath)
              await checkGitRepo()
            }
          }}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Git 저장소 초기화
        </button>
      </div>
    )
  }

  const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex items-center gap-2">
          <GitBranch className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
          <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {currentBranch || 'main'}
          </span>
        </div>
        <button
          onClick={refreshGitStatus}
          disabled={isRefreshing}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''} ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Sync Actions */}
        <div className="flex gap-2">
          <button
            onClick={handlePull}
            disabled={isPulling}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }`}
          >
            {isPulling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="text-sm">Pull</span>
          </button>
          <button
            onClick={handlePush}
            disabled={isPushing}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }`}
          >
            {isPushing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span className="text-sm">Push</span>
          </button>
        </div>

        {/* Staged Changes */}
        <div>
          <button
            onClick={() => toggleSection('staged')}
            className={`flex items-center justify-between w-full py-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}
          >
            <div className="flex items-center gap-2">
              {expandedSections.staged ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Staged</span>
              {status.staged.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                  {status.staged.length}
                </span>
              )}
            </div>
          </button>
          {expandedSections.staged && status.staged.length > 0 && (
            <div className={`ml-6 space-y-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {status.staged.map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1">
                  {getStatusIcon(file)}
                  <span className="flex-1 truncate">{file.substring(2)}</span>
                  <button
                    onClick={() => handleUnstageFile(file.substring(2))}
                    className="p-1 hover:bg-zinc-800 rounded"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unstaged Changes */}
        <div>
          <button
            onClick={() => toggleSection('unstaged')}
            className={`flex items-center justify-between w-full py-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}
          >
            <div className="flex items-center gap-2">
              {expandedSections.unstaged ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Changes</span>
              {status.unstaged.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                  {status.unstaged.length}
                </span>
              )}
            </div>
            {status.unstaged.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  status.unstaged.forEach((f) => handleStageFile(f.substring(2)))
                }}
                className={`text-xs px-2 py-1 rounded ${
                  isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                }`}
              >
                Stage All
              </button>
            )}
          </button>
          {expandedSections.unstaged && status.unstaged.length > 0 && (
            <div className={`ml-6 space-y-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {status.unstaged.map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1">
                  {getStatusIcon(file)}
                  <span className="flex-1 truncate">{file.substring(2)}</span>
                  <button
                    onClick={() => handleStageFile(file.substring(2))}
                    className="p-1 hover:bg-zinc-800 rounded"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Untracked Files */}
        <div>
          <button
            onClick={() => toggleSection('untracked')}
            className={`flex items-center justify-between w-full py-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}
          >
            <div className="flex items-center gap-2">
              {expandedSections.untracked ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Untracked</span>
              {status.untracked.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-zinc-500/20 text-zinc-400 rounded">
                  {status.untracked.length}
                </span>
              )}
            </div>
          </button>
          {expandedSections.untracked && status.untracked.length > 0 && (
            <div className={`ml-6 space-y-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {status.untracked.map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1">
                  <File className="w-3 h-3 text-zinc-500" />
                  <span className="flex-1 truncate">{file}</span>
                  <button
                    onClick={() => handleStageFile(file)}
                    className="p-1 hover:bg-zinc-800 rounded"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commit History */}
        <div>
          <button
            onClick={() => toggleSection('history')}
            className={`flex items-center justify-between w-full py-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}
          >
            <div className="flex items-center gap-2">
              {expandedSections.history ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">History</span>
            </div>
          </button>
          {expandedSections.history && commits.length > 0 && (
            <div className={`ml-2 space-y-2 mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {commits.map((commit, i) => (
                <div
                  key={commit.hash || i}
                  className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}
                >
                  <div className="flex items-start gap-2">
                    <GitCommit className="w-3 h-3 mt-1 text-zinc-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        {commit.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-zinc-500">{commit.shortHash}</span>
                        {commit.date && (
                          <span className="text-[10px] text-zinc-500">{commit.date}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Commit Input */}
      <div className={`p-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="space-y-2">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="커밋 메시지..."
            rows={2}
            className={`w-full px-3 py-2 text-sm rounded-lg border resize-none outline-none transition-colors ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:border-zinc-500'
                : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-zinc-400'
            }`}
          />
          <div className="flex gap-2">
            <button
              onClick={handleStageAll}
              disabled={status.unstaged.length === 0 && status.untracked.length === 0}
              className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 disabled:opacity-50'
              }`}
            >
              Stage All
            </button>
            <button
              onClick={handleCommit}
              disabled={isCommitting || !commitMessage.trim() || status.staged.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCommitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Commit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
