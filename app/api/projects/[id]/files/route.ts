import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

interface NeuralNode {
  id: string
  title: string
  content: string | null
  summary: string | null
  type: string
  created_at: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = createAdminClient()

    // neural_nodes에서 프로젝트와 연결된 파일 노드 조회
    const { data: nodesData, error } = await supabase
      .from('neural_nodes')
      .select('id, title, content, summary, type, created_at')
      .like('summary', `project:${projectId}%`)
      .order('title')

    if (error) {
      console.error('[API] Error fetching files:', error)
      return NextResponse.json({ files: [] })
    }

    // NeuralNode를 ProjectFile 형식으로 변환
    const files = ((nodesData || []) as NeuralNode[]).map((node) => {
      const filePath = node.summary?.split('|파일: ')[1] || node.title
      return {
        id: node.id,
        file_name: node.title,
        file_path: filePath,
        content: node.content || '',
        created_at: node.created_at,
      }
    })

    return NextResponse.json({ files })
  } catch (err) {
    console.error('[API] Error:', err)
    return NextResponse.json({ files: [] })
  }
}
