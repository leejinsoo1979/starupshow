"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Bell,
  MessageSquare,
  CheckCircle2,
  FileText,
  Users,
  Bot,
  GitCommit,
  Flag,
  AlertTriangle,
  Megaphone,
  Filter,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/Button"

interface Activity {
  id: string
  type: "task_completed" | "task_created" | "comment" | "document" | "member_joined" | "agent_action" | "milestone" | "announcement"
  title: string
  description?: string
  user?: {
    name: string
    avatar_url?: string
  }
  agent?: {
    name: string
    avatar_url?: string
  }
  created_at: string
  metadata?: Record<string, any>
}

interface UpdatesSectionProps {
  projectId: string
  project: {
    name: string
  }
}

const activityTypeConfig = {
  task_completed: { label: "태스크 완료", color: "#10B981", icon: CheckCircle2 },
  task_created: { label: "태스크 생성", color: "#3B82F6", icon: FileText },
  comment: { label: "댓글", color: "#8B5CF6", icon: MessageSquare },
  document: { label: "문서", color: "#F59E0B", icon: FileText },
  member_joined: { label: "멤버 합류", color: "#EC4899", icon: Users },
  agent_action: { label: "에이전트 활동", color: "#06B6D4", icon: Bot },
  milestone: { label: "마일스톤", color: "#EF4444", icon: Flag },
  announcement: { label: "공지", color: "#F97316", icon: Megaphone },
}

export function UpdatesSection({ projectId, project }: UpdatesSectionProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "all">("week")

  useEffect(() => {
    fetchActivities()
  }, [projectId, timeRange, filter])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        timeRange,
        limit: '50',
      })
      if (filter) {
        params.append('type', filter)
      }

      const res = await fetch(`/api/projects/${projectId}/activities?${params}`)

      if (!res.ok) {
        throw new Error('활동 목록 조회 실패')
      }

      const data = await res.json()

      // API 응답을 Activity 형식으로 변환
      const formattedActivities: Activity[] = data.map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        user: item.user ? {
          name: item.user.name,
          avatar_url: item.user.avatar_url,
        } : undefined,
        agent: item.agent ? {
          name: item.agent.name,
          avatar_url: item.agent.avatar_url,
        } : undefined,
        created_at: item.created_at,
        metadata: item.metadata,
      }))

      setActivities(formattedActivities)
    } catch (error) {
      console.error("Activities fetch error:", error)
      setActivities([]) // 에러 시 빈 배열
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
  }

  const filteredActivities = filter
    ? activities.filter((a) => a.type === filter)
    : activities

  const groupedByDate = filteredActivities.reduce((acc, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(activity)
    return acc
  }, {} as Record<string, Activity[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">업데이트</h2>
          <p className="text-sm text-zinc-500 mt-1">프로젝트 활동 및 공지사항</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">오늘</option>
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
            <option value="all">전체</option>
          </select>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            필터
          </Button>
        </div>
      </div>

      {/* Activity Type Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            !filter ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          전체
        </button>
        {Object.entries(activityTypeConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? null : key)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
              filter === key
                ? "text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
            style={filter === key ? { backgroundColor: `${config.color}30`, color: config.color } : {}}
          >
            <config.icon className="w-3.5 h-3.5" />
            {config.label}
          </button>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
          </div>
        ) : Object.entries(groupedByDate).length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">아직 활동 내역이 없습니다</p>
            <p className="text-sm text-zinc-600 mt-2">
              태스크 완료, 멤버 합류 등의 활동이 자동으로 기록됩니다
            </p>
          </div>
        ) : Object.entries(groupedByDate).map(([date, dateActivities], groupIdx) => (
          <div key={date}>
            {/* Date Header */}
            <div className="px-6 py-3 bg-zinc-800/50 border-b border-zinc-800 sticky top-0">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Calendar className="w-4 h-4" />
                {date}
              </div>
            </div>

            {/* Activities for this date */}
            <div className="divide-y divide-zinc-800">
              {dateActivities.map((activity, idx) => {
                const config = activityTypeConfig[activity.type]
                const Icon = config.icon
                const actor = activity.agent || activity.user

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: config.color }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-white">{activity.title}</p>
                            {activity.description && (
                              <p className="text-sm text-zinc-400 mt-1">{activity.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500 whitespace-nowrap">
                            {formatTimeAgo(activity.created_at)}
                          </span>
                        </div>

                        {/* Actor */}
                        {actor && (
                          <div className="flex items-center gap-2 mt-2">
                            {activity.agent ? (
                              <Bot className="w-4 h-4 text-purple-400" />
                            ) : (
                              <img
                                src={actor.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${actor.name}`}
                                alt=""
                                className="w-5 h-5 rounded-full"
                              />
                            )}
                            <span className="text-xs text-zinc-500">{actor.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "총 활동",
            value: activities.length,
            icon: Bell,
            color: "#3B82F6",
          },
          {
            label: "완료된 태스크",
            value: activities.filter((a) => a.type === "task_completed").length,
            icon: CheckCircle2,
            color: "#10B981",
          },
          {
            label: "에이전트 활동",
            value: activities.filter((a) => a.type === "agent_action").length,
            icon: Bot,
            color: "#8B5CF6",
          },
          {
            label: "공지사항",
            value: activities.filter((a) => a.type === "announcement").length,
            icon: Megaphone,
            color: "#F59E0B",
          },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + idx * 0.05 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-zinc-500">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
