
export interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
}

export interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    values(): AsyncIterableIterator<FileSystemHandle>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}

export interface FileSystemWritableFileStream extends WritableStream {
    write(data: any): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
}

export interface ReadDirectoryOptions {
    includeSystemFiles?: boolean;
}

export interface DirectoryContent {
    files: File[];
    handles: Map<string, FileSystemFileHandle>;
}

// The Unified Interface
export interface IFileSystemProvider {
    /**
     * Request the user to select a directory to open.
     * In Web: Triggers window.showDirectoryPicker()
     * In Electron: Triggers dialog.showOpenDialog()
     */
    selectDirectory(): Promise<FileSystemDirectoryHandle | null>;

    /**
     * Recursively read a directory.
     */
    readDirectory(
        dirHandle: FileSystemDirectoryHandle,
        path?: string,
        options?: ReadDirectoryOptions
    ): Promise<DirectoryContent>;

    /**
     * Write content to a file.
     */
    writeFile(fileId: string, content: string): Promise<boolean>;

    /**
     * Register a handle for later use (mainly for Web implementation which needs to cache handles)
     */
    registerFileHandle(fileId: string, handle: FileSystemFileHandle): void;

    /**
     * Get project root handle
      */
    getProjectHandle(): FileSystemDirectoryHandle | null;

    /**
      * Set project root handle
      */
    setProjectHandle(handle: FileSystemDirectoryHandle): void;
}
