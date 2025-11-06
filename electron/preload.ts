import { contextBridge, ipcRenderer } from 'electron';
import {
  VideoFile,
  SimilarityOptions,
  ConversionRequest,
  ConversionProgress,
  ConversionResult,
  ContainerConversionRequest,
  ContainerConversionProgress,
  ContainerConversionResult,
} from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
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
  onConversionMenuOpen: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('menu:open-conversion-menu', listener);
    return () => ipcRenderer.off('menu:open-conversion-menu', listener);
  },
  requestConversion: (request: ConversionRequest) =>
    ipcRenderer.invoke('conversion-start', request),
  onConversionProgress: (callback: (progress: ConversionProgress) => void) => {
    const listener = (_event: unknown, progress: ConversionProgress) => callback(progress);
    ipcRenderer.on('conversion-progress', listener);
    return () => ipcRenderer.off('conversion-progress', listener);
  },
  onConversionComplete: (callback: (result: ConversionResult) => void) => {
    const listener = (_event: unknown, result: ConversionResult) => callback(result);
    ipcRenderer.on('conversion-complete', listener);
    return () => ipcRenderer.off('conversion-complete', listener);
  },
  cancelConversion: () => ipcRenderer.invoke('conversion-cancel'),
  onContainerConversionMenuOpen: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('menu:open-container-conversion-menu', listener);
    return () => ipcRenderer.off('menu:open-container-conversion-menu', listener);
  },
  requestContainerConversion: (request: ContainerConversionRequest) =>
    ipcRenderer.invoke('container-conversion-start', request),
  onContainerConversionProgress: (callback: (progress: ContainerConversionProgress) => void) => {
    const listener = (_event: unknown, progress: ContainerConversionProgress) => callback(progress);
    ipcRenderer.on('container-conversion-progress', listener);
    return () => ipcRenderer.off('container-conversion-progress', listener);
  },
  onContainerConversionComplete: (callback: (result: ContainerConversionResult) => void) => {
    const listener = (_event: unknown, result: ContainerConversionResult) => callback(result);
    ipcRenderer.on('container-conversion-complete', listener);
    return () => ipcRenderer.off('container-conversion-complete', listener);
  },
  cancelContainerConversion: () => ipcRenderer.invoke('container-conversion-cancel'),
  openPath: (targetPath: string) => ipcRenderer.invoke('open-path', targetPath),
  getConversionLogPath: () => ipcRenderer.invoke('get-conversion-log-path'),
  getContainerConversionLogPath: () => ipcRenderer.invoke('get-container-conversion-log-path'),
});
