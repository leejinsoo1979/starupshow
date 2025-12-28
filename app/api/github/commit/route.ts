export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGitHubApi } from '@/lib/integrations/github-api'

/**
 * POST /api/github/commit
 * GitHub에 파일 커밋 + GlowUS 커밋 기록 동시 저장
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      code,
      fileName,
      commitMessage,
      branch,
      taskId, // 연결할 태스크 ID (선택)
      startupId, // 스타트업 ID
      repositoryOwner,
      repositoryName,
    } = body

    // 사용자의 GitHub 토큰 가져오기
    const { data: integration } = await (supabase
      .from('integrations') as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'github')
      .single()

    if (!integration?.access_token) {
      return NextResponse.json(
        { error: 'GitHub 연동이 필요합니다. 설정에서 GitHub을 연결하세요.' },
        { status: 400 }
      )
    }

    // GitHub API 인스턴스 생성
    const github = createGitHubApi(
      integration.access_token,
      repositoryOwner || integration.metadata?.default_owner,
      repositoryName || integration.metadata?.default_repo
    )

    // GitHub에 커밋
    const commitResult = await github.commitFile(
      { path: fileName, content: code },
      commitMessage,
      branch
    )

    // GlowUS commits 테이블에 기록 저장
    const { data: commit, error: commitError } = await (supabase
      .from('commits') as any)
      .insert({
        user_id: user.id,
        startup_id: startupId,
        task_id: taskId || null,
        description: commitMessage,
        branch: branch,
        github_sha: commitResult.sha,
        github_url: commitResult.url,
        files: [{ path: fileName, action: 'modified' }],
        impact_level: 'medium',
        metadata: {
          repository: `${repositoryOwner || integration.metadata?.default_owner}/${repositoryName || integration.metadata?.default_repo}`,
          author: commitResult.author,
        },
      })
      .select()
      .single()

    if (commitError) {
      console.error('Failed to save commit to GlowUS:', commitError)
    }

    return NextResponse.json({
      success: true,
      github: commitResult,
      glowus: commit,
    })
  } catch (error) {
    console.error('GitHub commit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to commit' },
      { status: 500 }
    )
  }
}
