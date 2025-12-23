import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GCS_BUCKET = process.env.GCS_BUCKET || 'glowus-projects'

// 토큰 갱신 함수
async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.access_token
  } catch {
    return null
  }
}

async function getAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: connection } = await supabase
    .from('user_google_connections')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!connection) return null

  const expiresAt = new Date(connection.token_expires_at)
  if (expiresAt <= new Date()) {
    const newToken = await refreshGoogleToken(connection.refresh_token)
    if (!newToken) return null

    await supabase
      .from('user_google_connections')
      .update({
        access_token: newToken,
        token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      })
      .eq('user_id', userId)

    return newToken
  }

  return connection.access_token
}

// 파일 내용 읽기
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 })
    }

    const accessToken = await getAccessToken(supabase, user.id)
    if (!accessToken) {
      return NextResponse.json({ error: 'Google not connected' }, { status: 401 })
    }

    // GCS에서 파일 읽기
    const readUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(path)}?alt=media`

    const response = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      const error = await response.text()
      console.error('GCS read error:', error)
      return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
    }

    const contentType = response.headers.get('content-type') || 'text/plain'

    // 바이너리 파일 처리
    if (contentType.startsWith('image/') || contentType.startsWith('application/')) {
      const buffer = await response.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
        },
      })
    }

    // 텍스트 파일
    const content = await response.text()

    return NextResponse.json({
      content,
      contentType,
    })
  } catch (error: any) {
    console.error('GCS read error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
