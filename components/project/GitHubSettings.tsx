'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  Github,
  Link2,
  Unlink,
  Plus,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  GitBranch,
  FolderGit,
} from 'lucide-react'
import GitHubRepoSelectModal from './GitHubRepoSelectModal'
import GitHubRepoCreateModal from './GitHubRepoCreateModal'
import type { Project } from '@/types/database'

interface Props {
  project: Project
  onProjectUpdate?: (project: Project) => void
}

export default function GitHubSettings({ project, onProjectUpdate }: Props) {
  const [isGitHubConnected, setIsGitHubConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  useEffect(() => {
    checkGitHubConnection()
  }, [])

  const checkGitHubConnection = async () => {
    try {
      const res = await fetch('/api/github')
      if (res.ok) {
        const data = await res.json()
        setIsGitHubConnected(data.connected)
      }
    } catch (error) {
      console.error('Failed to check GitHub connection:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRepoSelected = async (repo: {
    owner: string
    name: string
    clone_url: string
    default_branch: string
  }) => {
    try {
      // Update project with GitHub repo info
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_owner: repo.owner,
          github_repo: repo.name,
          github_clone_url: repo.clone_url,
          github_default_branch: repo.default_branch,
          github_connected_at: new Date().toISOString(),
        }),
      })

      if (res.ok) {
        const updatedProject = await res.json()
        onProjectUpdate?.(updatedProject)
        setShowSelectModal(false)

        // If project has local folder, initialize git
        if (project.folder_path) {
          await initializeGitRepo(project.folder_path, repo.clone_url)
        }
      }
    } catch (error) {
      console.error('Failed to link repo:', error)
      alert('레포지토리 연결에 실패했습니다')
    }
  }

  const handleRepoCreated = async (repo: {
    owner: string
    name: string
    clone_url: string
    default_branch: string
  }) => {
    await handleRepoSelected(repo)
    setShowCreateModal(false)
  }

  const initializeGitRepo = async (folderPath: string, remoteUrl: string) => {
    if (!window.electron?.git) return

    setIsInitializing(true)
    try {
      // Check if already a git repo
      const isRepoResult = await window.electron.git.isRepo?.(folderPath)

      if (!isRepoResult?.isRepo) {
        // Initialize git repo
        await window.electron.git.init?.(folderPath)
      }

      // Check existing remotes
      const remotesResult = await window.electron.git.remoteList?.(folderPath)
      const hasOrigin = remotesResult?.output?.includes('origin')

      if (!hasOrigin) {
        // Add origin remote
        await window.electron.git.remoteAdd?.(folderPath, 'origin', remoteUrl)
      }

      // Initial commit if no commits exist
      const statusResult = await window.electron.git.status?.(folderPath)
      if (statusResult?.output) {
        await window.electron.git.add?.(folderPath, '.')
        await window.electron.git.commit?.(folderPath, 'Initial commit from GlowUS')
      }
    } catch (error) {
      console.error('Failed to initialize git:', error)
    } finally {
      setIsInitializing(false)
    }
  }

  const handleUnlinkRepo = async () => {
    if (!confirm('GitHub 레포지토리 연결을 해제하시겠습니까?\n로컬 Git 설정은 유지됩니다.')) {
      return
    }

    setIsUnlinking(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_owner: null,
          github_repo: null,
          github_clone_url: null,
          github_connected_at: null,
        }),
      })

      if (res.ok) {
        const updatedProject = await res.json()
        onProjectUpdate?.(updatedProject)
      }
    } catch (error) {
      console.error('Failed to unlink repo:', error)
      alert('연결 해제에 실패했습니다')
    } finally {
      setIsUnlinking(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`rounded-xl p-6 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          <span className="text-zinc-500">로딩 중...</span>
        </div>
      </div>
    )
  }

  // GitHub not connected to account
  if (!isGitHubConnected) {
    return (
      <div className={`rounded-xl p-6 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <Github className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
          </div>
          <div>
            <h3 className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>GitHub 연결 필요</h3>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              먼저 GitHub 계정을 연결해주세요
            </p>
          </div>
        </div>

        <a
          href="/dashboard-group/settings"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <Github className="w-4 h-4" />
          설정에서 GitHub 연결하기
        </a>
      </div>
    )
  }

  // Project has linked repo
  if (project.github_owner && project.github_repo) {
    return (
      <div className={`rounded-xl overflow-hidden border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-lg">
                <FolderGit className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>GitHub 레포지토리</h3>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>연결됨</p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">연결됨</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Repo Info */}
          <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
            <div className="flex items-center gap-3">
              <Github className={`w-8 h-8 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {project.github_owner}/{project.github_repo}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <GitBranch className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {project.github_default_branch || 'main'}
                  </span>
                </div>
              </div>
              <a
                href={`https://github.com/${project.github_owner}/${project.github_repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
                }`}
              >
                <ExternalLink className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
              </a>
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={handleUnlinkRepo}
            disabled={isUnlinking}
            className="flex items-center justify-center gap-2 px-4 py-2 w-full bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {isUnlinking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Unlink className="w-4 h-4" />
            )}
            연결 해제
          </button>
        </div>
      </div>
    )
  }

  // No repo linked - show options to connect
  return (
    <>
      <div className={`rounded-xl overflow-hidden border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <FolderGit className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
            </div>
            <div>
              <h3 className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>GitHub 레포지토리</h3>
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                프로젝트를 GitHub에 연결하세요
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isInitializing && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${isDark ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-sm text-blue-400">Git 저장소 초기화 중...</span>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <button
              onClick={() => setShowSelectModal(true)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                isDark
                  ? 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                  : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <Link2 className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
              <div className="text-left">
                <p className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>기존 레포지토리 연결</p>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  이미 있는 GitHub 레포를 선택합니다
                </p>
              </div>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                isDark
                  ? 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                  : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <Plus className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
              <div className="text-left">
                <p className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>새 레포지토리 생성</p>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  GitHub에 새 레포를 만들고 연결합니다
                </p>
              </div>
            </button>
          </div>

          {!project.folder_path && (
            <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${isDark ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-400">
                로컬 폴더가 없습니다. GitHub 연결 후 clone하거나, 먼저 로컬 프로젝트를 생성하세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSelectModal && (
        <GitHubRepoSelectModal
          onSelect={handleRepoSelected}
          onClose={() => setShowSelectModal(false)}
        />
      )}

      {showCreateModal && (
        <GitHubRepoCreateModal
          defaultName={project.name}
          onCreated={handleRepoCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  )
}
