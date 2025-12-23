"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Brain,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  AlertTriangle,
  Sparkles,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Lightbulb,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings2,
} from "lucide-react"
import { Button } from "@/components/ui/Button"

interface AIIntelligenceDashboardProps {
  projectId: string
}

interface UsageStats {
  totalCost: number
  totalTokens: number
  totalRequests: number
  roi: number
  efficiencyScore: number
  budgetUsed: number
  budgetTotal: number
  prediction: number
}

interface AgentROI {
  id: string
  name: string
  avatar?: string
  cost: number
  tokens: number
  requests: number
  outcomes: {
    type: string
    value: number
    label: string
  }[]
  efficiency: number
  trend: "up" | "down" | "stable"
}

interface DailyUsage {
  date: string
  tokens: number
  cost: number
  requests: number
}

interface Optimization {
  id: string
  type: "cost" | "performance" | "quality"
  title: string
  description: string
  impact: string
  priority: "high" | "medium" | "low"
}

// 모델별 토큰 가격 (per 1K tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  "claude-3-opus": { input: 0.015, output: 0.075 },
  "claude-3-sonnet": { input: 0.003, output: 0.015 },
  "claude-3-haiku": { input: 0.00025, output: 0.00125 },
}

export function AIIntelligenceDashboard({ projectId }: AIIntelligenceDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"day" | "week" | "month">("month")
  const [stats, setStats] = useState<UsageStats>({
    totalCost: 0,
    totalTokens: 0,
    totalRequests: 0,
    roi: 0,
    efficiencyScore: 0,
    budgetUsed: 0,
    budgetTotal: 0,
    prediction: 0,
  })
  const [agents, setAgents] = useState<AgentROI[]>([])
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([])
  const [optimizations, setOptimizations] = useState<Optimization[]>([])
  const [liveTokens, setLiveTokens] = useState(0)

  useEffect(() => {
    fetchData()
    // 실시간 토큰 시뮬레이션
    const interval = setInterval(() => {
      setLiveTokens(Math.floor(Math.random() * 500) + 100)
    }, 2000)
    return () => clearInterval(interval)
  }, [projectId, period])

  const fetchData = async () => {
    setLoading(true)
    try {
      // API 호출 (실제 구현 시)
      // const res = await fetch(`/api/projects/${projectId}/ai-usage?period=${period}`)

      // 데모 데이터
      await new Promise((r) => setTimeout(r, 500))

      setStats({
        totalCost: 12.5,
        totalTokens: 125400,
        totalRequests: 847,
        roi: 847,
        efficiencyScore: 82,
        budgetUsed: 12.5,
        budgetTotal: 25,
        prediction: 18.5,
      })

      setAgents([
        {
          id: "1",
          name: "코드리뷰 에이전트",
          avatar: "🔍",
          cost: 2.1,
          tokens: 21000,
          requests: 156,
          outcomes: [
            { type: "bugs_found", value: 15, label: "버그 발견" },
            { type: "suggestions", value: 42, label: "개선 제안" },
          ],
          efficiency: 95,
          trend: "up",
        },
        {
          id: "2",
          name: "문서화 에이전트",
          avatar: "📝",
          cost: 1.8,
          tokens: 18000,
          requests: 89,
          outcomes: [
            { type: "docs_created", value: 23, label: "문서 생성" },
            { type: "time_saved", value: 4.5, label: "시간 절약(h)" },
          ],
          efficiency: 88,
          trend: "up",
        },
        {
          id: "3",
          name: "테스트 에이전트",
          avatar: "🧪",
          cost: 3.2,
          tokens: 32000,
          requests: 234,
          outcomes: [
            { type: "tests_generated", value: 67, label: "테스트 생성" },
            { type: "coverage_increase", value: 12, label: "커버리지 +%" },
          ],
          efficiency: 76,
          trend: "stable",
        },
        {
          id: "4",
          name: "채팅 에이전트",
          avatar: "💬",
          cost: 5.4,
          tokens: 54400,
          requests: 368,
          outcomes: [
            { type: "messages", value: 368, label: "메시지" },
            { type: "resolved", value: 12, label: "해결된 문의" },
          ],
          efficiency: 45,
          trend: "down",
        },
      ])

      // 7일치 데모 데이터
      const days = period === "day" ? 24 : period === "week" ? 7 : 30
      setDailyUsage(
        Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - (days - 1 - i) * (period === "day" ? 3600000 : 86400000)).toISOString(),
          tokens: Math.floor(Math.random() * 5000) + 2000,
          cost: Math.random() * 0.5 + 0.2,
          requests: Math.floor(Math.random() * 50) + 10,
        }))
      )

      setOptimizations([
        {
          id: "1",
          type: "cost",
          title: "GPT-4 → Claude Haiku 전환",
          description: "반복적인 간단한 작업에 더 저렴한 모델 사용",
          impact: "월 $8 절감 예상",
          priority: "high",
        },
        {
          id: "2",
          type: "performance",
          title: "응답 캐싱 활성화",
          description: "동일한 질문에 대해 캐시된 응답 사용",
          impact: "토큰 40% 절감",
          priority: "high",
        },
        {
          id: "3",
          type: "quality",
          title: "채팅 에이전트 프롬프트 최적화",
          description: "효율이 낮은 에이전트의 프롬프트 개선",
          impact: "효율 +30% 예상",
          priority: "medium",
        },
      ])
    } catch (error) {
      console.error("Failed to fetch AI usage data:", error)
    } finally {
      setLoading(false)
    }
  }

  const budgetPercent = stats.budgetTotal > 0 ? (stats.budgetUsed / stats.budgetTotal) * 100 : 0
  const predictionPercent = stats.budgetTotal > 0 ? (stats.prediction / stats.budgetTotal) * 100 : 0

  const maxTokens = Math.max(...dailyUsage.map((d) => d.tokens), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
          <p className="text-sm text-zinc-500">AI 사용량 분석 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI 인텔리전스</h2>
            <p className="text-sm text-zinc-500">토큰 사용량 분석 및 ROI 최적화</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                period === p
                  ? "bg-purple-500/20 text-purple-400 font-medium"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {p === "day" ? "오늘" : p === "week" ? "이번 주" : "이번 달"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-500">총 비용</p>
              <p className="text-2xl font-bold text-white mt-1">${stats.totalCost.toFixed(2)}</p>
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                전월 대비 -12%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </motion.div>

        {/* ROI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20 rounded-xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-500">ROI</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.roi}%</p>
              <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                가치 대비 효율
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </motion.div>

        {/* Efficiency Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-500">효율 점수</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-white">{stats.efficiencyScore}</p>
                <p className="text-sm text-zinc-500">/100</p>
              </div>
              <div className="mt-2 h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.efficiencyScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                />
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* Live Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-500">실시간 사용량</p>
              <p className="text-2xl font-bold text-white mt-1">
                {liveTokens.toLocaleString()}
                <span className="text-sm font-normal text-zinc-500 ml-1">t/min</span>
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span className="text-xs text-amber-400">Live</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Budget & Prediction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-zinc-400" />
            예산 현황
          </h3>
          <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white">
            <Settings2 className="w-4 h-4 mr-2" />
            예산 설정
          </Button>
        </div>

        <div className="space-y-4">
          {/* Current Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">현재 사용량</span>
              <span className="text-sm font-medium text-white">
                ${stats.budgetUsed.toFixed(2)} / ${stats.budgetTotal.toFixed(2)}
              </span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${budgetPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  budgetPercent > 80 ? "bg-red-500" : budgetPercent > 60 ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
            </div>
          </div>

          {/* Prediction */}
          <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-400">이번 달 예측</p>
              <p className="text-lg font-semibold text-white">${stats.prediction.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${predictionPercent > 100 ? "text-red-400" : "text-emerald-400"}`}>
                예산의 {predictionPercent.toFixed(0)}%
              </p>
              {predictionPercent > 80 && (
                <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  주의 필요
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Usage Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-zinc-400" />
            사용량 추이
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              토큰
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              비용
            </span>
          </div>
        </div>

        <div className="h-40 flex items-end gap-1">
          {dailyUsage.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(day.tokens / maxTokens) * 100}%` }}
                transition={{ duration: 0.5, delay: idx * 0.02 }}
                className="w-full bg-gradient-to-t from-purple-500/50 to-purple-500/20 rounded-t-sm min-h-[4px]"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-zinc-500">
          <span>{period === "day" ? "00:00" : dailyUsage[0]?.date.slice(5, 10)}</span>
          <span>{period === "day" ? "현재" : "오늘"}</span>
        </div>
      </motion.div>

      {/* Agent ROI Ranking */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-zinc-800">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-zinc-400" />
            에이전트별 가성비 랭킹
          </h3>
        </div>

        <div className="divide-y divide-zinc-800/50">
          {agents
            .sort((a, b) => b.efficiency - a.efficiency)
            .map((agent, idx) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + idx * 0.05 }}
                className="px-6 py-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      idx === 0
                        ? "bg-amber-500/20 text-amber-400"
                        : idx === 1
                        ? "bg-zinc-400/20 text-zinc-300"
                        : idx === 2
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                  </div>

                  {/* Agent Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{agent.avatar}</span>
                      <span className="font-medium text-white">{agent.name}</span>
                      {agent.trend === "up" && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
                      {agent.trend === "down" && <ArrowDownRight className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span>${agent.cost.toFixed(2)}</span>
                      <span>•</span>
                      <span>{agent.tokens.toLocaleString()} tokens</span>
                      <span>•</span>
                      <span>{agent.requests} 요청</span>
                    </div>
                  </div>

                  {/* Outcomes */}
                  <div className="flex items-center gap-3">
                    {agent.outcomes.slice(0, 2).map((outcome) => (
                      <div key={outcome.type} className="text-center">
                        <p className="text-sm font-semibold text-white">{outcome.value}</p>
                        <p className="text-xs text-zinc-500">{outcome.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Efficiency */}
                  <div className="w-24">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-500">효율</span>
                      <span
                        className={`text-sm font-medium ${
                          agent.efficiency >= 80
                            ? "text-emerald-400"
                            : agent.efficiency >= 60
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        {agent.efficiency}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          agent.efficiency >= 80
                            ? "bg-emerald-500"
                            : agent.efficiency >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${agent.efficiency}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Low efficiency warning */}
                {agent.efficiency < 60 && (
                  <div className="mt-3 ml-12 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      효율이 낮습니다. 프롬프트 최적화를 권장합니다.
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
        </div>
      </motion.div>

      {/* AI Optimization Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-cyan-500/10 border border-purple-500/20 rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI 최적화 제안</h3>
            <p className="text-xs text-zinc-500">비용 절감 및 효율 개선을 위한 추천</p>
          </div>
        </div>

        <div className="space-y-3">
          {optimizations.map((opt, idx) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + idx * 0.05 }}
              className="flex items-start gap-3 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  opt.type === "cost"
                    ? "bg-green-500/20"
                    : opt.type === "performance"
                    ? "bg-blue-500/20"
                    : "bg-purple-500/20"
                }`}
              >
                {opt.type === "cost" ? (
                  <DollarSign className="w-4 h-4 text-green-400" />
                ) : opt.type === "performance" ? (
                  <Zap className="w-4 h-4 text-blue-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-purple-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-white">{opt.title}</p>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      opt.priority === "high"
                        ? "bg-red-500/20 text-red-400"
                        : opt.priority === "medium"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {opt.priority === "high" ? "높음" : opt.priority === "medium" ? "보통" : "낮음"}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">{opt.description}</p>
                <p className="text-sm text-emerald-400 mt-2 font-medium">{opt.impact}</p>
              </div>
              <Button size="sm" variant="ghost" className="flex-shrink-0">
                적용
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Model Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
        >
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-zinc-400" />
            모델별 사용량
          </h3>
          <div className="space-y-3">
            {[
              { model: "GPT-4", percent: 45, tokens: 56430, color: "#10B981" },
              { model: "Claude 3 Sonnet", percent: 30, tokens: 37620, color: "#8B5CF6" },
              { model: "GPT-3.5 Turbo", percent: 20, tokens: 25080, color: "#3B82F6" },
              { model: "Claude 3 Haiku", percent: 5, tokens: 6270, color: "#F59E0B" },
            ].map((item) => (
              <div key={item.model}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-400">{item.model}</span>
                  <span className="text-sm text-white">{item.tokens.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percent}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
        >
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-zinc-400" />
            빠른 통계
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "총 요청 수", value: stats.totalRequests.toLocaleString(), icon: Activity },
              { label: "평균 응답 시간", value: "1.2초", icon: Clock },
              { label: "성공률", value: "99.2%", icon: CheckCircle2 },
              { label: "오류 발생", value: "7건", icon: XCircle },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-zinc-800/50 rounded-lg">
                <item.icon className="w-4 h-4 text-zinc-500 mb-2" />
                <p className="text-lg font-semibold text-white">{item.value}</p>
                <p className="text-xs text-zinc-500">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
