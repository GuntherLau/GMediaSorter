export type ResolutionPreset = 'lt720p' | '720p' | '1080p' | 'gt1080p';

export type ResolutionFilter = 'all' | ResolutionPreset;

export interface VideoFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  extension: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  aspectRatio: string | null;
  resolutionLabel: ResolutionPreset | null;
  effectiveVerticalResolution: number | null;
}

export interface ElectronAPI {
  selectDirectory: () => Promise<string | undefined>;
  getVideoFiles: (dirPath: string) => Promise<VideoFile[]>;
  moveFile: (sourcePath: string, destPath: string) => Promise<{ success: boolean; error?: string }>;
  copyFile: (sourcePath: string, destPath: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
