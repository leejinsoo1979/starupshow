import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const agentsDir = path.join(process.cwd(), 'agents')

    // agents 폴더가 없으면 빈 배열 반환
    try {
      await fs.access(agentsDir)
    } catch {
      return NextResponse.json({ agents: [] })
    }

    // 에이전트 폴더 목록 가져오기
    const entries = await fs.readdir(agentsDir, { withFileTypes: true })
    const agents = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const agentDir = path.join(agentsDir, entry.name)
        const configPath = path.join(agentDir, 'agent.json')

        try {
          const configContent = await fs.readFile(configPath, 'utf-8')
          const config = JSON.parse(configContent)
          agents.push({
            folderName: entry.name,
            name: config.name || entry.name,
            description: config.description || '',
            version: config.version || '1.0.0',
            nodeCount: config.nodes?.length || 0,
            edgeCount: config.edges?.length || 0,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
          })
        } catch {
          // agent.json이 없거나 파싱 실패하면 기본 정보만
          agents.push({
            folderName: entry.name,
            name: entry.name,
            description: '',
            version: '1.0.0',
            nodeCount: 0,
            edgeCount: 0,
          })
        }
      }
    }

    // 최신순 정렬
    agents.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ agents })
  } catch (error: any) {
    console.error('[API] List agents error:', error)
    return NextResponse.json(
      { error: error.message || '에이전트 목록 조회 실패' },
      { status: 500 }
    )
  }
}
