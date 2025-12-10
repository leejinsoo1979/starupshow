'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { AIInsightPanel } from '@/components/ai'
import {
  Sparkles,
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Zap,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Activity,
  Shield,
  LayoutGrid,
  List,
} from 'lucide-react'

type ViewMode = 'panel' | 'cards'

interface TaskAnalysis {
  summary: string
  complexityScore: number
  impactLevel: 'low' | 'medium' | 'high'
  risks: string[]
  recommendedActions: string[]
}

interface RiskPrediction {
  overallRiskScore: number
  financialRisk: 'low' | 'medium' | 'high' | 'critical'
  operationalRisk: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: string[]
  recommendations: string[]
}

interface CommitInsight {
  summary: string
  businessImpact: 'low' | 'medium' | 'high'
  productivityScore: number
  nextRecommendations: string[]
  investorHighlight: string
}

const impactColors = {
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function InsightsPage() {
  const { currentStartup } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [riskPrediction, setRiskPrediction] = useState<RiskPrediction | null>(null)
  const [recentInsights, setRecentInsights] = useState<CommitInsight[]>([])
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('panel')

  const fetchRiskPrediction = async () => {
    if (!currentStartup?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/risk-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupId: currentStartup.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch prediction')
      }

      setRiskPrediction(data.prediction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 분석 실패')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (currentStartup?.id) {
      fetchRiskPrediction()
    }
  }, [currentStartup?.id])

  const getRiskColor = (level: string) => {
    return impactColors[level as keyof typeof impactColors] || impactColors.low
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-400'
    if (score >= 50) return 'text-orange-400'
    if (score >= 30) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-accent" />
            AI 인사이트
          </h1>
          <p className="text-zinc-500 mt-1">
            AI가 분석한 스타트업 성과와 리스크 예측
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('panel')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'panel'
                  ? 'bg-accent text-white'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="패널 뷰"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-accent text-white'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="카드 뷰"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={fetchRiskPrediction}
            disabled={isLoading || !currentStartup}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            분석 새로고침
          </Button>
        </div>
      </div>

      {/* No Startup Selected */}
      {!currentStartup && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Brain className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">
              스타트업을 선택해주세요
            </h3>
            <p className="text-zinc-500">
              AI 인사이트를 확인하려면 먼저 스타트업을 선택해야 합니다
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <p className="text-sm text-red-400/70 mt-1">
            OPENAI_API_KEY 환경변수가 설정되어 있는지 확인해주세요.
          </p>
        </motion.div>
      )}

      {currentStartup && viewMode === 'panel' && (
        /* New AIInsightPanel View */
        <AIInsightPanel
          isLoading={isLoading}
          onRefresh={fetchRiskPrediction}
        />
      )}

      {currentStartup && viewMode === 'cards' && (
        <>
          {/* Risk Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Risk Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-zinc-900 border-zinc-800 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    전체 리스크 점수
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-20 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
                    </div>
                  ) : riskPrediction ? (
                    <div className="flex items-end gap-2">
                      <span className={`text-5xl font-bold ${getRiskScoreColor(riskPrediction.overallRiskScore)}`}>
                        {riskPrediction.overallRiskScore}
                      </span>
                      <span className="text-zinc-500 mb-2">/100</span>
                    </div>
                  ) : (
                    <div className="text-zinc-500">분석 대기중</div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Financial Risk */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-zinc-900 border-zinc-800 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    재무 리스크
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-20 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
                    </div>
                  ) : riskPrediction ? (
                    <span className={`inline-flex px-4 py-2 rounded-full text-lg font-semibold border ${getRiskColor(riskPrediction.financialRisk)}`}>
                      {riskPrediction.financialRisk.toUpperCase()}
                    </span>
                  ) : (
                    <div className="text-zinc-500">분석 대기중</div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Operational Risk */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-zinc-900 border-zinc-800 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    운영 리스크
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-20 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
                    </div>
                  ) : riskPrediction ? (
                    <span className={`inline-flex px-4 py-2 rounded-full text-lg font-semibold border ${getRiskColor(riskPrediction.operationalRisk)}`}>
                      {riskPrediction.operationalRisk.toUpperCase()}
                    </span>
                  ) : (
                    <div className="text-zinc-500">분석 대기중</div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Risk Factors & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Factors */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-zinc-900 border-zinc-800 h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    주요 리스크 요인
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-zinc-800 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : riskPrediction?.riskFactors?.length ? (
                    <ul className="space-y-3">
                      {riskPrediction.riskFactors.map((factor, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                        >
                          <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-orange-400">{index + 1}</span>
                          </div>
                          <span className="text-zinc-300">{factor}</span>
                        </motion.li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <Shield className="w-12 h-12 mx-auto mb-3 text-green-400/50" />
                      <p>감지된 리스크 요인이 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-zinc-900 border-zinc-800 h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    AI 개선 권고사항
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-zinc-800 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : riskPrediction?.recommendations?.length ? (
                    <ul className="space-y-3">
                      {riskPrediction.recommendations.map((rec, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                        >
                          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Zap className="w-3 h-3 text-accent" />
                          </div>
                          <span className="text-zinc-300">{rec}</span>
                        </motion.li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <Lightbulb className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                      <p>권고사항을 분석중입니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* AI Features Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
              <CardContent className="py-8">
                <div className="text-center max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">
                    더 많은 AI 기능이 곧 출시됩니다
                  </h3>
                  <p className="text-zinc-400 mb-6">
                    태스크 자동 분석, 주간 리포트 생성, 투자자 매칭 추천 등
                    다양한 AI 기능이 준비중입니다.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {['태스크 분석', '커밋 인사이트', '주간 리포트', '투자자 매칭'].map((feature) => (
                      <span
                        key={feature}
                        className="px-4 py-2 bg-zinc-700/50 rounded-full text-sm text-zinc-300 border border-zinc-600"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  )
}
