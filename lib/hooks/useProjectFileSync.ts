/**
 * useProjectFileSync - 하이브리드 실시간 프로젝트 파일 동기화 훅
 *
 * 기능:
 * 1. Electron: 로컬 파일 시스템 + chokidar 워처
 * 2. Web: Supabase Storage + Realtime 구독
 * 3. 자동 환경 감지 및 적절한 방식 선택
 * 4. 파일 변경 시 그래프 자동 업데이트
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useNeuralMapStore } from '@/lib/neural-map/store'
import { createBrowserClient } from '@supabase/ssr'
import type { NeuralFile } from '@/lib/neural-map/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseProjectFileSyncOptions {
  projectId: string
  folderPath?: string | null // Electron용 로컬 경로
  projectName?: string
  enabled?: boolean
  debounceMs?: number
}

interface ScanResult {
  path: string
  name: string
  type: 'file' | 'directory'
  children?: ScanResult[]
}

interface StorageFile {
  id: string
  name: string
  path: string
  type: 'pdf' | 'image' | 'video' | 'markdown' | 'code' | 'text' | 'binary'
  url: string
  size: number
  createdAt: string
}

type Environment = 'electron' | 'web' | 'unknown'

// 파일 타입 결정 함수
const getFileType = (fileName: string): 'pdf' | 'image' | 'video' | 'markdown' | 'code' | 'text' | 'binary' => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff']
  if (imageExts.includes(ext)) return 'image'

  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv']
  if (videoExts.includes(ext)) return 'video'

  if (ext === 'pdf') return 'pdf'

  const mdExts = ['md', 'markdown', 'mdx']
  if (mdExts.includes(ext)) return 'markdown'

  const codeExts = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java',
    'cpp', 'c', 'cs', 'php', 'swift', 'kt', 'scala', 'dart',
    'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
    'json', 'yaml', 'yml', 'xml', 'toml', 'ini',
    'sh', 'bash', 'zsh', 'fish', 'sql', 'prisma',
    'env', 'gitignore', 'dockerignore'
  ]
  if (codeExts.includes(ext)) return 'code'

  const textExts = ['txt', 'csv', 'log', 'readme']
  if (textExts.includes(ext)) return 'text'

  return 'text'
}

// 환경 감지
const detectEnvironment = (): Environment => {
  if (typeof window === 'undefined') return 'unknown'
  if (window.electron?.fs) return 'electron'
  return 'web'
}

export function useProjectFileSync({
  projectId,
  folderPath,
  projectName = 'My Project',
  enabled = true,
  debounceMs = 500,
}: UseProjectFileSyncOptions) {
  // Store actions
  const setProjectPath = useNeuralMapStore((s) => s.setProjectPath)
  const setLinkedProject = useNeuralMapStore((s) => s.setLinkedProject)
  const setFiles = useNeuralMapStore((s) => s.setFiles)
  const buildGraphFromFilesAsync = useNeuralMapStore((s) => s.buildGraphFromFilesAsync)
  const files = useNeuralMapStore((s) => s.files)

  // State
  const [environment, setEnvironment] = useState<Environment>('unknown')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)
  const lastFolderPathRef = useRef<string | null>(null)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null)

  // 환경 감지
  useEffect(() => {
    setEnvironment(detectEnvironment())
  }, [])

  // Supabase 클라이언트 초기화 (Web용)
  useEffect(() => {
    if (environment === 'web' && !supabaseRef.current) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseAnonKey) {
        supabaseRef.current = createBrowserClient(supabaseUrl, supabaseAnonKey)
      }
    }
  }, [environment])

  // ==============================
  // ELECTRON: 로컬 파일 시스템
  // ==============================

  const scanLocalFiles = useCallback(async (dirPath: string) => {
    const electron = (window as any).electron
    if (!electron?.fs?.scanTree) {
      console.warn('[useProjectFileSync] Electron API not available')
      return []
    }

    try {
      console.log('[useProjectFileSync] 🔍 Scanning local folder:', dirPath)
      setIsLoading(true)

      const scanResult = await electron.fs.scanTree(dirPath, {
        showHidden: false,
        maxDepth: 10,
      })

      if (!scanResult?.tree) {
        console.warn('[useProjectFileSync] No tree in scan result')
        return []
      }

      const neuralFiles: NeuralFile[] = []
      const timestamp = Date.now()

      const flattenTree = (node: ScanResult, depth = 0) => {
        if (node.type === 'file') {
          neuralFiles.push({
            id: `local-${timestamp}-${neuralFiles.length}`,
            name: node.name,
            path: node.path,
            type: getFileType(node.name),
            mapId: '',
            url: '',
            size: 0,
            createdAt: new Date().toISOString(),
          })
        }
        if (node.children) {
          node.children.forEach((child) => flattenTree(child, depth + 1))
        }
      }

      flattenTree(scanResult.tree)
      console.log(`[useProjectFileSync] ✅ Scanned ${neuralFiles.length} local files`)

      return neuralFiles
    } catch (err) {
      console.error('[useProjectFileSync] Local scan error:', err)
      setError(err instanceof Error ? err.message : 'Scan error')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const startElectronWatcher = useCallback(async (dirPath: string) => {
    const electron = (window as any).electron
    if (!electron?.fs?.watchStart) return

    try {
      const result = await electron.fs.watchStart(dirPath)
      if (result.success) {
        console.log('[useProjectFileSync] 👁️ Electron watcher started:', result.path)
      }
    } catch (err) {
      console.warn('[useProjectFileSync] Watcher start failed:', err)
    }
  }, [])

  // ==============================
  // WEB: Supabase Storage
  // ==============================

  const fetchStorageFiles = useCallback(async () => {
    if (!supabaseRef.current) return []

    try {
      console.log('[useProjectFileSync] 🔍 Fetching Storage files for project:', projectId)
      setIsLoading(true)

      const response = await fetch(`/api/projects/${projectId}/workspace`)
      if (!response.ok) {
        throw new Error('Failed to fetch workspace files')
      }

      const storageFiles: StorageFile[] = await response.json()

      // NeuralFile 형식으로 변환
      const neuralFiles: NeuralFile[] = storageFiles
        .filter(f => !f.name.startsWith('.')) // 숨김 파일 제외
        .map((file) => ({
          id: file.id || `storage-${file.path}`,
          name: file.name,
          path: file.path,
          type: file.type,
          mapId: '',
          url: file.url,
          size: file.size,
          createdAt: file.createdAt,
        }))

      console.log(`[useProjectFileSync] ✅ Fetched ${neuralFiles.length} Storage files`)
      return neuralFiles
    } catch (err) {
      console.error('[useProjectFileSync] Storage fetch error:', err)
      setError(err instanceof Error ? err.message : 'Fetch error')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const setupRealtimeSubscription = useCallback(() => {
    if (!supabaseRef.current || realtimeChannelRef.current) return

    console.log('[useProjectFileSync] 📡 Setting up Realtime subscription')

    // Storage 이벤트는 직접 구독이 어려우므로, 폴링 방식과 혼합
    // neural_files 테이블 변경을 구독 (neural map에 파일이 추가될 때)
    const channel = supabaseRef.current
      .channel(`project-files-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'neural_files',
          // filter: 프로젝트별 필터링은 별도 처리 필요
        },
        (payload) => {
          console.log('[useProjectFileSync] 📝 Realtime event:', payload.eventType)
          // 파일 변경 시 다시 로드
          debouncedRefresh()
        }
      )
      .subscribe((status) => {
        console.log('[useProjectFileSync] Realtime subscription status:', status)
      })

    realtimeChannelRef.current = channel
  }, [projectId])

  // ==============================
  // 공통 로직
  // ==============================

  const loadAndSetFiles = useCallback(async () => {
    let neuralFiles: NeuralFile[] = []

    if (environment === 'electron' && folderPath) {
      // Electron: 로컬 파일 스캔
      neuralFiles = await scanLocalFiles(folderPath)
    } else if (environment === 'web') {
      // Web: Supabase Storage에서 가져오기
      neuralFiles = await fetchStorageFiles()
    }

    if (neuralFiles.length > 0) {
      setFiles(neuralFiles)
      await buildGraphFromFilesAsync()
    }

    return neuralFiles
  }, [environment, folderPath, scanLocalFiles, fetchStorageFiles, setFiles, buildGraphFromFilesAsync])

  const debouncedRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      console.log('[useProjectFileSync] 🔄 Debounced refresh')
      await loadAndSetFiles()
    }, debounceMs)
  }, [loadAndSetFiles, debounceMs])

  // ==============================
  // 초기화 Effect
  // ==============================

  useEffect(() => {
    if (!enabled || environment === 'unknown') return

    // Electron: folderPath가 있어야 동작
    if (environment === 'electron' && !folderPath) return

    // 이미 초기화됐으면 스킵
    const cacheKey = environment === 'electron' ? (folderPath || '') : `storage-${projectId}`
    if (lastFolderPathRef.current === cacheKey && isInitializedRef.current) return

    console.log(`[useProjectFileSync] 🚀 Initializing (${environment}) for:`, cacheKey)

    // Store 업데이트
    if (folderPath) {
      setProjectPath(folderPath)
    }
    setLinkedProject(projectId, projectName)

    // 초기 파일 로드
    loadAndSetFiles()

    // 환경별 실시간 동기화 설정
    if (environment === 'electron' && folderPath) {
      // Electron: 파일 워처 시작
      startElectronWatcher(folderPath)

      // 파일 변경 이벤트 리스너
      const electron = (window as any).electron
      let unsubscribe: (() => void) | undefined

      if (electron?.fs?.onChanged) {
        unsubscribe = electron.fs.onChanged((data: { path: string; type: 'create' | 'change' | 'delete' }) => {
          console.log('[useProjectFileSync] 📝 Local file changed:', data.type, data.path)
          debouncedRefresh()
        })
      }

      isInitializedRef.current = true
      lastFolderPathRef.current = cacheKey

      return () => {
        console.log('[useProjectFileSync] 🧹 Cleaning up Electron watcher')
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        if (unsubscribe) unsubscribe()
        if (electron?.fs?.watchStop) electron.fs.watchStop()
      }
    } else if (environment === 'web') {
      // Web: Realtime 구독 설정
      setupRealtimeSubscription()

      // 주기적 폴링 (Storage 변경 감지 보조)
      const pollInterval = setInterval(() => {
        console.log('[useProjectFileSync] 🔄 Polling Storage files')
        loadAndSetFiles()
      }, 30000) // 30초마다

      isInitializedRef.current = true
      lastFolderPathRef.current = cacheKey

      return () => {
        console.log('[useProjectFileSync] 🧹 Cleaning up Web subscription')
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        clearInterval(pollInterval)
        if (realtimeChannelRef.current) {
          supabaseRef.current?.removeChannel(realtimeChannelRef.current)
          realtimeChannelRef.current = null
        }
      }
    }
  }, [
    enabled,
    environment,
    folderPath,
    projectId,
    projectName,
    setProjectPath,
    setLinkedProject,
    loadAndSetFiles,
    startElectronWatcher,
    setupRealtimeSubscription,
    debouncedRefresh,
  ])

  // 수동 새로고침 함수
  const refresh = useCallback(async () => {
    console.log('[useProjectFileSync] 🔄 Manual refresh')
    return loadAndSetFiles()
  }, [loadAndSetFiles])

  // 파일 업로드 함수 (Web용)
  const uploadFile = useCallback(async (file: File, relativePath?: string) => {
    if (environment !== 'web') {
      console.warn('[useProjectFileSync] uploadFile is only available in web environment')
      return null
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (relativePath) {
        formData.append('path', relativePath)
      }

      const response = await fetch(`/api/projects/${projectId}/workspace`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const uploaded = await response.json()
      console.log('[useProjectFileSync] ✅ File uploaded:', uploaded.name)

      // 파일 목록 새로고침
      await loadAndSetFiles()

      return uploaded
    } catch (err) {
      console.error('[useProjectFileSync] Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload error')
      return null
    }
  }, [environment, projectId, loadAndSetFiles])

  // 파일 삭제 함수 (Web용)
  const deleteFile = useCallback(async (filePath: string) => {
    if (environment !== 'web') {
      console.warn('[useProjectFileSync] deleteFile is only available in web environment')
      return false
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/workspace?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      console.log('[useProjectFileSync] ✅ File deleted:', filePath)

      // 파일 목록 새로고침
      await loadAndSetFiles()

      return true
    } catch (err) {
      console.error('[useProjectFileSync] Delete error:', err)
      setError(err instanceof Error ? err.message : 'Delete error')
      return false
    }
  }, [environment, projectId, loadAndSetFiles])

  return {
    files,
    refresh,
    uploadFile,
    deleteFile,
    isInitialized: isInitializedRef.current,
    isLoading,
    error,
    environment,
    folderPath: lastFolderPathRef.current,
  }
}

export default useProjectFileSync
