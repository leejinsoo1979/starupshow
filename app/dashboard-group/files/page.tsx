'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FolderOpen,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  Presentation,
  Cloud,
  HardDrive,
  ChevronRight,
  ChevronDown,
  Search,
  Grid,
  List,
  Upload,
  RefreshCw,
  Settings,
  MoreVertical,
  Download,
  Trash2,
  ExternalLink,
  FolderPlus,
  ArrowLeft,
  Home,
  Link2,
} from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { motion, AnimatePresence } from 'framer-motion'

// 파일 타입 정의
interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  size?: number
  modifiedAt?: string
  mimeType?: string
  source: 'local' | 'google_drive'
  url?: string
  children?: FileItem[]
}

// 파일 아이콘 매핑
const getFileIcon = (item: FileItem) => {
  if (item.type === 'folder') return FolderOpen

  const ext = item.name.split('.').pop()?.toLowerCase()
  const mime = item.mimeType || ''

  if (mime.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) return FileImage
  if (mime.includes('video') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return FileVideo
  if (mime.includes('audio') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) return FileAudio
  if (mime.includes('spreadsheet') || ['xlsx', 'xls', 'csv'].includes(ext || '')) return FileSpreadsheet
  if (mime.includes('presentation') || ['pptx', 'ppt'].includes(ext || '')) return Presentation
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext || '')) return FileCode
  if (['md', 'txt', 'doc', 'docx', 'pdf'].includes(ext || '')) return FileText

  return File
}

