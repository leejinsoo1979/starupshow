'use client'

import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

type RealtimeTable = 'commits' | 'tasks' | 'projects' | 'summaries' | 'kpi_metrics' | 'investor_access' | 'notifications'

interface UseRealtimeOptions {
  table: RealtimeTable
  teamId?: string
  startupId?: string
  queryKey: string[]
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

export function useRealtime({
  table,
  teamId,
  startupId,
  queryKey,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    const filterId = startupId || teamId
    const filterColumn = startupId ? 'startup_id' : 'team_id'

    const channel = supabase
      .channel(`${table}_changes_${filterId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filterId ? `${filterColumn}=eq.${filterId}` : undefined,
        },
        (payload) => {
          // Invalidate relevant query
          queryClient.invalidateQueries({ queryKey })

          // Call specific handlers
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new)
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new)
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, teamId, startupId, queryKey, queryClient, onInsert, onUpdate, onDelete])
}

/**
 * 태스크 실시간 구독 훅
 */
export function useRealtimeTasks(startupId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!startupId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`tasks:${startupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `startup_id=eq.${startupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', startupId] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [startupId, queryClient])
}

/**
 * KPI 실시간 구독 훅
 */
export function useRealtimeKpis(startupId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!startupId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`kpis:${startupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kpi_metrics',
          filter: `startup_id=eq.${startupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['kpis', startupId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [startupId, queryClient])
}

/**
 * 투자자 요청 실시간 구독 훅 (파운더용)
 */
export function useRealtimeInvestorRequests(startupId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!startupId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`investor-requests:${startupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investor_access',
          filter: `startup_id=eq.${startupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['investor-requests'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [startupId, queryClient])
}

/**
 * Presence (온라인 상태) 훅
 */
export function usePresence(channelName: string, userInfo: { id: string; name: string }) {
  useEffect(() => {
    if (!userInfo.id) return
    const supabase = createClient()

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userInfo.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        console.log('Presence state:', state)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userInfo)
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [channelName, userInfo.id, userInfo.name])
}

/**
 * 브로드캐스트 메시지 훅 (팀 알림용)
 */
export function useBroadcast(
  channelName: string,
  onMessage: (message: any) => void
) {
  const sendMessage = useCallback(
    async (event: string, payload: any) => {
      const supabase = createClient()
      const channel = supabase.channel(channelName)
      await channel.send({
        type: 'broadcast',
        event,
        payload,
      })
    },
    [channelName]
  )

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: '*' }, ({ event, payload }) => {
        onMessage({ event, payload })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName, onMessage])

  return { sendMessage }
}
