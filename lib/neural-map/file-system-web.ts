import {
    IFileSystemProvider,
    FileSystemHandle,
    FileSystemFileHandle,
    FileSystemDirectoryHandle,
    ReadDirectoryOptions,
    DirectoryContent
} from '../../types/filesystem'

// Map to store FileSystemHandles effectively in memory for Web
const fileHandleRegistry = new Map<string, FileSystemFileHandle>()
let projectHandle: FileSystemDirectoryHandle | null = null

export class WebFileSystemProvider implements IFileSystemProvider {

    async selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
        try {
            // @ts-ignore - Window.showDirectoryPicker is experimental
            const handle = await window.showDirectoryPicker()
            return handle as FileSystemDirectoryHandle
        } catch (error) {
            if ((error as any).name === 'AbortError') return null
            throw error
        }
    }

    getProjectHandle(): FileSystemDirectoryHandle | null {
        return projectHandle
    }

    setProjectHandle(handle: FileSystemDirectoryHandle): void {
        projectHandle = handle
        fileHandleRegistry.clear()
    }

    registerFileHandle(fileId: string, handle: FileSystemFileHandle): void {
        fileHandleRegistry.set(fileId, handle)
    }

    async writeFile(fileId: string, content: string): Promise<boolean> {
        const handle = fileHandleRegistry.get(fileId)
        if (!handle) {
            throw new Error(`File handle not found for ID: ${fileId}`)
        }

        const writable = await handle.createWritable()
        await writable.write(content)
        await writable.close()
        return true
    }

    async readDirectory(
        dirHandle: FileSystemDirectoryHandle,
        path: string = '',
        options: ReadDirectoryOptions = {}
    ): Promise<DirectoryContent> {
        const files: File[] = []
        const handles = new Map<string, FileSystemFileHandle>()

        // @ts-ignore
        for await (const entry of dirHandle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name

            // Skip hidden/system files unless requested
            if (!options.includeSystemFiles) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                    continue
                }
            }

            if (entry.kind === 'file') {
                const fileHandle = entry as FileSystemFileHandle
                const file = await fileHandle.getFile()

                handles.set(entryPath, fileHandle)

                Object.defineProperty(file, 'webkitRelativePath', {
                    value: entryPath,
                    writable: true
                })

                files.push(file)
            } else if (entry.kind === 'directory') {
                const subDir = await this.readDirectory(entry as FileSystemDirectoryHandle, entryPath, options)
                files.push(...subDir.files)
                subDir.handles.forEach((v, k) => handles.set(k, v))
            }
        }

        return { files, handles }
    }
}

// Singleton instance for backward compatibility & default usage
export const FileSystemManager = new WebFileSystemProvider()
