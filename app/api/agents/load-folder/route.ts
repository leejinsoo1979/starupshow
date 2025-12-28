import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder')

    if (!folder) {
      return NextResponse.json({ error: '폴더 이름이 필요합니다' }, { status: 400 })
    }

    // 경로 주입 방지
    if (folder.includes('..') || folder.includes('/')) {
      return NextResponse.json({ error: '잘못된 폴더 이름입니다' }, { status: 400 })
    }

    const agentDir = path.join(process.cwd(), 'agents', folder)

    // 폴더 존재 확인
    try {
      await fs.access(agentDir)
    } catch {
      return NextResponse.json({ error: '에이전트를 찾을 수 없습니다' }, { status: 404 })
    }

    // agent.json 읽기
    const configPath = path.join(agentDir, 'agent.json')
    let config: any = { name: folder, nodes: [], edges: [] }

    try {
      const configContent = await fs.readFile(configPath, 'utf-8')
      config = JSON.parse(configContent)
    } catch {
      console.log('[API] No agent.json found, using defaults')
    }

    return NextResponse.json({
      folderName: folder,
      name: config.name || folder,
      description: config.description || '',
      version: config.version || '1.0.0',
      nodes: config.nodes || [],
      edges: config.edges || [],
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    })
  } catch (error: any) {
    console.error('[API] Load agent error:', error)
    return NextResponse.json(
      { error: error.message || '에이전트 로드 실패' },
      { status: 500 }
    )
  }
}