// 파일 크기 포맷
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// 날짜 포맷
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FilesPage() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view') || 'all'

  const [activeSource, setActiveSource] = useState<'all' | 'local' | 'google_drive'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  // 로컬 폴더 경로 (Electron에서 설정)
  const [localRootPath, setLocalRootPath] = useState<string | null>(null)

  // Google Drive 연결 상태
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false)
  const [googleDriveAccount, setGoogleDriveAccount] = useState<{
    email: string
    name: string
    avatar_url?: string
  } | null>(null)

  // Electron 환경 체크
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI

  // 로컬 폴더 선택
  const selectLocalFolder = useCallback(async () => {
    if (!isElectron) {
      alert('로컬 파일 접근은 데스크톱 앱에서만 가능합니다.')
      return
    }

    try {
      const result = await (window as any).electronAPI.selectFolder()
      if (result) {
        setLocalRootPath(result)
        localStorage.setItem('files_local_root', result)
        loadFiles('local', result)
      }
    } catch (error) {
      console.error('폴더 선택 실패:', error)
    }
  }, [isElectron])

  // 파일 목록 로드
  const loadFiles = useCallback(async (source: 'local' | 'google_drive' | 'all', path?: string) => {
    setLoading(true)
    try {
      const loadedFiles: FileItem[] = []

      // 로컬 파일 로드
      if ((source === 'all' || source === 'local') && localRootPath && isElectron) {
        const targetPath = path || localRootPath
        const localFiles = await (window as any).electronAPI.readDirectory(targetPath)

        for (const file of localFiles) {
          loadedFiles.push({
            id: `local_${file.path}`,
            name: file.name,
            type: file.isDirectory ? 'folder' : 'file',
            path: file.path,
            size: file.size,
            modifiedAt: file.modifiedTime,
            source: 'local',
          })
        }
      }

      // Google Drive 파일 로드
      if ((source === 'all' || source === 'google_drive') && googleDriveConnected) {
        try {
          const folderId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined
          const res = await fetch(`/api/integrations/google-drive/files?folder_id=${folderId || ''}`)
          if (res.ok) {
            const data = await res.json()
            for (const file of data.resources || []) {
              loadedFiles.push({
                id: `gdrive_${file.id}`,
                name: file.name,
                type: file.type,
                path: file.id,
                size: file.size,
                modifiedAt: file.modified_at,
                mimeType: file.mime_type,
                source: 'google_drive',
                url: file.url,
              })
            }
          }
        } catch (error) {
          console.error('Google Drive 로드 실패:', error)
        }
      }

      // 정렬: 폴더 먼저, 이름순
      loadedFiles.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      setFiles(loadedFiles)
    } catch (error) {
      console.error('파일 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [localRootPath, googleDriveConnected, currentPath, isElectron])

  // 폴더 진입
  const enterFolder = useCallback((item: FileItem) => {
    if (item.type !== 'folder') return

    setCurrentPath(prev => [...prev, item.path])

    if (item.source === 'local') {
      loadFiles('local', item.path)
    } else {
      loadFiles('google_drive')
    }
  }, [loadFiles])

  // 상위 폴더로 이동
  const goBack = useCallback(() => {
    if (currentPath.length === 0) return

    const newPath = currentPath.slice(0, -1)
    setCurrentPath(newPath)

    if (newPath.length === 0) {
      loadFiles(activeSource === 'all' ? 'all' : activeSource)
    } else {
      loadFiles(activeSource === 'all' ? 'all' : activeSource, newPath[newPath.length - 1])
    }
  }, [currentPath, activeSource, loadFiles])

  // 홈으로 이동
  const goHome = useCallback(() => {
    setCurrentPath([])
    loadFiles(activeSource === 'all' ? 'all' : activeSource)
  }, [activeSource, loadFiles])

  // Google Drive 연결
  const connectGoogleDrive = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/google-drive/auth')
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank', 'width=600,height=700')
      }
    } catch (error) {
      console.error('Google Drive 연결 실패:', error)
    }
  }, [])

  // Google Drive 연결 상태 확인
  const checkGoogleDriveConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/google-drive/status')
      if (res.ok) {
        const data = await res.json()
        setGoogleDriveConnected(data.connected)
        if (data.account) {
          setGoogleDriveAccount(data.account)
        }
      }
    } catch (error) {
      console.error('Google Drive 상태 확인 실패:', error)
    }
  }, [])

  // 파일 열기
  const openFile = useCallback(async (item: FileItem) => {
    if (item.type === 'folder') {
      enterFolder(item)
      return
    }

    if (item.source === 'local' && isElectron) {
      await (window as any).electronAPI.openPath(item.path)
    } else if (item.source === 'google_drive' && item.url) {
      window.open(item.url, '_blank')
    }
  }, [enterFolder, isElectron])

  // 파일 삭제
  const deleteFile = useCallback(async (item: FileItem) => {
    if (!confirm(`"${item.name}"을(를) 삭제하시겠습니까?`)) return

    try {
      if (item.source === 'local' && isElectron) {
        await (window as any).electronAPI.trashItem(item.path)
      } else if (item.source === 'google_drive') {
        // Google Drive 삭제 API 호출
        await fetch(`/api/integrations/google-drive/files/${item.path}`, {
          method: 'DELETE',
        })
      }

      // 목록 새로고침
      loadFiles(activeSource === 'all' ? 'all' : activeSource)
    } catch (error) {
      console.error('파일 삭제 실패:', error)
    }
  }, [isElectron, activeSource, loadFiles])

  // 초기 로드
  useEffect(() => {
    // 저장된 로컬 경로 복원
    const savedLocalPath = localStorage.getItem('files_local_root')
    if (savedLocalPath) {
      setLocalRootPath(savedLocalPath)
    }

    // Google Drive 상태 확인
    checkGoogleDriveConnection()
  }, [checkGoogleDriveConnection])

  // 파일 로드
  useEffect(() => {
    if (localRootPath || googleDriveConnected) {
      loadFiles(activeSource === 'all' ? 'all' : activeSource)
    }
  }, [localRootPath, googleDriveConnected, activeSource, loadFiles])

  // 검색 필터링
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 헤더 */}
      <div className="flex-shrink-0 border-b border-border/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">파일·문서</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadFiles(activeSource === 'all' ? 'all' : activeSource)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title={viewMode === 'grid' ? '리스트 보기' : '그리드 보기'}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 소스 탭 */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveSource('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSource === 'all'
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setActiveSource('local')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeSource === 'local'
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            로컬
          </button>
          <button
            onClick={() => setActiveSource('google_drive')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeSource === 'google_drive'
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted'
            }`}
          >
            <FcGoogle className="w-4 h-4" />
            Google Drive
          </button>
        </div>

        {/* 검색바 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="파일 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {/* 경로 탐색 */}
        {currentPath.length > 0 && (
          <div className="flex items-center gap-1 mt-4 text-sm">
            <button
              onClick={goHome}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Home className="w-4 h-4" />
            </button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <button
              onClick={goBack}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-muted-foreground ml-2">
              {currentPath[currentPath.length - 1]?.split('/').pop() || currentPath[currentPath.length - 1]}
            </span>
          </div>
        )}
      </div>

      {/* 컨텐츠 영역 */}
      <div className="flex-1 overflow-auto p-4">
        {/* 연결 안내 */}
        {!localRootPath && activeSource !== 'google_drive' && (
          <div className="mb-4 p-4 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex items-center gap-3">
              <HardDrive className="w-8 h-8 text-muted-foreground" />
              <div className="flex-1">
                <h3 className="font-medium">로컬 폴더 연결</h3>
                <p className="text-sm text-muted-foreground">
                  로컬 파일을 탐색하려면 폴더를 선택하세요.
                </p>
              </div>
              <button
                onClick={selectLocalFolder}
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                폴더 선택
              </button>
            </div>
          </div>
        )}

        {!googleDriveConnected && activeSource !== 'local' && (
          <div className="mb-4 p-4 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex items-center gap-3">
              <FcGoogle className="w-8 h-8" />
              <div className="flex-1">
                <h3 className="font-medium">Google Drive 연결</h3>
                <p className="text-sm text-muted-foreground">
                  Google Drive 파일을 탐색하려면 계정을 연결하세요.
                </p>
              </div>
              <button
                onClick={connectGoogleDrive}
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                연결하기
              </button>
            </div>
          </div>
        )}

        {/* 연결된 계정 표시 */}
        {googleDriveConnected && googleDriveAccount && activeSource !== 'local' && (
          <div className="mb-4 p-3 rounded-lg border border-green-500/30 bg-green-500/10">
            <div className="flex items-center gap-3">
              <FcGoogle className="w-5 h-5" />
              <span className="text-sm">
                <span className="text-green-500">●</span> {googleDriveAccount.email} 연결됨
              </span>
            </div>
          </div>
        )}

        {localRootPath && activeSource !== 'google_drive' && (
          <div className="mb-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-blue-500" />
              <span className="text-sm flex-1 truncate">
                <span className="text-blue-500">●</span> {localRootPath}
              </span>
              <button
                onClick={selectLocalFolder}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                변경
              </button>
            </div>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* 파일 목록 */}
        {!loading && filteredFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mb-4" />
            <p>파일이 없습니다</p>
          </div>
        )}

        {!loading && filteredFiles.length > 0 && (
          <AnimatePresence mode="wait">
            {viewMode === 'list' ? (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                {/* 리스트 헤더 */}
                <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border/50">
                  <div className="col-span-6">이름</div>
                  <div className="col-span-2">크기</div>
                  <div className="col-span-2">수정일</div>
                  <div className="col-span-1">소스</div>
                  <div className="col-span-1"></div>
                </div>

                {filteredFiles.map((item) => {
                  const Icon = getFileIcon(item)
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-12 gap-4 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors"
                      onClick={() => openFile(item)}
                    >
                      <div className="col-span-6 flex items-center gap-3 min-w-0">
                        <Icon className={`w-5 h-5 flex-shrink-0 ${item.type === 'folder' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="col-span-2 text-sm text-muted-foreground flex items-center">
                        {formatFileSize(item.size)}
                      </div>
                      <div className="col-span-2 text-sm text-muted-foreground flex items-center">
                        {formatDate(item.modifiedAt)}
                      </div>
                      <div className="col-span-1 flex items-center">
                        {item.source === 'local' ? (
                          <HardDrive className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FcGoogle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="col-span-1 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteFile(item)
                          }}
                          className="p-1 rounded hover:bg-red-500/20 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
              >
                {filteredFiles.map((item) => {
                  const Icon = getFileIcon(item)
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-lg border border-border/50 hover:border-accent/50 hover:bg-muted/30 cursor-pointer transition-all group"
                      onClick={() => openFile(item)}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="relative mb-3">
                          <Icon className={`w-12 h-12 ${item.type === 'folder' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                          <div className="absolute -bottom-1 -right-1">
                            {item.source === 'local' ? (
                              <HardDrive className="w-4 h-4 text-blue-500" />
                            ) : (
                              <FcGoogle className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                        <span className="text-sm truncate w-full">{item.name}</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {formatFileSize(item.size)}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
