import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    fs: {
        selectDirectory: () => ipcRenderer.invoke('fs:select-directory'),
        readDirectory: (path: string, options: any) => ipcRenderer.invoke('fs:read-directory', path, options),
        readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
        writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
    }
});
