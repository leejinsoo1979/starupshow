import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GCS_BUCKET = process.env.GCS_BUCKET || 'glowus-projects'

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

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: TreeNode[]
  size?: number
  contentType?: string
}

function buildTree(items: any[], basePrefix: string): TreeNode[] {
  const root: { [key: string]: TreeNode } = {}

  items.forEach((item: any) => {
    const relativePath = item.name.replace(basePrefix, '')
    const parts = relativePath.split('/').filter(Boolean)

    if (parts.length === 0) return

    let current = root
    let currentPath = basePrefix

    parts.forEach((part: string, index: number) => {
      currentPath += part + (index < parts.length - 1 ? '/' : '')

      if (!current[part]) {
        const isFile = index === parts.length - 1 && !item.name.endsWith('/')
        current[part] = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
          size: isFile ? parseInt(item.size) : undefined,
          contentType: isFile ? item.contentType : undefined,
        }
      }

      if (current[part].children !== undefined) {
        const childObj: { [key: string]: TreeNode } = {}
        current[part].children!.forEach(c => { childObj[c.name] = c })
        current = childObj
        current[part].children = Object.values(childObj)
      }
    })
  })

  return Object.values(root)
}

// 전체 파일 트리 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')

    const accessToken = await getAccessToken(supabase, user.id)
    if (!accessToken) {
      return NextResponse.json({ error: 'Google not connected' }, { status: 401 })
    }

    const prefix = projectId ? `${user.id}/${projectId}/` : `${user.id}/`

    // GCS에서 모든 파일 조회 (delimiter 없이)
    let allItems: any[] = []
    let pageToken: string | undefined

    do {
      const gcsUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o?` +
        `prefix=${encodeURIComponent(prefix)}` +
        (pageToken ? `&pageToken=${pageToken}` : '')

      const response = await fetch(gcsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('GCS tree error:', error)
        return NextResponse.json({ error: 'Failed to get tree' }, { status: 500 })
      }

      const data = await response.json()
      allItems = allItems.concat(data.items || [])
      pageToken = data.nextPageToken
    } while (pageToken)

    // 트리 구조로 변환
    const tree = buildTree(allItems, prefix)

    return NextResponse.json({
      tree,
      prefix,
      totalFiles: allItems.length,
    })
  } catch (error: any) {
    console.error('GCS tree error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
