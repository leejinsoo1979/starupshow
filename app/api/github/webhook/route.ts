import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * POST /api/github/webhook
 * GitHub Webhook 수신 - 외부 커밋을 GlowUS에 자동 기록
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const event = request.headers.get('x-github-event')

    // Webhook 시크릿 검증 (선택적이지만 권장)
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')}`

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)

    // push 이벤트만 처리
    if (event !== 'push') {
      return NextResponse.json({ message: `Event ${event} ignored` })
    }

    const supabase = createClient()

    // 저장소 정보
    const repository = payload.repository
    const repoFullName = repository.full_name // owner/repo
    const branch = payload.ref.replace('refs/heads/', '')

    // 커밋 처리
    const commits = payload.commits || []

    for (const commit of commits) {
      // GitHub 사용자 이메일로 GlowUS 사용자 찾기
      const { data: user } = await (supabase
        .from('users') as any)
        .select('id')
        .eq('email', commit.author.email)
        .single()

      if (!user) {
        console.log(`User not found for email: ${commit.author.email}`)
        continue
      }

      // 사용자의 스타트업 찾기 (GitHub 저장소와 연결된)
      const { data: integration } = await (supabase
        .from('integrations') as any)
        .select('startup_id')
        .eq('user_id', user.id)
        .eq('type', 'github')
        .eq('metadata->default_repo', repository.name)
        .single()

      // 커밋 기록 저장
      const { error } = await (supabase
        .from('commits') as any)
        .upsert(
          {
            user_id: user.id,
            startup_id: integration?.startup_id || null,
            description: commit.message,
            branch: branch,
            github_sha: commit.id,
            github_url: commit.url,
            files: [
              ...commit.added.map((f: string) => ({ path: f, action: 'added' })),
              ...commit.modified.map((f: string) => ({ path: f, action: 'modified' })),
              ...commit.removed.map((f: string) => ({ path: f, action: 'removed' })),
            ],
            impact_level: detectImpactLevel(commit),
            metadata: {
              repository: repoFullName,
              author: commit.author,
              committer: commit.committer,
              timestamp: commit.timestamp,
            },
          },
          {
            onConflict: 'github_sha',
          }
        )

      if (error) {
        console.error('Failed to save webhook commit:', error)
      }
    }

    return NextResponse.json({
      success: true,
      processed: commits.length,
    })
  } catch (error) {
    console.error('GitHub webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * 커밋 영향도 자동 감지
 */
function detectImpactLevel(commit: {
  message: string
  added: string[]
  modified: string[]
  removed: string[]
}): 'low' | 'medium' | 'high' {
  const message = commit.message.toLowerCase()
  const totalChanges = commit.added.length + commit.modified.length + commit.removed.length

  // 키워드 기반 판단
  if (
    message.includes('breaking') ||
    message.includes('critical') ||
    message.includes('hotfix') ||
    message.includes('security')
  ) {
    return 'high'
  }

  if (
    message.includes('feat') ||
    message.includes('feature') ||
    message.includes('refactor') ||
    totalChanges > 10
  ) {
    return 'medium'
  }

  if (
    message.includes('fix') ||
    message.includes('docs') ||
    message.includes('style') ||
    message.includes('chore') ||
    totalChanges <= 3
  ) {
    return 'low'
  }

  return 'medium'
}
