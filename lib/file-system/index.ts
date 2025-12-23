/**
 * 통합 파일 시스템 라이브러리
 * - Electron: 로컬 파일시스템
 * - Web: Google Cloud Storage
 */

export interface FileSystemNode {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  children?: FileSystemNode[]
  contentType?: string
  updated?: string
}

export interface FileSystemResult {
  success: boolean
  data?: any
  error?: string
}

// 환경 감지
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electron?.fs
}

export function isWeb(): boolean {
  return !isElectron()
}

// 현재 환경에 따라 적절한 파일시스템 반환
export function getFileSystem(): IFileSystem {
  if (isElectron()) {
    return new LocalFileSystem()
  }
  return new GCSFileSystem()
}

// 파일시스템 인터페이스
export interface IFileSystem {
  // 트리 조회
  getTree(projectId?: string): Promise<FileSystemNode[]>

  // 파일 읽기
  readFile(path: string): Promise<string>

  // 파일 쓰기
  writeFile(path: string, content: string): Promise<FileSystemResult>

  // 파일 삭제
  deleteFile(path: string): Promise<FileSystemResult>

  // 폴더 생성
  createFolder(path: string): Promise<FileSystemResult>

  // 폴더 삭제
  deleteFolder(path: string): Promise<FileSystemResult>

  // 파일/폴더 이동
  move(oldPath: string, newPath: string): Promise<FileSystemResult>

  // 파일/폴더 복사
  copy(src: string, dest: string): Promise<FileSystemResult>
}

// 로컬 파일시스템 (Electron)
class LocalFileSystem implements IFileSystem {
  private get electron() {
    return (window as any).electron
  }

  async getTree(projectPath?: string): Promise<FileSystemNode[]> {
    if (!this.electron?.fs?.scanTree) {
      throw new Error('Electron fs.scanTree not available')
    }

    const path = projectPath || await this.electron.fs.getCwd?.() || '.'
    const tree = await this.electron.fs.scanTree(path, {
      includeSystemFiles: false,
      maxDepth: 10,
    })

    return this.convertTree(tree)
  }

  private convertTree(node: any): FileSystemNode[] {
    if (!node) return []

    if (Array.isArray(node)) {
      return node.map(n => this.convertNode(n)).filter(Boolean) as FileSystemNode[]
    }

    if (node.children) {
      return node.children.map((n: any) => this.convertNode(n)).filter(Boolean) as FileSystemNode[]
    }

    return []
  }

  private convertNode(node: any): FileSystemNode | null {
    if (!node) return null

    return {
      name: node.name,
      path: node.path,
      type: node.type === 'directory' ? 'folder' : 'file',
      size: node.size,
      children: node.children ? this.convertTree(node.children) : undefined,
    }
  }

  async readFile(path: string): Promise<string> {
    if (!this.electron?.fs?.readFile) {
      throw new Error('Electron fs.readFile not available')
    }
    return await this.electron.fs.readFile(path)
  }

  async writeFile(path: string, content: string): Promise<FileSystemResult> {
    if (!this.electron?.fs?.writeFile) {
      return { success: false, error: 'Electron fs.writeFile not available' }
    }

    try {
      await this.electron.fs.writeFile(path, content)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async deleteFile(path: string): Promise<FileSystemResult> {
    if (!this.electron?.fs?.deleteFile) {
      return { success: false, error: 'Electron fs.deleteFile not available' }
    }

    try {
      await this.electron.fs.deleteFile(path)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async createFolder(path: string): Promise<FileSystemResult> {
    if (!this.electron?.fs?.mkdir) {
      return { success: false, error: 'Electron fs.mkdir not available' }
    }

    try {
      await this.electron.fs.mkdir(path)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async deleteFolder(path: string): Promise<FileSystemResult> {
    // 폴더 삭제는 shell.trashItem 사용
    if (!this.electron?.shell?.trashItem) {
      return { success: false, error: 'Electron shell.trashItem not available' }
    }

    try {
      await this.electron.shell.trashItem(path)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async move(oldPath: string, newPath: string): Promise<FileSystemResult> {
    if (!this.electron?.fs?.rename) {
      return { success: false, error: 'Electron fs.rename not available' }
    }

    try {
      await this.electron.fs.rename(oldPath, newPath)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async copy(src: string, dest: string): Promise<FileSystemResult> {
    if (!this.electron?.fs?.copyFile) {
      return { success: false, error: 'Electron fs.copyFile not available' }
    }

    try {
      await this.electron.fs.copyFile(src, dest)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// GCS 파일시스템 (Web)
class GCSFileSystem implements IFileSystem {
  async getTree(projectId?: string): Promise<FileSystemNode[]> {
    const url = projectId ? `/api/gcs/tree?projectId=${projectId}` : '/api/gcs/tree'
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Failed to get tree from GCS')
    }

    const data = await response.json()
    return data.tree || []
  }

  async readFile(path: string): Promise<string> {
    const response = await fetch(`/api/gcs/read?path=${encodeURIComponent(path)}`)

    if (!response.ok) {
      throw new Error('Failed to read file from GCS')
    }

    const data = await response.json()
    return data.content
  }

  async writeFile(path: string, content: string): Promise<FileSystemResult> {
    const response = await fetch('/api/gcs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error }
    }

    return { success: true }
  }

  async deleteFile(path: string): Promise<FileSystemResult> {
    const response = await fetch('/api/gcs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error }
    }

    return { success: true }
  }

  async createFolder(path: string): Promise<FileSystemResult> {
    // GCS는 실제 폴더 개념이 없음, 빈 .keep 파일로 대체
    return this.writeFile(`${path}/.keep`, '')
  }

  async deleteFolder(path: string): Promise<FileSystemResult> {
    // GCS에서 prefix로 모든 파일 삭제 (실제 구현 필요)
    // 일단 간단히 .keep 파일만 삭제
    return this.deleteFile(`${path}/.keep`)
  }

  async move(oldPath: string, newPath: string): Promise<FileSystemResult> {
    // GCS는 이동이 없음 - 복사 후 삭제
    const content = await this.readFile(oldPath)
    const writeResult = await this.writeFile(newPath, content)
    if (!writeResult.success) return writeResult

    return this.deleteFile(oldPath)
  }

  async copy(src: string, dest: string): Promise<FileSystemResult> {
    const content = await this.readFile(src)
    return this.writeFile(dest, content)
  }
}

// 싱글톤 인스턴스
let _fileSystem: IFileSystem | null = null

export function useFileSystem(): IFileSystem {
  if (!_fileSystem) {
    _fileSystem = getFileSystem()
  }
  return _fileSystem
}

// React Hook용
export function useIsWebMode(): boolean {
  if (typeof window === 'undefined') return false
  return isWeb()
}
