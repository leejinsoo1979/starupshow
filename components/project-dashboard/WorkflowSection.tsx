"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bot,
  Users,
  Activity,
  Loader2,
  RefreshCw,
  Zap,
  ArrowRight,
  Terminal,
} from "lucide-react"
import { Button } from "@/components/ui/Button"

interface ExecutingTask {
  id: string
  title: string
  status: "running" | "waiting" | "completed" | "failed"
  assignee_type: "human" | "agent"
  assignee_name: string
  assignee_avatar?: string
  started_at: string
  progress?: number
  current_step?: string
}

interface ExecutionLog {
  id: string
  timestamp: string
  type: "info" | "success" | "warning" | "error"
  message: string
  task_id?: string
}

interface WorkflowSectionProps {
  projectId: string
  project: {
    name: string
    status?: string
  }
}

const statusConfig = {
  running: { label: "실행 중", color: "#3B82F6", icon: Play },
  waiting: { label: "대기 중", color: "#F59E0B", icon: Clock },
  completed: { label: "완료", color: "#10B981", icon: CheckCircle2 },
  failed: { label: "실패", color: "#EF4444", icon: AlertCircle },
}

export function WorkflowSection({ projectId, project }: WorkflowSectionProps) {
  const [executingTasks, setExecutingTasks] = useState<ExecutingTask[]>([])
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(true)

  const fetchExecutionStatus = useCallback(async () => {
    try {
      // Fetch currently executing tasks
      const tasksRes = await fetch(`/api/projects/${projectId}/tasks?status=in_progress`)
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()

        // Transform to executing task format
        const executing: ExecutingTask[] = tasksData.map((task: any) => ({
          id: task.id,
          title: task.title,
          status: task.agent_status === "running" ? "running" : "waiting",
          assignee_type: task.assignee_type || "human",
          assignee_name: task.assignee_type === "agent"
            ? task.agent?.name || "AI Agent"
            : task.assignee?.name || "미배정",
          assignee_avatar: task.assignee_type === "agent"
            ? task.agent?.avatar_url
            : task.assignee?.avatar_url,
          started_at: task.started_at || task.updated_at,
          progress: task.progress || 0,
          current_step: task.current_step || task.description?.slice(0, 50),
        }))

        setExecutingTasks(executing)
      }

      // Generate execution logs based on recent activity
      const logsRes = await fetch(`/api/projects/${projectId}/tasks?limit=10&order=updated_at.desc`)
      if (logsRes.ok) {
        const recentTasks = await logsRes.json()

        const logs: ExecutionLog[] = recentTasks
          .filter((t: any) => t.updated_at)
          .slice(0, 10)
          .map((task: any) => ({
            id: `log-${task.id}`,
            timestamp: task.updated_at,
            type: task.status === "done" ? "success"
              : task.status === "in_progress" ? "info"
              : "warning",
            message: task.status === "done"
              ? `"${task.title}" 완료됨`
              : task.status === "in_progress"
              ? `"${task.title}" 작업 시작`
              : `"${task.title}" 상태 변경: ${task.status}`,
            task_id: task.id,
          }))

        setExecutionLogs(logs)
      }
    } catch (error) {
      console.error("Execution status fetch error:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchExecutionStatus()

    // Poll every 5 seconds if polling is enabled
    let interval: NodeJS.Timeout
    if (isPolling) {
      interval = setInterval(fetchExecutionStatus, 5000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [fetchExecutionStatus, isPolling])

  const runningCount = executingTasks.filter(t => t.status === "running").length
  const waitingCount = executingTasks.filter(t => t.status === "waiting").length
  const agentCount = executingTasks.filter(t => t.assignee_type === "agent").length

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return "방금 전"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`
    return date.toLocaleDateString("ko-KR")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          <p className="text-zinc-500">실행 현황 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">워크플로우</h2>
          <p className="text-sm text-zinc-500 mt-1">실시간 작업 실행 현황</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPolling(!isPolling)}
            className={isPolling ? "text-green-400" : "text-zinc-400"}
          >
            {isPolling ? (
              <>
                <Activity className="w-4 h-4 mr-2 animate-pulse" />
                실시간
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 mr-2" />
                일시정지
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchExecutionStatus}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "실행 중", value: runningCount, icon: Play, color: "#3B82F6" },
          { label: "대기 중", value: waitingCount, icon: Clock, color: "#F59E0B" },
          { label: "AI 에이전트", value: agentCount, icon: Bot, color: "#8B5CF6" },
          { label: "총 진행 작업", value: executingTasks.length, icon: Zap, color: "#10B981" },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Executing Tasks */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              실행 중인 작업
            </h3>
            <span className="text-sm text-zinc-500">{executingTasks.length}개</span>
          </div>

          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {executingTasks.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>현재 실행 중인 작업이 없습니다</p>
                <p className="text-sm mt-2">칸반 보드에서 작업을 시작해보세요</p>
              </div>
            ) : (
              <AnimatePresence>
                {executingTasks.map((task, idx) => {
                  const StatusIcon = statusConfig[task.status].icon

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Assignee Avatar */}
                        <div className="relative">
                          <img
                            src={task.assignee_avatar || `https://api.dicebear.com/7.x/${task.assignee_type === "agent" ? "bottts" : "avataaars"}/svg?seed=${task.assignee_name}`}
                            alt={task.assignee_name}
                            className="w-10 h-10 rounded-full"
                          />
                          {task.status === "running" && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            </div>
                          )}
                        </div>

                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white truncate">{task.title}</span>
                            <span
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${statusConfig[task.status].color}20`,
                                color: statusConfig[task.status].color,
                              }}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig[task.status].label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-zinc-500">
                            {task.assignee_type === "agent" ? (
                              <Bot className="w-3 h-3" />
                            ) : (
                              <Users className="w-3 h-3" />
                            )}
                            <span>{task.assignee_name}</span>
                            <span>•</span>
                            <span>{formatTime(task.started_at)}</span>
                          </div>

                          {task.current_step && (
                            <div className="mt-2 text-xs text-zinc-400 flex items-center gap-2">
                              <ArrowRight className="w-3 h-3" />
                              {task.current_step}
                            </div>
                          )}

                          {task.progress !== undefined && task.progress > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                                <span>진행률</span>
                                <span>{task.progress}%</span>
                              </div>
                              <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${task.progress}%`,
                                    backgroundColor: statusConfig[task.status].color,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Execution Logs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-green-400" />
              실행 로그
            </h3>
            {isPolling && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                실시간 업데이트
              </span>
            )}
          </div>

          <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto font-mono text-sm">
            {executionLogs.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>아직 실행 로그가 없습니다</p>
              </div>
            ) : (
              <AnimatePresence>
                {executionLogs.map((log, idx) => {
                  const logColors = {
                    info: "text-blue-400",
                    success: "text-green-400",
                    warning: "text-amber-400",
                    error: "text-red-400",
                  }

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-start gap-3 py-2 border-b border-zinc-800/50 last:border-0"
                    >
                      <span className="text-zinc-600 text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString("ko-KR")}
                      </span>
                      <span className={`${logColors[log.type]} flex-1`}>
                        {log.type === "success" && "✓ "}
                        {log.type === "error" && "✗ "}
                        {log.type === "warning" && "⚠ "}
                        {log.message}
                      </span>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
