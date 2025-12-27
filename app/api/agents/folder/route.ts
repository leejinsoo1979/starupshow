/**
 * Agent Folder API
 * 에이전트를 폴더 기반 코드 구조로 생성/관리하는 API
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { generateAgentFolder } from '@/lib/agent/code-generator'

const GLOWUS_ROOT = process.cwd()
const AGENTS_DIR = path.join(GLOWUS_ROOT, 'agents')

interface AgentFolderRequest {
  name: string
  description?: string
  nodes: Array<{
    id: string
    type: string
    data: Record<string, unknown>
    position: { x: number; y: number }
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
  }>
  metadata?: Record<string, unknown>
}

// POST: 새 에이전트 폴더 생성
export async function POST(request: NextRequest) {
  try {
    const body: AgentFolderRequest = await request.json()
    const { name, description = '', nodes, edges, metadata = {} } = body

    if (!name) {
      return NextResponse.json(
        { error: '에이전트 이름이 필요합니다' },
        { status: 400 }
      )
    }

    if (!nodes || nodes.length === 0) {
      return NextResponse.json(
        { error: '최소 하나의 노드가 필요합니다' },
        { status: 400 }
      )
    }

    // agents 디렉토리 생성 (없으면)
    await fs.mkdir(AGENTS_DIR, { recursive: true })

    // 에이전트 폴더 구조 생성
    const folderStructure = generateAgentFolder(
      name,
      description,
      nodes,
      edges,
      metadata
    )

    // 폴더 경로 확인 (중복 처리)
    let finalFolderPath = path.join(GLOWUS_ROOT, folderStructure.folderPath)
    let counter = 1
    const baseFolderPath = finalFolderPath

    while (await pathExists(finalFolderPath)) {
      finalFolderPath = `${baseFolderPath}_${counter}`
      counter++
    }

    // 폴더 생성
    await fs.mkdir(finalFolderPath, { recursive: true })

    // 파일들 생성
    const createdFiles: string[] = []
    for (const file of folderStructure.files) {
      // 폴더 경로 업데이트 (중복 처리된 경우)
      const relativePath = file.path.replace(
        folderStructure.folderPath,
        path.relative(GLOWUS_ROOT, finalFolderPath)
      )
      const filePath = path.join(GLOWUS_ROOT, relativePath)

      // 부모 디렉토리 생성
      await fs.mkdir(path.dirname(filePath), { recursive: true })

      // 파일 쓰기
      await fs.writeFile(filePath, file.content, 'utf-8')
      createdFiles.push(relativePath)
    }

    const relativeFolderPath = path.relative(GLOWUS_ROOT, finalFolderPath)

    return NextResponse.json({
      success: true,
      folderPath: relativeFolderPath,
      files: createdFiles,
      agentConfig: folderStructure.agentJson,
      message: `에이전트 "${name}" 폴더가 생성되었습니다`,
    })
  } catch (error) {
    console.error('[API/agents/folder] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '폴더 생성 실패' },
      { status: 500 }
    )
  }
}

// GET: 에이전트 폴더 목록 조회
export async function GET() {
  try {
    // agents 디렉토리 확인
    if (!(await pathExists(AGENTS_DIR))) {
      return NextResponse.json({ agents: [] })
    }

    const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true })
    const agents: Array<{
      name: string
      path: string
      hasConfig: boolean
      nodeCount?: number
      createdAt?: string
    }> = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const agentPath = path.join(AGENTS_DIR, entry.name)
        const configPath = path.join(agentPath, 'agent.json')

        let agentInfo: any = {
          name: entry.name,
          path: `agents/${entry.name}`,
          hasConfig: false,
        }

        // agent.json이 있으면 정보 읽기
        if (await pathExists(configPath)) {
          try {
            const configContent = await fs.readFile(configPath, 'utf-8')
            const config = JSON.parse(configContent)
            agentInfo = {
              name: config.name || entry.name,
              path: `agents/${entry.name}`,
              hasConfig: true,
              nodeCount: config.nodes?.length || 0,
              createdAt: config.createdAt,
              description: config.description,
            }
          } catch {
            // JSON 파싱 실패 시 기본 정보만 사용
          }
        }

        agents.push(agentInfo)
      }
    }

    return NextResponse.json({
      agents,
      agentsDir: 'agents',
    })
  } catch (error) {
    console.error('[API/agents/folder] List error:', error)
    return NextResponse.json(
      { error: '에이전트 목록 조회 실패' },
      { status: 500 }
    )
  }
}

// DELETE: 에이전트 폴더 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const folderName = searchParams.get('name')

    if (!folderName) {
      return NextResponse.json(
        { error: '폴더 이름이 필요합니다' },
        { status: 400 }
      )
    }

    const folderPath = path.join(AGENTS_DIR, folderName)

    // 보안: agents 디렉토리 외부 접근 방지
    if (!folderPath.startsWith(AGENTS_DIR)) {
      return NextResponse.json(
        { error: '잘못된 경로입니다' },
        { status: 403 }
      )
    }

    if (!(await pathExists(folderPath))) {
      return NextResponse.json(
        { error: '에이전트 폴더를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 폴더 삭제 (재귀적)
    await fs.rm(folderPath, { recursive: true, force: true })

    return NextResponse.json({
      success: true,
      message: `에이전트 "${folderName}" 폴더가 삭제되었습니다`,
    })
  } catch (error) {
    console.error('[API/agents/folder] Delete error:', error)
    return NextResponse.json(
      { error: '폴더 삭제 실패' },
      { status: 500 }
    )
  }
}

// 경로 존재 여부 확인
async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
