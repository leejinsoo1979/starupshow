import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleDriveClient } from '@/lib/integrations/google-drive'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // state에 사용자 정보 포함 (콜백에서 사용)
    const state = Buffer.from(JSON.stringify({
      user_id: user.id,
      nonce: randomUUID(),
    })).toString('base64')

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-drive/callback`
    const authUrl = googleDriveClient.getAuthUrl(state, redirectUri)

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error('[Google Drive Auth] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}
