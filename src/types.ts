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

// 重复检测相关类型
export interface DuplicateGroup {
  id: string;
  hash: string;
  files: VideoFile[];
  totalSize: number;
  wasteSize: number;
  representativeFile: VideoFile;
}

export interface DuplicateResult {
  groups: DuplicateGroup[];
  totalDuplicates: number;
  totalWasteSize: number;
  scanTime: number;
}

// 相似检测相关类型
export interface SimilarityScore {
  duration: number;
  resolution: number;
  fileSize: number;
  visual: number;
  overall: number;
}

export interface SimilarPair {
  file1: VideoFile;
  file2: VideoFile;
  similarity: SimilarityScore;
  overlapFrames?: number;
  overlapDuration?: number;
}

export interface SimilarGroup {
  id: string;
  files: VideoFile[];
  avgSimilarity: number;
  pairs: SimilarPair[];
}

export interface SimilarityResult {
  groups: SimilarGroup[];
  totalSimilarFiles: number;
  scanTime: number;
  threshold: number;
}

// 检测进度
export interface DetectionProgress {
  current: number;
  total: number;
  percentage: number;
  message: string;
  currentFile?: string;
}

// 相似检测选项
export interface SimilarityOptions {
  threshold: number; // 0.6 - 0.95
  checkDuration: boolean;
  checkResolution: boolean;
  checkFileSize: boolean;
  checkVisual: boolean;
}

export interface ElectronAPI {
  selectDirectory: () => Promise<string | undefined>;
  getVideoFiles: (dirPath: string) => Promise<VideoFile[]>;
  moveFile: (sourcePath: string, destPath: string) => Promise<{ success: boolean; error?: string }>;
  copyFile: (sourcePath: string, destPath: string) => Promise<{ success: boolean; error?: string }>;
  detectDuplicates: (files: VideoFile[]) => Promise<DuplicateResult>;
  detectSimilarity: (files: VideoFile[], options: SimilarityOptions) => Promise<SimilarityResult>;
  cancelDetection: (taskId: string) => Promise<void>;
  onDetectionProgress: (callback: (progress: DetectionProgress) => void) => () => void;
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
