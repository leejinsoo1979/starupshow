'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMyNeuronsStore } from '@/lib/my-neurons/store'
import { SYNC_CONFIG } from '@/lib/my-neurons/constants'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseMyNeuronsRealtimeOptions {
  userId?: string
  enabled?: boolean
  onUpdate?: (tableName: string, payload: any) => void
}

export function useMyNeuronsRealtime({
  userId,
  enabled = true,
  onUpdate,
}: UseMyNeuronsRealtimeOptions = {}) {
  const channelsRef = useRef<RealtimeChannel[]>([])
  const setSyncing = useMyNeuronsStore((s) => s.setSyncing)

  // Handle realtime update
  const handleRealtimeUpdate = useCallback(
    (tableName: string, payload: any) => {
      console.log(`[마이뉴런] Realtime update: ${tableName}`, payload)
      setSyncing(true)

      // Call external handler
      onUpdate?.(tableName, payload)

      // Mark sync complete after a short delay
      setTimeout(() => setSyncing(false), 500)
    },
    [onUpdate, setSyncing]
  )

  // Setup realtime subscriptions
  useEffect(() => {
    if (!enabled || !userId || !SYNC_CONFIG.realtimeEnabled) {
      return
    }

    const supabase = createClient()

    // Subscribe to each table
    SYNC_CONFIG.tables.forEach((tableName) => {
      const channel = supabase
        .channel(`my-neurons-${tableName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
            filter: `user_id=eq.${userId}`,
          },
          (payload) => handleRealtimeUpdate(tableName, payload)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[마이뉴런] Subscribed to ${tableName}`)
          }
        })

      channelsRef.current.push(channel)
    })

    // Cleanup subscriptions
    return () => {
      channelsRef.current.forEach((channel) => {
        channel.unsubscribe()
      })
      channelsRef.current = []
    }
  }, [enabled, userId, handleRealtimeUpdate])

  // Return methods
  return {
    isConnected: channelsRef.current.length > 0,
    subscribedTables: SYNC_CONFIG.tables,
  }
}
