"use client"

import { useState, useEffect } from "react"
import { useThemeStore, accentColors } from "@/stores/themeStore"
import { GitCommit, GitBranch, Clock, RefreshCw, ChevronRight, Code, FileText, Palette, Briefcase } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"

interface CommitWithProject {
  id: string
  commit_hash: string
  commit_message: string
  author_name: string
  files_changed: number
  insertions: number
  deletions: number
  branch: string
  committed_at: string
  project: {
    id: string
    name: string
    project_type: string
    color: string
  } | null
}

const PROJECT_TYPE_ICONS: Record<string, React.ElementType> = {
  code: Code,
  document: FileText,
  design: Palette,
  work: Briefcase,
}

export function GitCommitsWidget() {
  const [commits, setCommits] = useState<CommitWithProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { accentColor } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentAccent = accentColors.find(c => c.id === accentColor) || accentColors[0]

  const fetchCommits = async () => {
    try {
      const response = await fetch('/api/git-commits?limit=10')
      if (response.ok) {
        const data = await response.json()
        setCommits(data.commits || [])
      }
    } catch (err) {
      console.error('[GitCommitsWidget] Failed to fetch commits:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    // 🔥 초기 sync 제거 - 페이지 로드 시 불필요한 git 명령 실행 방지
    // 사용자가 새로고침 버튼을 클릭할 때만 sync 실행
    fetchCommits()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // First sync commits from Git repos, then fetch
    try {
      await fetch('/api/git-commits/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 30 })
      })
    } catch (err) {
      console.error('[GitCommitsWidget] Sync failed:', err)
    }
    fetchCommits()
  }

  const formatCommitDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ko })
    } catch {
      return dateStr
    }
  }

  if (!mounted) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${currentAccent.color}20` }}
          >
            <GitCommit className="w-4 h-4" style={{ color: currentAccent.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">최근 커밋</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">전체 프로젝트</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
            </div>
          ))}
        </div>
      ) : commits.length === 0 ? (
        <div className="text-center py-8">
          <GitBranch className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">아직 커밋 기록이 없습니다</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            프로젝트에서 변경사항을 커밋하면 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {commits.map((commit) => {
            const ProjectIcon = commit.project?.project_type
              ? PROJECT_TYPE_ICONS[commit.project.project_type] || Code
              : Code

            return (
              <div
                key={commit.id}
                className="group p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Commit icon */}
                  <div className="mt-0.5">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{
                        backgroundColor: commit.project?.color
                          ? `${commit.project.color}20`
                          : `${currentAccent.color}20`,
                      }}
                    >
                      <ProjectIcon
                        className="w-3.5 h-3.5"
                        style={{
                          color: commit.project?.color || currentAccent.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {commit.commit_message}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {commit.project && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                          {commit.project.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <GitBranch className="w-3 h-3" />
                        {commit.branch}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <Clock className="w-3 h-3" />
                        {formatCommitDate(commit.committed_at)}
                      </span>
                    </div>
                    {/* Stats */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {commit.files_changed} files
                      </span>
                      {commit.insertions > 0 && (
                        <span className="text-[10px] text-green-500">
                          +{commit.insertions}
                        </span>
                      )}
                      {commit.deletions > 0 && (
                        <span className="text-[10px] text-red-500">
                          -{commit.deletions}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer link */}
      {commits.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button className="w-full text-center text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            모든 커밋 보기
          </button>
        </div>
      )}
    </div>
  )
}
