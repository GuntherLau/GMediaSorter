import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getVideoFiles: (dirPath: string) => ipcRenderer.invoke('get-video-files', dirPath),
  moveFile: (sourcePath: string, destPath: string) => 
    ipcRenderer.invoke('move-file', sourcePath, destPath),
  copyFile: (sourcePath: string, destPath: string) => 
    ipcRenderer.invoke('copy-file', sourcePath, destPath),
});
