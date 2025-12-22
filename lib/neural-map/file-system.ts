import { IFileSystemProvider, FileSystemDirectoryHandle, FileSystemFileHandle, ReadDirectoryOptions, DirectoryContent } from '../../types/filesystem';
import { WebFileSystemProvider } from './file-system-web';
import { ElectronFileSystemProvider } from './file-system-electron';
import { isElectron } from '../utils/electron';

// Factory: Export the correct instance based on environment
export const FileSystemManager: IFileSystemProvider =
    isElectron()
        ? new ElectronFileSystemProvider()
        : new WebFileSystemProvider();

// Re-export provider classes if needed elsewhere
export { WebFileSystemProvider, ElectronFileSystemProvider };
