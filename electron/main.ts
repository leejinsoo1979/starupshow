import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { fork, ChildProcess } from 'child_process';

// Log for debugging auto-updates in production
autoUpdater.logger = console;

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);
const writeFile = util.promisify(fs.writeFile);

if (process.platform === 'darwin') {
    app.setName('GlowUS');
}

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
const SERVER_PORT = 3999;

function startServer(): Promise<string> {
    const isDev = !app.isPackaged;
    if (isDev) return Promise.resolve('http://localhost:3000');

    return new Promise((resolve, reject) => {
        // Path to server.js in the unpacked resources (unpacked due to 'extraResources')
        // structure: Contents/Resources/server/server.js
        const serverPath = path.join(process.resourcesPath, 'server/server.js');

        console.log('Starting Next.js server from:', serverPath);

        if (!fs.existsSync(serverPath)) {
            console.error('Server file not found at:', serverPath);
            // Fallback just in case relative path is different in some builds
            return reject(new Error(`Server file not found at ${serverPath}`));
        }

        serverProcess = fork(serverPath, [], {
            cwd: path.dirname(serverPath), // Important: Set CWD so Next.js finds .next/static
            env: {
                ...process.env,
                PORT: SERVER_PORT.toString(),
                HOSTNAME: '127.0.0.1',
                NODE_ENV: 'production'
            },
            // Ensure we use the bundled Node executable (Electron) if possible, 
            // but fork usually does the right thing.
        });

        serverProcess.on('error', (err) => {
            console.error('Failed to start server process:', err);
            reject(err);
        });

        // Poll for readiness
        let attempts = 0;
        const maxAttempts = 60; // 30 seconds
        const interval = setInterval(() => {
            fetch(`http://127.0.0.1:${SERVER_PORT}`)
                .then(res => {
                    // 200 is homepage, 404 is also fine (server acts)
                    if (res.status >= 200 && res.status < 500) {
                        clearInterval(interval);
                        console.log('Server is ready!');
                        resolve(`http://127.0.0.1:${SERVER_PORT}`);
                    }
                })
                .catch(() => {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        reject(new Error('Server startup timeout'));
                    }
                });
        }, 500);
    });
}

function stopServer() {
    if (serverProcess) {
        console.log('Stopping server process...');
        serverProcess.kill('SIGKILL'); // Force kill to prevent hanging
        serverProcess = null;
    }
}

async function createWindow() {
    try {
        const startUrl = await startServer();

        mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
            },
            titleBarStyle: 'hiddenInset', // Mac-style seamless header
            backgroundColor: '#111111',
            title: 'GlowUS',
        });

        // Spoof User Agent to allows Google Login (Remove "Electron" identifier)
        const userAgent = mainWindow.webContents.getUserAgent();
        mainWindow.webContents.setUserAgent(userAgent.replace(/Electron\/[0-9\.]+\s/, ''));

        mainWindow.loadURL(startUrl);

        // if (!app.isPackaged) {
        //    mainWindow.webContents.openDevTools();
        // }

        // Handle external links
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

    } catch (err: any) {
        console.error('Failed to create window:', err);
        dialog.showErrorBox('Application Error', `Failed to start the application server.\n\nError: ${err.message}`);
    }
}

app.whenReady().then(() => {
    createWindow();

    // Check for updates on startup
    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify();

        // Detailed update lifecycle events
        autoUpdater.on('update-available', () => {
            console.log('Update available, downloading...');
        });

        autoUpdater.on('update-downloaded', (info) => {
            dialog.showMessageBox({
                type: 'info',
                title: 'Update Ready',
                message: `Version ${info.version} has been downloaded and is ready to install.`,
                buttons: ['Restart and Update', 'Later']
            }).then((result) => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });

        autoUpdater.on('error', (err) => {
            console.error('Update error:', err);
        });
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopServer();
});

// ==========================================
// IPC Handlers (File System Abstraction)
// ==========================================

// 1. Select Directory
ipcMain.handle('fs:select-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const dirPath = result.filePaths[0];
    const name = path.basename(dirPath);

    return {
        kind: 'directory',
        name: name,
        path: dirPath // Important: Absolute path for Electron
    };
});

// 2. Read Directory
ipcMain.handle('fs:read-directory', async (_, dirPath: string, options: { includeSystemFiles?: boolean } = {}) => {
    try {
        const entries = await readdir(dirPath, { withFileTypes: true });

        // Transform to our FileSystemHandle format
        const results = [];

        for (const entry of entries) {
            // Skip system files if not requested
            if (!options.includeSystemFiles) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            }

            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                results.push({
                    kind: 'directory',
                    name: entry.name,
                    path: fullPath
                });
            } else if (entry.isFile()) {
                const stats = await stat(fullPath);
                results.push({
                    kind: 'file',
                    name: entry.name,
                    path: fullPath,
                    size: stats.size,
                    lastModified: stats.mtimeMs
                });
            }
        }

        return results;

    } catch (err) {
        console.error('Failed to read dir:', dirPath, err);
        throw err;
    }
});

// 3. Read File Content
ipcMain.handle('fs:read-file', async (_, filePath: string) => {
    return await readFile(filePath, 'utf-8');
});

// 4. Write File Content
ipcMain.handle('fs:write-file', async (_, filePath: string, content: string) => {
    await writeFile(filePath, content, 'utf-8');
    return true;
});
