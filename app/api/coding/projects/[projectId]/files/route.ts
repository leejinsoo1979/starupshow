/**
 * 프로젝트 파일 관리 API
 * GET: 파일 목록 조회
 * POST: 파일 다운로드 (zip)
 */

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs/promises'
import * as path from 'path'
import archiver from 'archiver'
import { Readable } from 'stream'

const SERVER_PROJECTS_DIR = process.env.PROJECTS_DIR || '/tmp/glowus-projects'

interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  content?: string
  children?: FileInfo[]
}

// 디렉토리 재귀 탐색
async function getFileTree(dirPath: string, basePath: string = ''): Promise<FileInfo[]> {
  const items: FileInfo[] = []

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      const relativePath = path.join(basePath, entry.name)

      if (entry.isDirectory()) {
        const children = await getFileTree(fullPath, relativePath)
        items.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children,
        })
      } else {
        const stats = await fs.stat(fullPath)
        const content = await fs.readFile(fullPath, 'utf-8').catch(() => '[Binary file]')

        items.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
          size: stats.size,
          content: content.length > 100000 ? content.slice(0, 100000) + '\n... [truncated]' : content,
        })
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error)
  }

  return items
}

// GET: 파일 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const projectDir = path.join(SERVER_PROJECTS_DIR, projectId)

  try {
    // 프로젝트 디렉토리 존재 확인
    await fs.access(projectDir)

    const files = await getFileTree(projectDir)

    return NextResponse.json({
      success: true,
      projectId,
      projectDir,
      files,
      message: `프로젝트 "${projectId}"의 파일 목록입니다.`,
    })
  } catch (error) {
    // 프로젝트 디렉토리가 없으면 빈 목록 반환
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({
        success: true,
        projectId,
        projectDir,
        files: [],
        message: `프로젝트 "${projectId}"에 생성된 파일이 없습니다.`,
      })
    }

    return NextResponse.json(
      { success: false, error: '파일 목록 조회 실패' },
      { status: 500 }
    )
  }
}

// POST: ZIP 다운로드
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const projectDir = path.join(SERVER_PROJECTS_DIR, projectId)

  try {
    // 프로젝트 디렉토리 존재 확인
    await fs.access(projectDir)

    // ZIP 스트림 생성
    const archive = archiver('zip', { zlib: { level: 9 } })
    const chunks: Buffer[] = []

    archive.on('data', (chunk) => chunks.push(chunk))

    // 디렉토리 전체를 ZIP에 추가
    archive.directory(projectDir, false)

    await archive.finalize()

    // Buffer로 변환
    const zipBuffer = Buffer.concat(chunks)

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${projectId}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('ZIP creation error:', error)

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { success: false, error: '프로젝트에 생성된 파일이 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'ZIP 생성 실패' },
      { status: 500 }
    )
  }
}
