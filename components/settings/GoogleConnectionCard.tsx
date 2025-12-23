'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Cloud, Loader2, Check, X, ExternalLink } from 'lucide-react'

interface GoogleConnection {
  connected: boolean
  email?: string
  name?: string
  avatar?: string
}

export default function GoogleConnectionCard() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [connection, setConnection] = useState<GoogleConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // 연결 상태 확인
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/google')
        if (res.ok) {
          const data = await res.json()
          setConnection(data)
        }
      } catch (error) {
        console.error('Failed to check Google connection:', error)
      } finally {
        setLoading(false)
      }
    }

    checkConnection()
  }, [])

  // Google 연결
  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_auth_url' }),
      })

      if (res.ok) {
        const { authUrl } = await res.json()
        window.location.href = authUrl
      } else {
        alert('Google 연결을 시작할 수 없습니다.')
      }
    } catch (error) {
      console.error('Failed to start Google connection:', error)
      alert('오류가 발생했습니다.')
    } finally {
      setConnecting(false)
    }
  }

  // Google 연결 해제
  const handleDisconnect = async () => {
    if (!confirm('Google Cloud 연결을 해제하시겠습니까?\n\n웹에서 저장된 파일은 유지되지만, 앱에서 접근할 수 없게 됩니다.')) {
      return
    }

    setDisconnecting(true)
    try {
      const res = await fetch('/api/google', { method: 'DELETE' })
      if (res.ok) {
        setConnection({ connected: false })
      } else {
        alert('연결 해제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to disconnect Google:', error)
      alert('오류가 발생했습니다.')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className={cn(
        'rounded-lg border p-4',
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      )}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          <span className="text-sm text-zinc-500">Google Cloud 연결 상태 확인 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-lg border p-4',
      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            connection?.connected
              ? 'bg-blue-500/10'
              : isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            <Cloud className={cn(
              'w-5 h-5',
              connection?.connected ? 'text-blue-500' : 'text-zinc-500'
            )} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'font-medium',
                isDark ? 'text-white' : 'text-zinc-900'
              )}>
                Google Cloud Storage
              </span>
              {connection?.connected && (
                <span className="flex items-center gap-1 text-xs text-green-500">
                  <Check className="w-3 h-3" />
                  연결됨
                </span>
              )}
            </div>

            {connection?.connected ? (
              <div className="flex items-center gap-2 mt-1">
                {connection.avatar && (
                  <img
                    src={connection.avatar}
                    alt=""
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <span className="text-sm text-zinc-500">
                  {connection.email}
                </span>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                웹에서 파일을 저장하고 관리합니다
              </p>
            )}
          </div>
        </div>

        {connection?.connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              isDark
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            )}
          >
            {disconnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                해제 중...
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                연결 해제
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              'bg-blue-500 text-white hover:bg-blue-600'
            )}
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                연결 중...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Google 연결
              </>
            )}
          </button>
        )}
      </div>

      {/* 안내 문구 */}
      <div className={cn(
        'mt-4 pt-4 border-t text-xs',
        isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-100 text-zinc-400'
      )}>
        {connection?.connected ? (
          <p>✓ 웹 브라우저에서 파일 작업 시 Google Cloud Storage에 저장됩니다.</p>
        ) : (
          <p>
            Google Cloud를 연결하면 웹에서도 파일을 생성/편집/저장할 수 있습니다.
            <br />
            Electron 데스크톱 앱에서는 로컬 파일시스템을 사용합니다.
          </p>
        )}
      </div>
    </div>
  )
}
