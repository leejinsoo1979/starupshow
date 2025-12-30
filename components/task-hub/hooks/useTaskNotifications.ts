'use client'

import { useCallback } from 'react'
import { useAgentNotification, AgentInfo } from '@/lib/contexts/AgentNotificationContext'
import type { TaskWithDetails } from '@/types/task-hub'

// ============================================
// Task 알림 Hook
// ============================================
export function useTaskNotifications() {
  const { showAgentNotification } = useAgentNotification()

  // Task 생성 알림
  const notifyTaskCreated = useCallback((
    task: TaskWithDetails,
    agent?: AgentInfo
  ) => {
    if (!agent) return

    const priorityEmoji = {
      URGENT: '🔴',
      HIGH: '🟠',
      MEDIUM: '🟡',
      LOW: '🟢',
      NONE: '⚪',
    }

    const emoji = priorityEmoji[task.priority] || '📋'

    showAgentNotification(agent, `${emoji} 새 Task를 생성했습니다: "${task.title}"`, {
      type: 'task',
      actions: [
        {
          label: 'Task 보기',
          onClick: () => {
            window.location.href = `/dashboard-group/task-hub?task=${task.id}`
          },
        },
      ],
      duration: 8000,
    })
  }, [showAgentNotification])

  // Task 완료 알림
  const notifyTaskCompleted = useCallback((
    task: TaskWithDetails,
    agent?: AgentInfo,
    result?: string
  ) => {
    if (!agent) return

    const message = result
      ? `✅ Task 완료: "${task.title}"\n결과: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`
      : `✅ Task를 완료했습니다: "${task.title}"`

    showAgentNotification(agent, message, {
      type: 'task',
      emotion: 'happy',
      actions: [
        {
          label: '결과 확인',
          onClick: () => {
            window.location.href = `/dashboard-group/task-hub?task=${task.id}`
          },
        },
      ],
      duration: 10000,
    })
  }, [showAgentNotification])

  // Task 진행률 업데이트 알림 (주요 마일스톤)
  const notifyProgressMilestone = useCallback((
    task: TaskWithDetails,
    progress: number,
    agent?: AgentInfo
  ) => {
    if (!agent) return

    // 25%, 50%, 75% 마일스톤에서만 알림
    const milestones = [25, 50, 75]
    if (!milestones.includes(progress)) return

    const milestoneEmoji = {
      25: '🚀',
      50: '⚡',
      75: '🎯',
    }

    showAgentNotification(
      agent,
      `${milestoneEmoji[progress as keyof typeof milestoneEmoji] || '📊'} Task "${task.title}" - ${progress}% 진행 중`,
      {
        type: 'info',
        duration: 5000,
      }
    )
  }, [showAgentNotification])

  // Task 에러 알림
  const notifyTaskError = useCallback((
    task: TaskWithDetails,
    error: string,
    agent?: AgentInfo
  ) => {
    if (!agent) return

    showAgentNotification(
      agent,
      `⚠️ Task "${task.title}" 실행 중 오류 발생:\n${error.substring(0, 150)}${error.length > 150 ? '...' : ''}`,
      {
        type: 'alert',
        emotion: 'concerned',
        actions: [
          {
            label: '상세 보기',
            onClick: () => {
              window.location.href = `/dashboard-group/task-hub?task=${task.id}`
            },
          },
        ],
        duration: 0, // 자동으로 닫히지 않음
      }
    )
  }, [showAgentNotification])

  // Task 할당 알림
  const notifyTaskAssigned = useCallback((
    task: TaskWithDetails,
    assignerAgent?: AgentInfo,
    assigneeName?: string
  ) => {
    if (!assignerAgent) return

    showAgentNotification(
      assignerAgent,
      `📌 Task "${task.title}"를 ${assigneeName || '담당자'}에게 할당했습니다.`,
      {
        type: 'task',
        duration: 5000,
      }
    )
  }, [showAgentNotification])

  // Task 시작 알림
  const notifyTaskStarted = useCallback((
    task: TaskWithDetails,
    agent?: AgentInfo
  ) => {
    if (!agent) return

    showAgentNotification(agent, `🏃 Task "${task.title}" 작업을 시작합니다.`, {
      type: 'task',
      emotion: 'focused',
      duration: 4000,
    })
  }, [showAgentNotification])

  // 대화에서 Task 추출 알림
  const notifyTaskExtracted = useCallback((
    extractedTasks: Array<{ title: string; confidence: number }>,
    agent?: AgentInfo
  ) => {
    if (!agent || extractedTasks.length === 0) return

    const taskList = extractedTasks
      .slice(0, 3)
      .map(t => `• ${t.title}`)
      .join('\n')

    const moreCount = extractedTasks.length - 3

    showAgentNotification(
      agent,
      `💡 대화에서 ${extractedTasks.length}개의 Task를 발견했습니다:\n${taskList}${moreCount > 0 ? `\n...외 ${moreCount}개` : ''}`,
      {
        type: 'task',
        actions: [
          {
            label: 'Task Hub에서 확인',
            onClick: () => {
              window.location.href = '/dashboard-group/task-hub'
            },
          },
        ],
        duration: 10000,
      }
    )
  }, [showAgentNotification])

  return {
    notifyTaskCreated,
    notifyTaskCompleted,
    notifyProgressMilestone,
    notifyTaskError,
    notifyTaskAssigned,
    notifyTaskStarted,
    notifyTaskExtracted,
  }
}

// ============================================
// Agent 정보 헬퍼
// ============================================
export function createAgentInfoFromTask(task: TaskWithDetails): AgentInfo | undefined {
  // Task에서 생성자 Agent 정보 추출
  if (task.created_by_type !== 'AGENT' || !task.created_by) {
    return undefined
  }

  const metadata = task.metadata as any

  return {
    id: task.created_by,
    name: metadata?.created_by_agent_name || 'Agent',
    avatar_url: null,
    accentColor: '#a855f7', // 기본 보라색
  }
}

// ============================================
// Task Hub 실시간 알림 통합 Hook
// ============================================
export function useTaskHubNotifications(agentId?: string, agentInfo?: AgentInfo) {
  const {
    notifyTaskCreated,
    notifyTaskCompleted,
    notifyProgressMilestone,
    notifyTaskError,
    notifyTaskStarted,
  } = useTaskNotifications()

  // Task 생성 핸들러
  const handleTaskInsert = useCallback((task: TaskWithDetails) => {
    const agent = agentInfo || createAgentInfoFromTask(task)
    if (agent) {
      notifyTaskCreated(task, agent)
    }
  }, [agentInfo, notifyTaskCreated])

  // Task 업데이트 핸들러
  const handleTaskUpdate = useCallback((task: TaskWithDetails, prevStatus?: string) => {
    const agent = agentInfo || createAgentInfoFromTask(task)
    if (!agent) return

    const metadata = task.metadata as any

    // 상태 변경 감지
    if (prevStatus !== task.status) {
      if (task.status === 'DONE') {
        notifyTaskCompleted(task, agent, metadata?.result)
      } else if (task.status === 'IN_PROGRESS' && prevStatus === 'TODO') {
        notifyTaskStarted(task, agent)
      }
    }

    // 에러 감지
    if (metadata?.error) {
      notifyTaskError(task, metadata.error, agent)
    }

    // 진행률 마일스톤 감지
    if (metadata?.progress) {
      notifyProgressMilestone(task, metadata.progress, agent)
    }
  }, [agentInfo, notifyTaskCompleted, notifyTaskStarted, notifyTaskError, notifyProgressMilestone])

  return {
    handleTaskInsert,
    handleTaskUpdate,
  }
}
