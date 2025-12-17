/**
 * Google Calendar OAuth - Callback Handler
 * GET /api/google-calendar/callback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  getCalendarList,
} from '@/lib/google-calendar/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('[GoogleCalendar Callback] Received params:', {
      hasCode: !!code,
      hasState: !!state,
      error,
      errorDescription,
      fullUrl: request.url,
    })

    // Handle error from Google
    if (error) {
      console.error('Google OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/dashboard-group/calendar?error=google_auth_failed&reason=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard-group/calendar?error=no_code', request.url)
      )
    }

    // Verify state and extract user ID
    let stateData: { userId: string; timestamp: number } | null = null
    try {
      if (state) {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        console.log('[GoogleCalendar Callback] State data:', stateData)
      }
    } catch (e) {
      console.error('Invalid state parameter:', e)
    }

    // Use userId from state (more reliable than session in OAuth callback)
    let userId = stateData?.userId

    // Fallback to session if state doesn't have userId
    if (!userId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
      console.log('[GoogleCalendar Callback] Using session userId:', userId)
    }

    if (!userId) {
      console.error('[GoogleCalendar Callback] No user ID found in state or session')
      return NextResponse.redirect(
        new URL('/dashboard-group/calendar?error=no_user', request.url)
      )
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get Google user info
    const googleUser = await getGoogleUserInfo(tokens.access_token)

    // Get available calendars
    const calendars = await getCalendarList(tokens.access_token)
    const primaryCalendar = calendars.find((c) => c.primary)
    const selectedCalendars = primaryCalendar ? [primaryCalendar.id] : ['primary']

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000))

    // Save or update connection in database using admin client
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    const { error: upsertError } = await (adminClient as any)
      .from('google_calendar_connections')
      .upsert(
        {
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: tokenExpiry.toISOString(),
          google_email: googleUser.email,
          google_account_id: googleUser.id,
          is_active: true,
          sync_enabled: true,
          selected_calendars: selectedCalendars,
          last_sync_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

    if (upsertError) {
      console.error('Failed to save Google connection:', upsertError)
      return NextResponse.redirect(
        new URL('/dashboard-group/calendar?error=save_failed', request.url)
      )
    }

    // Redirect back to calendar with success
    return NextResponse.redirect(
      new URL('/dashboard-group/calendar?google_connected=true', request.url)
    )
  } catch (error) {
    console.error('Google Calendar callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard-group/calendar?error=callback_failed', request.url)
    )
  }
}
