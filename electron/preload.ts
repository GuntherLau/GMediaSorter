import { contextBridge, ipcRenderer } from 'electron';
import { VideoFile, SimilarityOptions } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getVideoFiles: (dirPath: string) => ipcRenderer.invoke('get-video-files', dirPath),
  moveFile: (sourcePath: string, destPath: string) => 
    ipcRenderer.invoke('move-file', sourcePath, destPath),
  copyFile: (sourcePath: string, destPath: string) => 
    ipcRenderer.invoke('copy-file', sourcePath, destPath),
  deleteFile: (filePath: string) =>
    ipcRenderer.invoke('delete-file', filePath),
  detectDuplicates: (files: VideoFile[]) =>
    ipcRenderer.invoke('detect-duplicates', files),
  detectSimilarity: (files: VideoFile[], options: SimilarityOptions) =>
    ipcRenderer.invoke('detect-similarity', files, options),
  cancelDetection: (taskId: string) =>
    ipcRenderer.invoke('cancel-detection', taskId),
  onDetectionProgress: (callback: (progress: any) => void) => {
    const listener = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('detection-progress', listener);
    return () => ipcRenderer.off('detection-progress', listener);
  },
});
