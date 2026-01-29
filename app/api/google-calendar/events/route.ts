export const dynamic = 'force-dynamic'
/**
 * Google Calendar Events API
 * GET /api/google-calendar/events
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import {
  getValidAccessToken,
  getCalendarEvents,
  transformGoogleEvent,
} from '@/lib/google-calendar/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')
    const calendarId = searchParams.get('calendarId') || 'primary'
    const useCache = searchParams.get('cache') !== 'false'

    // Get valid access token (refreshes if needed)
    const accessToken = await getValidAccessToken(user.id)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google Calendar not connected', needsAuth: true },
        { status: 401 }
      )
    }

    // Check cache first if enabled (optimized: check sync time before fetching events)
    if (useCache && timeMin && timeMax) {
      // First check if last sync is recent (fast single row query)
      const { data: connection } = await (supabase as any)
        .from('google_calendar_connections')
        .select('last_sync_at')
        .eq('user_id', user.id)
        .single()

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const lastSyncDate = connection?.last_sync_at
        ? new Date(connection.last_sync_at)
        : null

      // Only fetch cached events if sync is recent
      if (lastSyncDate && lastSyncDate > fiveMinutesAgo) {
        const { data: cachedEvents } = await (supabase as any)
          .from('google_calendar_events_cache')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', timeMin)
          .lte('end_time', timeMax)
          .order('start_time', { ascending: true })

        if (cachedEvents && cachedEvents.length > 0) {
          return NextResponse.json({
            events: cachedEvents,
            fromCache: true,
            lastSync: connection.last_sync_at,
          })
        }
      }
    }

    // Fetch fresh events from Google
    const googleEvents = await getCalendarEvents(
      accessToken,
      calendarId,
      timeMin || undefined,
      timeMax || undefined
    )

    // Transform events to our format
    const transformedEvents = googleEvents.map((event) =>
      transformGoogleEvent(event, calendarId)
    )

    // Return events immediately, update cache in background
    const lastSync = new Date().toISOString()

    // Fire-and-forget cache update (non-blocking)
    ;(async () => {
      try {
        const { data: connection } = await (supabase as any)
          .from('google_calendar_connections')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (connection && transformedEvents.length > 0) {
          // Bulk upsert all events at once (instead of N separate calls)
          const eventsWithMetadata = transformedEvents.map((event) => ({
            ...event,
            connection_id: connection.id,
            user_id: user.id,
          }))

          await (supabase as any)
            .from('google_calendar_events_cache')
            .upsert(eventsWithMetadata, {
              onConflict: 'connection_id,google_event_id',
            })

          // Update last sync time
          await (supabase as any)
            .from('google_calendar_connections')
            .update({ last_sync_at: lastSync })
            .eq('id', connection.id)
        }
      } catch (cacheError) {
        console.error('Background cache update failed:', cacheError)
      }
    })()

    return NextResponse.json({
      events: transformedEvents,
      fromCache: false,
      lastSync,
    })
  } catch (error) {
    console.error('Google Calendar events error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
