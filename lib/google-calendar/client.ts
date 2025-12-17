/**
 * Google Calendar API Client
 * Handles OAuth authentication and Calendar API interactions
 */

import { createClient } from '@/lib/supabase/server'

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/google-calendar/callback'

// Google Calendar API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

export interface GoogleTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
  scope: string
  token_type: string
}

export interface GoogleUserInfo {
  email: string
  id: string
  name?: string
  picture?: string
}

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
    organizer?: boolean
  }>
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: Array<{
      uri: string
      entryPointType: string
    }>
  }
  recurrence?: string[]
  recurringEventId?: string
  status: string
  colorId?: string
}

export interface GoogleCalendarList {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
  accessRole: string
}

/**
 * Generate Google OAuth URL
 */
export function getGoogleAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to exchange code: ${error.error_description || error.error}`)
  }

  return response.json()
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to refresh token: ${error.error_description || error.error}`)
  }

  const tokens = await response.json()
  // Keep the original refresh token if not returned
  return {
    ...tokens,
    refresh_token: tokens.refresh_token || refreshToken,
  }
}

/**
 * Get Google user info
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  return response.json()
}

/**
 * Get user's calendar list
 */
export async function getCalendarList(accessToken: string): Promise<GoogleCalendarList[]> {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to get calendar list')
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Get calendar events
 */
export async function getCalendarEvents(
  accessToken: string,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 250
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  if (timeMin) params.append('timeMin', timeMin)
  if (timeMax) params.append('timeMax', timeMax)

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to get events: ${error.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Get valid access token (refresh if expired)
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = createClient()

  const { data: connection, error } = await (supabase as any)
    .from('google_calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error || !connection) {
    return null
  }

  const now = new Date()
  const tokenExpiry = new Date(connection.token_expiry)

  // If token is still valid (with 5 min buffer), return it
  if (tokenExpiry > new Date(now.getTime() + 5 * 60 * 1000)) {
    return connection.access_token
  }

  // Refresh the token
  try {
    const newTokens = await refreshAccessToken(connection.refresh_token)

    // Update tokens in database
    await (supabase as any)
      .from('google_calendar_connections')
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        token_expiry: new Date(newTokens.expiry_date).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return newTokens.access_token
  } catch (error) {
    console.error('Failed to refresh Google token:', error)

    // Mark connection as inactive if refresh fails
    await (supabase as any)
      .from('google_calendar_connections')
      .update({ is_active: false })
      .eq('id', connection.id)

    return null
  }
}

/**
 * Map Google event color to our color system
 */
export function mapGoogleColorToLocal(colorId?: string): string {
  const colorMap: Record<string, string> = {
    '1': 'blue',    // Lavender
    '2': 'green',   // Sage
    '3': 'purple',  // Grape
    '4': 'pink',    // Flamingo
    '5': 'yellow',  // Banana
    '6': 'orange',  // Tangerine
    '7': 'cyan',    // Peacock
    '8': 'gray',    // Graphite
    '9': 'blue',    // Blueberry
    '10': 'green',  // Basil
    '11': 'red',    // Tomato
  }

  return colorMap[colorId || ''] || 'blue'
}

/**
 * Transform Google Calendar event to our format
 */
export function transformGoogleEvent(event: GoogleCalendarEvent, calendarId: string) {
  const isAllDay = !event.start.dateTime
  const startTime = event.start.dateTime || `${event.start.date}T00:00:00`
  const endTime = event.end.dateTime || `${event.end.date}T23:59:59`

  let meetingUrl = event.hangoutLink
  if (!meetingUrl && event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      (e) => e.entryPointType === 'video'
    )
    meetingUrl = videoEntry?.uri
  }

  return {
    google_event_id: event.id,
    google_calendar_id: calendarId,
    title: event.summary || '(제목 없음)',
    description: event.description,
    location: event.location,
    start_time: startTime,
    end_time: endTime,
    all_day: isAllDay,
    timezone: event.start.timeZone,
    is_recurring: !!event.recurringEventId || !!event.recurrence,
    recurrence_rule: event.recurrence?.[0],
    status: event.status,
    attendees: event.attendees || [],
    meeting_url: meetingUrl,
    color: mapGoogleColorToLocal(event.colorId),
    raw_data: event,
  }
}
