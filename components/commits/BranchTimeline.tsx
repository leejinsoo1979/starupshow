"use client"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch,
  GitCommit,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileCode,
  User,
  Clock,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface CommitFile {
  path: string
  action: 'added' | 'modified' | 'removed'
}

interface Commit {
  id: string
  description: string
  branch: string
  github_sha?: string
  github_url?: string
  files?: CommitFile[]
  impact_level: 'low' | 'medium' | 'high'
  created_at: string
  user?: {
    name: string
    avatar_url?: string
  }
  metadata?: {
    repository?: string
    author?: {
      name: string
      email: string
    }
  }
}

interface BranchTimelineProps {
  commits: Commit[]
  className?: string
  onCommitClick?: (commit: Commit) => void
}

export function BranchTimeline({
  commits,
  className = '',
  onCommitClick,
}: BranchTimelineProps) {
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set(['main']))
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set())

  // 브랜치별로 커밋 그룹화
  const branchGroups = useMemo(() => {
    const groups: Record<string, Commit[]> = {}

    commits.forEach((commit) => {
      const branch = commit.branch || 'main'
      if (!groups[branch]) {
        groups[branch] = []
      }
      groups[branch].push(commit)
    })

    // 각 브랜치의 커밋을 최신순으로 정렬
    Object.keys(groups).forEach((branch) => {
      groups[branch].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    })

    // 브랜치를 최신 커밋 기준으로 정렬 (main은 항상 맨 위)
    const sortedBranches = Object.keys(groups).sort((a, b) => {
      if (a === 'main') return -1
      if (b === 'main') return 1
      const aLatest = groups[a][0]?.created_at || ''
      const bLatest = groups[b][0]?.created_at || ''
      return new Date(bLatest).getTime() - new Date(aLatest).getTime()
    })

    return { groups, sortedBranches }
  }, [commits])

  const toggleBranch = (branch: string) => {
    const newExpanded = new Set(expandedBranches)
    if (newExpanded.has(branch)) {
      newExpanded.delete(branch)
    } else {
      newExpanded.add(branch)
    }
    setExpandedBranches(newExpanded)
  }

  const toggleCommit = (commitId: string) => {
    const newExpanded = new Set(expandedCommits)
    if (newExpanded.has(commitId)) {
      newExpanded.delete(commitId)
    } else {
      newExpanded.add(commitId)
    }
    setExpandedCommits(newExpanded)
  }

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
  }

  const getFileActionIcon = (action: string) => {
    switch (action) {
      case 'added':
        return <Plus className="w-3 h-3 text-green-400" />
      case 'removed':
        return <Minus className="w-3 h-3 text-red-400" />
      default:
        return <Edit3 className="w-3 h-3 text-amber-400" />
    }
  }

  const getBranchColor = (branch: string) => {
    if (branch === 'main' || branch === 'master') return 'text-green-400'
    if (branch === 'develop' || branch === 'development') return 'text-blue-400'
    if (branch.startsWith('feature/')) return 'text-purple-400'
    if (branch.startsWith('hotfix/')) return 'text-red-400'
    if (branch.startsWith('bugfix/')) return 'text-orange-400'
    return 'text-zinc-400'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {branchGroups.sortedBranches.map((branch) => {
        const branchCommits = branchGroups.groups[branch]
        const isExpanded = expandedBranches.has(branch)
        const latestCommit = branchCommits[0]

        return (
          <div
            key={branch}
            className="rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 overflow-hidden"
          >
            {/* Branch Header */}
            <button
              onClick={() => toggleBranch(branch)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800`}>
                  <GitBranch className={`w-4 h-4 ${getBranchColor(branch)}`} />
                </div>
                <div className="text-left">
                  <h3 className={`font-semibold ${getBranchColor(branch)}`}>{branch}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {branchCommits.length}개 커밋 • 최근:{' '}
                    {formatDistanceToNow(new Date(latestCommit.created_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${getImpactColor(
                    latestCommit.impact_level
                  )}`}
                >
                  {latestCommit.impact_level}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-zinc-400" />
                )}
              </div>
            </button>

            {/* Commits List */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-zinc-200 dark:border-zinc-700"
                >
                  <div className="relative pl-8 pr-4 py-2">
                    {/* Vertical line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />

                    {branchCommits.map((commit, index) => {
                      const isCommitExpanded = expandedCommits.has(commit.id)

                      return (
                        <div key={commit.id} className="relative py-3">
                          {/* Commit dot */}
                          <div
                            className={`absolute left-[-14px] w-4 h-4 rounded-full border-2 bg-white dark:bg-zinc-900 ${
                              index === 0
                                ? 'border-accent'
                                : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                          >
                            <GitCommit
                              className={`w-2 h-2 absolute top-0.5 left-0.5 ${
                                index === 0 ? 'text-accent' : 'text-zinc-400'
                              }`}
                            />
                          </div>

                          {/* Commit content */}
                          <div
                            className="ml-4 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                            onClick={() => {
                              toggleCommit(commit.id)
                              onCommitClick?.(commit)
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                  {commit.description.split('\n')[0]}
                                </p>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                  {commit.user && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {commit.user.name || commit.metadata?.author?.name}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(commit.created_at), {
                                      addSuffix: true,
                                      locale: ko,
                                    })}
                                  </span>
                                  {commit.github_sha && (
                                    <code className="font-mono text-zinc-400">
                                      {commit.github_sha.substring(0, 7)}
                                    </code>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {commit.github_url && (
                                  <a
                                    href={commit.github_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4 text-zinc-400" />
                                  </a>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded text-xs border ${getImpactColor(
                                    commit.impact_level
                                  )}`}
                                >
                                  {commit.impact_level === 'high'
                                    ? '높음'
                                    : commit.impact_level === 'medium'
                                    ? '중간'
                                    : '낮음'}
                                </span>
                              </div>
                            </div>

                            {/* Expanded details */}
                            <AnimatePresence>
                              {isCommitExpanded && commit.files && commit.files.length > 0 && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700"
                                >
                                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                                    변경 파일 ({commit.files.length}개)
                                  </p>
                                  <div className="space-y-1">
                                    {commit.files.map((file, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-2 text-xs"
                                      >
                                        {getFileActionIcon(file.action)}
                                        <FileCode className="w-3 h-3 text-zinc-400" />
                                        <code className="text-zinc-600 dark:text-zinc-300 font-mono truncate">
                                          {file.path}
                                        </code>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {commits.length === 0 && (
        <div className="text-center py-12">
          <GitBranch className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">아직 커밋 기록이 없습니다</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            코드 에디터에서 작업을 시작해보세요
          </p>
        </div>
      )}
    </div>
  )
}
