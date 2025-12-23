import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(new URL('/settings?error=google_auth_failed', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings?error=missing_params', request.url))
    }

    // State 디코딩
    let stateData: { userId: string; returnUrl: string }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch {
      return NextResponse.redirect(new URL('/settings?error=invalid_state', request.url))
    }

    // Access token 교환
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    // 사용자 정보 가져오기
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(new URL('/settings?error=user_info_failed', request.url))
    }

    const googleUser = await userInfoResponse.json()

    // Supabase에 저장
    const supabase = await createClient()

    // 기존 연결 확인
    const { data: existing } = await supabase
      .from('user_google_connections')
      .select('id')
      .eq('user_id', stateData.userId)
      .single()

    const connectionData = {
      user_id: stateData.userId,
      google_user_id: googleUser.id,
      google_email: googleUser.email,
      google_name: googleUser.name,
      google_avatar_url: googleUser.picture,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope?.split(' ') || [],
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      // 업데이트
      await supabase
        .from('user_google_connections')
        .update(connectionData)
        .eq('id', existing.id)
    } else {
      // 새로 생성
      await supabase
        .from('user_google_connections')
        .insert(connectionData)
    }

    // 성공 - 원래 페이지로 리다이렉트
    return NextResponse.redirect(new URL(stateData.returnUrl + '?google=connected', request.url))
  } catch (error: any) {
    console.error('Google callback error:', error)
    return NextResponse.redirect(new URL('/settings?error=callback_failed', request.url))
  }
}
