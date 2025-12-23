import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    // Generic IPC invoke for any channel
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

    // File system operations
    fs: {
        selectDirectory: () => ipcRenderer.invoke('fs:select-directory'),
        readDirectory: (path: string, options: any) => ipcRenderer.invoke('fs:read-directory', path, options),
        scanTree: (rootPath: string, options?: {
            includeSystemFiles?: boolean;
            maxDepth?: number;
            includeContent?: boolean;
            contentExtensions?: string[];
        }) => ipcRenderer.invoke('fs:scan-tree', rootPath, options),
        readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
        writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
        fileStats: (dirPath: string) => ipcRenderer.invoke('fs:file-stats', dirPath),
        scanApiRoutes: (dirPath: string) => ipcRenderer.invoke('fs:scan-api-routes', dirPath),
        scanTypes: (dirPath: string, options?: { extensions?: string[] }) => ipcRenderer.invoke('fs:scan-types', dirPath, options),
        scanSchema: (dirPath: string) => ipcRenderer.invoke('fs:scan-schema', dirPath),
    },

    // Git operations
    git: {
        log: (dirPath: string, options?: { maxCommits?: number }) => ipcRenderer.invoke('git:log', dirPath, options),
        branches: (dirPath: string) => ipcRenderer.invoke('git:branches', dirPath),
    },

    // DevTools helper
    openWebviewDevTools: (id?: number) => ipcRenderer.invoke('app:open-webview-devtools', id),

    // Menu event listeners
    onMenuEvent: (event: string, callback: () => void) => {
        ipcRenderer.on(event, callback);
        return () => ipcRenderer.removeListener(event, callback);
    },

    // AI Viewfinder - 화면 공유
    viewfinder: {
        // Webview 캡처 (webContentsId 필요)
        captureWebview: (webContentsId: number, rect?: { x: number; y: number; width: number; height: number }) =>
            ipcRenderer.invoke('viewfinder:capture-webview', webContentsId, rect),

        // 메인 윈도우 캡처
        captureWindow: (rect?: { x: number; y: number; width: number; height: number }) =>
            ipcRenderer.invoke('viewfinder:capture-window', rect),
    },
});
