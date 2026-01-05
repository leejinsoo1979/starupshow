'use client'

import { useState } from 'react'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MatchReason {
  title: string
  detail: string
}

interface AIMatchResultProps {
  programId: string
  programTitle?: string
  accentColor?: string
  initialResult?: {
    score: number
    action: 'apply' | 'watch' | 'skip'
    reasons: MatchReason[]
    risks: MatchReason[]
    next_actions: string[]
  }
  onAnalyze?: () => void
}

export function AIMatchResult({
  programId,
  programTitle,
  accentColor = '#6366f1',
  initialResult,
  onAnalyze
}: AIMatchResultProps) {
  const [result, setResult] = useState(initialResult)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Theme detection is handled by Tailwind dark: classes

  const analyzeMatch = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/government-programs/match/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: programId,
          force_refresh: forceRefresh
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '분석 실패')
      }

      setResult(data.result)
      onAnalyze?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 점수별 스타일
  const getScoreStyle = (score: number) => {
    if (score >= 80) return {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      label: '적극 추천'
    }
    if (score >= 60) return {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      label: '검토 권장'
    }
    return {
      bg: 'bg-zinc-500/10',
      border: 'border-zinc-500/30',
      text: 'text-zinc-400',
      label: '지원 비권장'
    }
  }

  // 액션 아이콘
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'apply':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'watch':
        return <Eye className="w-5 h-5 text-yellow-400" />
      case 'skip':
        return <XCircle className="w-5 h-5 text-zinc-400" />
      default:
        return null
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'apply': return '지원 권장'
      case 'watch': return '검토 필요'
      case 'skip': return '지원 비권장'
      default: return action
    }
  }

  // 결과가 없으면 분석 버튼 표시
  if (!result) {
    return (
      <div className="rounded-lg p-6 border bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
            <TrendingUp className="w-5 h-5" style={{ color: accentColor }} />
            AI 적합도 분석
          </h3>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: accentColor + '15', border: `1px solid ${accentColor}50`, color: accentColor }}>
            {error}
          </div>
        )}

        <p className="mb-4 text-gray-600 dark:text-zinc-400">
          회사 프로필을 기반으로 이 지원사업과의 적합도를 AI가 분석합니다.
        </p>

        <button
          onClick={() => analyzeMatch()}
          disabled={loading}
          className="w-full py-3 px-4 disabled:opacity-50
                     rounded-lg font-medium transition-colors
                     flex items-center justify-center gap-2"
          style={{ background: accentColor, color: '#fff' }}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <TrendingUp className="w-5 h-5" />
              적합도 분석하기
            </>
          )}
        </button>
      </div>
    )
  }

  const scoreStyle = getScoreStyle(result.score)

  return (
    <div className="rounded-lg p-6 border bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm dark:shadow-none">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
          <TrendingUp className="w-5 h-5" style={{ color: accentColor }} />
          AI 적합도 분석
        </h3>
        <button
          onClick={() => analyzeMatch(true)}
          disabled={loading}
          className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
          title="다시 분석"
        >
          <RefreshCw className={cn(
            "w-4 h-4 text-gray-500 dark:text-zinc-400",
            loading && "animate-spin"
          )} />
        </button>
      </div>

      {/* 점수 & 액션 */}
      <div className="flex items-center gap-6 mb-6">
        {/* 점수 원형 */}
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-zinc-700"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${result.score * 2.51} 251`}
              className={scoreStyle.text}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${scoreStyle.text}`}>
              {result.score}
            </span>
            <span className="text-xs text-gray-400 dark:text-zinc-500">/ 100</span>
          </div>
        </div>

        {/* 액션 & 레이블 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getActionIcon(result.action)}
            <span className={`font-semibold ${scoreStyle.text}`}>
              {getActionLabel(result.action)}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-zinc-400">{scoreStyle.label}</p>
        </div>
      </div>

      {/* 선정 근거 */}
      {result.reasons.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700 dark:text-zinc-300">
            <CheckCircle className="w-4 h-4 text-green-500" />
            선정 근거
          </h4>
          <div className="space-y-2">
            {result.reasons.map((reason, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border bg-green-50 dark:bg-green-500/5 border-green-200 dark:border-green-500/20"
              >
                <div className="font-medium text-sm mb-1 text-green-700 dark:text-green-400">
                  {reason.title}
                </div>
                <div className="text-sm text-gray-600 dark:text-zinc-400">
                  {reason.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 리스크 */}
      {result.risks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700 dark:text-zinc-300">
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-yellow-400" />
            리스크 / 보완사항
          </h4>
          <div className="space-y-2">
            {result.risks.map((risk, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border bg-amber-50 dark:bg-yellow-500/5 border-amber-200 dark:border-yellow-500/20"
              >
                <div className="font-medium text-sm mb-1 text-amber-700 dark:text-yellow-400">
                  {risk.title}
                </div>
                <div className="text-sm text-gray-600 dark:text-zinc-400">
                  {risk.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 다음 단계 */}
      {result.next_actions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700 dark:text-zinc-300">
            <ArrowRight className="w-4 h-4" style={{ color: accentColor }} />
            다음 단계
          </h4>
          <ul className="space-y-1">
            {result.next_actions.map((action, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-400"
              >
                <span className="mt-1" style={{ color: accentColor }}>•</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg" style={{ background: accentColor + '15', border: `1px solid ${accentColor}50` }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: accentColor }}>
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}
    </div>
  )
}

export default AIMatchResult
