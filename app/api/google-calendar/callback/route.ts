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

    // Verify state
    let stateData: { userId: string; timestamp: number } | null = null
    try {
      if (state) {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      }
    } catch {
      console.error('Invalid state parameter')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth-group/login?redirect=/dashboard-group/calendar', request.url)
      )
    }

    // Verify state matches current user
    if (stateData && stateData.userId !== user.id) {
      return NextResponse.redirect(
        new URL('/dashboard-group/calendar?error=state_mismatch', request.url)
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

    // Save or update connection in database
    const { error: upsertError } = await (supabase as any)
      .from('google_calendar_connections')
      .upsert(
        {
          user_id: user.id,
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
