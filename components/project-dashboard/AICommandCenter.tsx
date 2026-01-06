"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Zap,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Target,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

interface AIMetric {
  id: string
  type: "trigger" | "alert" | "insight"
  title: string
  value: string | number
  trend?: "up" | "down" | "stable"
  status?: "success" | "warning" | "danger"
  icon?: typeof Zap
}

interface TaskStats {
  total: number
  completed: number
  inProgress: number
  overdue: number
  aiGenerated: number
}

interface AICommandCenterProps {
  projectId: string
}

export function AICommandCenter({ projectId }: AICommandCenterProps) {
  const [metrics, setMetrics] = useState<AIMetric[]>([])
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    aiGenerated: 0,
  })
  const [lastSync, setLastSync] = useState<Date>(new Date())

  useEffect(() => {
    fetchTaskData()
  }, [projectId])

  const fetchTaskData = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`)
      if (!res.ok) return

      const data = await res.json()
      const tasks = data.tasks || []
      const now = new Date()

      // Calculate stats
      const completed = tasks.filter((t: any) => t.status === "DONE").length
      const inProgress = tasks.filter((t: any) => t.status === "IN_PROGRESS").length
      const overdue = tasks.filter(
        (t: any) => t.due_date && new Date(t.due_date) < now && t.status !== "DONE"
      ).length
      const aiGenerated = tasks.filter((t: any) => t.is_ai_generated || t.assignee_type === "agent").length

      setStats({
        total: tasks.length,
        completed,
        inProgress,
        overdue,
        aiGenerated,
      })

      // Generate dynamic metrics based on real data
      const dynamicMetrics: AIMetric[] = [
        {
          id: "1",
          type: "trigger",
          title: "자동화 작업",
          value: aiGenerated > 0 ? `${aiGenerated}건 자동화됨` : "대기 중",
          status: aiGenerated > 0 ? "success" : "warning",
          icon: Zap,
        },
        {
          id: "2",
          type: "alert",
          title: "이슈 모니터링",
          value: overdue > 0 ? `${overdue}건 지연!` : "정상",
          status: overdue > 0 ? "warning" : "success",
          icon: Shield,
        },
        {
          id: "3",
          type: "insight",
          title: "진행 분석",
          value: tasks.length > 0
            ? `완료율 ${Math.round((completed / tasks.length) * 100)}%`
            : "데이터 없음",
          trend: completed > inProgress ? "up" : "stable",
          status: "success",
          icon: TrendingUp,
        },
      ]

      setMetrics(dynamicMetrics)
      setLastSync(new Date())
    } catch (error) {
      console.error("Task data fetch error:", error)
    }
  }

  const formatLastSync = () => {
    const diff = new Date().getTime() - lastSync.getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return "방금 전"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}분 전`
    return `${Math.floor(minutes / 60)}시간 전`
  }

  const getStatusColors = (status?: string) => {
    switch (status) {
      case "warning":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          icon: "text-amber-400",
          iconBg: "bg-amber-500/20",
          glow: "shadow-amber-500/10",
        }
      case "danger":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          icon: "text-red-400",
          iconBg: "bg-red-500/20",
          glow: "shadow-red-500/10",
        }
      default:
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          icon: "text-emerald-400",
          iconBg: "bg-emerald-500/20",
          glow: "shadow-emerald-500/10",
        }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm"
    >
      <div className="relative z-10 p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <Activity className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              프로젝트 현황
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Live</span>
              </div>
            </h2>
            <p className="text-xs text-zinc-500">실시간 프로젝트 모니터링</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon || Activity
            const colors = getStatusColors(metric.status)

            return (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "relative group cursor-pointer overflow-hidden rounded-xl p-4",
                  "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50",
                  "hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200"
                )}
              >
                {/* Status indicator line */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-0.5",
                  metric.status === "warning" ? "bg-amber-500" :
                    metric.status === "danger" ? "bg-red-500" : "bg-emerald-500"
                )} />

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colors.iconBg)}>
                      <Icon className={cn("w-4 h-4", colors.icon)} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">{metric.title}</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{metric.value}</p>
                    </div>
                  </div>

                  {metric.type === "trigger" && (
                    <div className="flex items-center gap-0.5">
                      {/* Simplified activity indicator */}
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-zinc-400">Active</span>
                    </div>
                  )}

                  {metric.type === "alert" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-xs h-7 px-3",
                        metric.status === "warning"
                          ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                      )}
                    >
                      {metric.status === "warning" ? "해결" : "확인"}
                    </Button>
                  )}

                  {metric.trend && (
                    <div className="flex items-center">
                      <svg viewBox="0 0 100 40" className="w-14 h-7">
                        <path
                          d="M0,35 Q25,30 50,20 T100,5"
                          fill="none"
                          stroke={metric.trend === "up" ? "#10b981" : "#ef4444"}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M0,35 Q25,30 50,20 T100,5 L100,40 L0,40 Z"
                          fill={`url(#gradient-${metric.id})`}
                          opacity="0.2"
                        />
                        <defs>
                          <linearGradient id={`gradient-${metric.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={metric.trend === "up" ? "#10b981" : "#ef4444"} />
                            <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-zinc-500">완료 <span className="text-zinc-300 font-medium">{stats.completed}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-zinc-500">진행중 <span className="text-zinc-300 font-medium">{stats.inProgress}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-zinc-500">전체 <span className="text-zinc-300 font-medium">{stats.total}</span></span>
            </div>
          </div>
          <div className="text-xs text-zinc-600">
            동기화: <span className="text-zinc-500">{formatLastSync()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
