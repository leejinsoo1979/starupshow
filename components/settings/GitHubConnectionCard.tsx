'use client'

import { useState, useEffect } from 'react'
import { Github, CheckCircle, XCircle, ExternalLink, Loader2, LogOut, RefreshCw } from 'lucide-react'
import { useTheme } from 'next-themes'

interface GitHubConnection {
  id: string
  github_username: string
  github_email: string | null
  github_avatar_url: string | null
  scopes: string[]
  created_at: string
  updated_at: string
}

interface Props {
  onConnectionChange?: (connected: boolean) => void
}

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID

export default function GitHubConnectionCard({ onConnectionChange }: Props) {
  const [connection, setConnection] = useState<GitHubConnection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  useEffect(() => {
    fetchConnection()

    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search)
    const githubStatus = params.get('github')
    const error = params.get('error')

    if (githubStatus === 'connected') {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      fetchConnection()
    } else if (error) {
      alert(`GitHub 연결 실패: ${error}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const fetchConnection = async () => {
    try {
      const res = await fetch('/api/github')
      if (res.ok) {
        const data = await res.json()
        setConnection(data.connection)
        onConnectionChange?.(data.connected)
      }
    } catch (error) {
      console.error('Failed to fetch GitHub connection:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const connectGitHub = () => {
    if (!GITHUB_CLIENT_ID) {
      alert('GitHub Client ID가 설정되지 않았습니다.')
      return
    }

    setIsConnecting(true)

    // OAuth flow - redirect to GitHub
    const scope = 'read:user user:email repo'
    const redirectUri = `${window.location.origin}/auth/github/callback`
    const state = window.location.pathname // Return URL

    const authUrl = new URL('https://github.com/login/oauth/authorize')
    authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('state', state)

    window.location.href = authUrl.toString()
  }

  const disconnectGitHub = async () => {
    if (!confirm('GitHub 계정 연결을 해제하시겠습니까?\n연결된 모든 프로젝트의 GitHub 설정도 초기화됩니다.')) {
      return
    }

    setIsDisconnecting(true)
    try {
      const res = await fetch('/api/github', { method: 'DELETE' })
      if (res.ok) {
        setConnection(null)
        onConnectionChange?.(false)
      } else {
        const error = await res.json()
        alert(error.error || '연결 해제 실패')
      }
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error)
      alert('연결 해제 중 오류가 발생했습니다')
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`rounded-xl p-6 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          <span className="text-zinc-500">연결 상태 확인 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl overflow-hidden border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      {/* Header */}
      <div className="bg-zinc-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">GitHub</h3>
              <p className="text-xs text-white/70">코드 저장소 연동 및 버전 관리</p>
            </div>
          </div>
          {connection ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">연결됨</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-600/50 rounded-full">
              <XCircle className="w-3 h-3 text-zinc-400" />
              <span className="text-xs text-zinc-400">미연결</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {connection ? (
          <>
            {/* Connected User Info */}
            <div className={`mb-4 p-4 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
              <div className="flex items-center gap-3">
                {connection.github_avatar_url ? (
                  <img
                    src={connection.github_avatar_url}
                    alt={connection.github_username}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                    <Github className="w-5 h-5 text-zinc-400" />
                  </div>
                )}
                <div>
                  <p className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    @{connection.github_username}
                  </p>
                  {connection.github_email && (
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {connection.github_email}
                    </p>
                  )}
                </div>
                <a
                  href={`https://github.com/${connection.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`ml-auto p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
                  }`}
                >
                  <ExternalLink className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
                </a>
              </div>
            </div>

            {/* Scopes */}
            <div className="mb-4">
              <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>권한</p>
              <div className="flex flex-wrap gap-2">
                {connection.scopes?.map((scope) => (
                  <span
                    key={scope}
                    className={`px-2 py-1 text-xs rounded ${
                      isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            {/* Connected Date */}
            <p className={`text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {new Date(connection.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}에 연결됨
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={fetchConnection}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                새로고침
              </button>
              <button
                onClick={disconnectGitHub}
                disabled={isDisconnecting}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm disabled:opacity-50"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                연결 해제
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Features */}
            <div className="mb-6">
              <p className={`text-xs mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>연결하면</p>
              <ul className="space-y-2">
                {[
                  '프로젝트를 GitHub 레포지토리와 연결',
                  'Git commit, push, pull 작업 지원',
                  '새 레포지토리 자동 생성 가능',
                  '브랜치 관리 및 히스토리 확인',
                ].map((feature, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-2 text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}
                  >
                    <div className="w-1 h-1 bg-green-500 rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Connect Button */}
            <button
              onClick={connectGitHub}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  연결 중...
                </>
              ) : (
                <>
                  <Github className="w-5 h-5" />
                  GitHub 계정 연결
                </>
              )}
            </button>

            {!GITHUB_CLIENT_ID && (
              <p className="mt-3 text-xs text-amber-400 text-center">
                ⚠️ NEXT_PUBLIC_GITHUB_CLIENT_ID 환경 변수가 필요합니다
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
