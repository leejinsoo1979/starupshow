'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, FolderOpen, FileCode, Calendar, Flag, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

interface Project {
  id: string
  name: string
  description?: string
  status: string
  priority: string
  deadline?: string
  folder_path?: string
  created_at: string
  updated_at: string
}

interface ProjectFile {
  id: string
  file_name: string
  file_path: string
  content?: string
  created_at: string
}

interface NeuralNode {
  id: string
  title: string
  content?: string
  summary?: string
  type: string
  tags?: string[]
  created_at: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [project, setProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const projectId = params.id as string

  useEffect(() => {
    async function fetchProject() {
      try {
        const supabase = createClient()

        // 프로젝트 정보 가져오기
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (projectError) throw projectError
        setProject(projectData)

        // API를 통해 프로젝트 파일 가져오기 (RLS 우회)
        const filesResponse = await fetch(`/api/projects/${projectId}/files`)
        const filesData = await filesResponse.json()

        if (filesData.files && filesData.files.length > 0) {
          setFiles(filesData.files)
          setSelectedFile(filesData.files[0])
        }
      } catch (err: unknown) {
        console.error('Error fetching project:', err)
        setError(err instanceof Error ? err.message : '프로젝트를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-500">{error || '프로젝트를 찾을 수 없습니다.'}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>
      </div>
    )
  }

  const priorityColors: Record<string, string> = {
    high: 'text-red-500 bg-red-500/10',
    medium: 'text-yellow-500 bg-yellow-500/10',
    low: 'text-green-500 bg-green-500/10',
  }

  const statusColors: Record<string, string> = {
    active: 'text-blue-500 bg-blue-500/10',
    completed: 'text-green-500 bg-green-500/10',
    pending: 'text-yellow-500 bg-yellow-500/10',
  }

  return (
    <div className={cn('min-h-screen', isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50')}>
      {/* 헤더 */}
      <div className={cn(
        'sticky top-0 z-10 border-b px-6 py-4',
        isDark ? 'bg-[#0a0a0f]/95 border-white/10' : 'bg-white/95 border-gray-200'
      )}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
            )}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              isDark ? 'bg-accent/20' : 'bg-accent/10'
            )}>
              <FolderOpen className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{project.name}</h1>
              {project.description && (
                <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              statusColors[project.status] || 'text-gray-500 bg-gray-500/10'
            )}>
              {project.status}
            </span>
            <span className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              priorityColors[project.priority] || 'text-gray-500 bg-gray-500/10'
            )}>
              {project.priority}
            </span>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* 파일 목록 사이드바 */}
        <div className={cn(
          'w-64 border-r overflow-y-auto',
          isDark ? 'bg-[#0f0f15] border-white/10' : 'bg-white border-gray-200'
        )}>
          <div className="p-4">
            <h2 className={cn(
              'text-sm font-medium mb-3',
              isDark ? 'text-gray-400' : 'text-gray-600'
            )}>
              프로젝트 파일 ({files.length})
            </h2>

            {files.length === 0 ? (
              <p className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-400')}>
                파일이 없습니다.
              </p>
            ) : (
              <div className="space-y-1">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                      selectedFile?.id === file.id
                        ? isDark
                          ? 'bg-accent/20 text-accent'
                          : 'bg-accent/10 text-accent'
                        : isDark
                          ? 'hover:bg-white/5'
                          : 'hover:bg-gray-100'
                    )}
                  >
                    <FileCode className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{file.file_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 프로젝트 정보 */}
          <div className={cn('p-4 border-t', isDark ? 'border-white/10' : 'border-gray-200')}>
            <h2 className={cn(
              'text-sm font-medium mb-3',
              isDark ? 'text-gray-400' : 'text-gray-600'
            )}>
              프로젝트 정보
            </h2>
            <div className="space-y-2 text-sm">
              {project.deadline && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{new Date(project.deadline).toLocaleDateString('ko-KR')}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-gray-500" />
                <span>우선순위: {project.priority}</span>
              </div>
              {project.folder_path && (
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-gray-500" />
                  <span className="truncate text-xs">{project.folder_path}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 파일 내용 */}
        <div className="flex-1 overflow-hidden">
          {selectedFile ? (
            <div className="h-full flex flex-col">
              {/* 파일 헤더 */}
              <div className={cn(
                'flex items-center justify-between px-4 py-3 border-b',
                isDark ? 'bg-[#12121a] border-white/10' : 'bg-gray-50 border-gray-200'
              )}>
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-accent" />
                  <span className="font-medium">{selectedFile.file_name}</span>
                </div>
                {selectedFile.file_path && (
                  <span className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
                    {selectedFile.file_path}
                  </span>
                )}
              </div>

              {/* 코드 내용 */}
              <div className="flex-1 overflow-auto p-4">
                {selectedFile.content ? (
                  <pre className={cn(
                    'text-sm font-mono whitespace-pre-wrap p-4 rounded-lg',
                    isDark ? 'bg-[#1a1a25]' : 'bg-gray-100'
                  )}>
                    <code>{selectedFile.content}</code>
                  </pre>
                ) : (
                  <div className={cn(
                    'flex flex-col items-center justify-center h-full gap-3',
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    <FileCode className="w-12 h-12" />
                    <p>파일 내용을 불러올 수 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={cn(
              'flex flex-col items-center justify-center h-full gap-3',
              isDark ? 'text-gray-500' : 'text-gray-400'
            )}>
              <FolderOpen className="w-16 h-16" />
              <p>파일을 선택하세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
