'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithDetails } from '@/types/task-hub'

// ============================================
// 타입 정의
// ============================================
interface RealtimeTaskUpdate {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: TaskWithDetails | null
  old: { id: string } | null
}

interface UseAgentTaskRealtimeOptions {
  agentIds: string[]
  onTaskInsert?: (task: TaskWithDetails) => void
  onTaskUpdate?: (task: TaskWithDetails) => void
  onTaskDelete?: (taskId: string) => void
  onProgressUpdate?: (taskId: string, progress: number, result?: string) => void
  enabled?: boolean
}

// ============================================
// Agent Task 실시간 업데이트 Hook
// ============================================
export function useAgentTaskRealtime({
  agentIds,
  onTaskInsert,
  onTaskUpdate,
  onTaskDelete,
  onProgressUpdate,
  enabled = true,
}: UseAgentTaskRealtimeOptions) {
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)

  // 실시간 구독 설정
  const setupSubscription = useCallback(() => {
    if (!enabled || agentIds.length === 0) return

    const supabase = supabaseRef.current

    // 기존 구독 해제
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Agent 할당/생성 Task 변경 감지
    const channel = supabase
      .channel('agent-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unified_tasks',
          filter: `assignee_type=eq.AGENT`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimeTaskUpdate

          // Agent ID 필터링
          if (newRecord && !agentIds.includes(newRecord.assignee_id || '')) {
            return
          }

          switch (eventType) {
            case 'INSERT':
              if (newRecord) {
                console.log('[Realtime] Task inserted:', newRecord.id)
                onTaskInsert?.(newRecord)
              }
              break

            case 'UPDATE':
              if (newRecord) {
                console.log('[Realtime] Task updated:', newRecord.id)
                onTaskUpdate?.(newRecord)

                // 진행률 업데이트 감지
                const metadata = newRecord.metadata as any
                if (metadata?.progress !== undefined) {
                  onProgressUpdate?.(
                    newRecord.id,
                    metadata.progress,
                    metadata.result
                  )
                }
              }
              break

            case 'DELETE':
              if (oldRecord) {
                console.log('[Realtime] Task deleted:', oldRecord.id)
                onTaskDelete?.(oldRecord.id)
              }
              break
          }
        }
      )
      // Agent가 생성한 Task도 감지
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unified_tasks',
          filter: `created_by_type=eq.AGENT`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as unknown as RealtimeTaskUpdate

          // Agent ID 필터링
          if (newRecord && !agentIds.includes(newRecord.created_by || '')) {
            return
          }

          switch (eventType) {
            case 'INSERT':
              if (newRecord) {
                console.log('[Realtime] Agent created task:', newRecord.id)
                onTaskInsert?.(newRecord)
              }
              break

            case 'UPDATE':
              if (newRecord) {
                onTaskUpdate?.(newRecord)
              }
              break
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
      })

    channelRef.current = channel
  }, [agentIds, enabled, onTaskInsert, onTaskUpdate, onTaskDelete, onProgressUpdate])

  // Effect: 구독 설정 및 정리
  useEffect(() => {
    setupSubscription()

    return () => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [setupSubscription])

  // 수동 재연결
  const reconnect = useCallback(() => {
    setupSubscription()
  }, [setupSubscription])

  return { reconnect }
}

// ============================================
// Task 활동 실시간 Hook
// ============================================
interface UseTaskActivityRealtimeOptions {
  taskId: string
  onNewActivity?: (activity: any) => void
  enabled?: boolean
}

export function useTaskActivityRealtime({
  taskId,
  onNewActivity,
  enabled = true,
}: UseTaskActivityRealtimeOptions) {
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)

  useEffect(() => {
    if (!enabled || !taskId) return

    const supabase = supabaseRef.current

    const channel = supabase
      .channel(`task-activity-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_activities',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          console.log('[Realtime] New activity:', payload.new)
          onNewActivity?.(payload.new)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [taskId, enabled, onNewActivity])
}

// ============================================
// 진행률 표시 컴포넌트용 유틸리티
// ============================================
export function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-green-500'
  if (progress >= 75) return 'bg-blue-500'
  if (progress >= 50) return 'bg-yellow-500'
  if (progress >= 25) return 'bg-orange-500'
  return 'bg-red-500'
}

export function getProgressLabel(progress: number): string {
  if (progress >= 100) return '완료'
  if (progress >= 75) return '거의 완료'
  if (progress >= 50) return '절반 진행'
  if (progress >= 25) return '진행 중'
  if (progress > 0) return '시작됨'
  return '대기 중'
}
