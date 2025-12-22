import {
    IFileSystemProvider,
    FileSystemDirectoryHandle,
    ReadDirectoryOptions,
    DirectoryContent,
    FileSystemFileHandle
} from '../../types/filesystem'

export class ElectronFileSystemProvider implements IFileSystemProvider {

    private projectHandle: FileSystemDirectoryHandle | null = null;
    private fileHandleRegistry = new Map<string, any>(); // Not really needed for Electron but keeps interface happy

    async selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
        // @ts-ignore
        const result = await window.electron.fs.selectDirectory();
        if (!result) return null;
        return result as FileSystemDirectoryHandle;
    }

    getProjectHandle(): FileSystemDirectoryHandle | null {
        return this.projectHandle;
    }

    setProjectHandle(handle: FileSystemDirectoryHandle): void {
        this.projectHandle = handle;
    }

    registerFileHandle(fileId: string, handle: FileSystemFileHandle): void {
        this.fileHandleRegistry.set(fileId, handle);
    }

    async writeFile(fileId: string, content: string): Promise<boolean> {
        // fileId is expected to be the absolute path in Electron mode
        // But the app uses generated IDs (e.g. `local-1234`).
        // We need a mapping or we need the app to use paths as IDs.
        // For now, in file-system-web.ts, fileId maps to a handle.
        // Here, we can expect the caller to pass the PATH if we change the abstraction slightly.

        // Wait, the interface says `writeFile(fileId, content)`.
        // In Web, fileId -> Map -> Handle.
        // In Electron, we need fileId -> Path.

        // The FileTreePanel generates IDs. It also likely has the path.
        // Currently FileTreePanel calls `FileSystemManager.writeFile(file.id, content)`.

        // We need to store path in the registry for Electron then.
        const path = this.fileHandleRegistry.get(fileId);
        if (!path) throw new Error(`File path not found for ID: ${fileId}`);

        // @ts-ignore
        await window.electron.fs.writeFile(path, content);
        return true;
    }

    async readDirectory(
        dirHandle: FileSystemDirectoryHandle,
        path: string = '',
        options: ReadDirectoryOptions = {}
    ): Promise<DirectoryContent> {
        // Use recursive helper to track relative paths
        const allFiles: File[] = [];
        const allHandles = new Map<string, FileSystemFileHandle>();

        const scan = async (currentHandle: any, relativePath: string = '') => {
            // @ts-ignore
            const result: any[] = await window.electron.fs.readDirectory(currentHandle.path, options);

            for (const entry of result) {
                const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

                if (entry.kind === 'file') {
                    // Creates a more robust Fake File object
                    const fakeFile = {
                        name: entry.name,
                        size: entry.size,
                        lastModified: entry.lastModified,
                        type: '', // Generic type
                        webkitRelativePath: entryRelativePath,
                        path: entry.path, // Absolute path for internal Electron use

                        // FormData and fetch need these to work correctly
                        text: async () => {
                            // @ts-ignore
                            return await window.electron.fs.readFile(entry.path);
                        },
                        arrayBuffer: async () => {
                            // @ts-ignore
                            const content = await window.electron.fs.readFile(entry.path);
                            return new TextEncoder().encode(content).buffer;
                        },
                        slice: () => {
                            // Minimal slice implementation
                            return new Blob([]);
                        }
                    };

                    // We treat this fake object as "File"
                    allFiles.push(fakeFile as unknown as File);
                    allHandles.set(entryRelativePath, entry.path as any);

                } else if (entry.kind === 'directory') {
                    const subHandle = {
                        kind: 'directory',
                        name: entry.name,
                        path: entry.path
                    };
                    await scan(subHandle, entryRelativePath);
                }
            }
        };

        await scan(dirHandle, path);
        return { files: allFiles, handles: allHandles };
    }
}
