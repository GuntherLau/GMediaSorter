// ==================== 过滤器相关类型 ====================

// 分辨率预设档位
export type ResolutionPreset = 'lt720p' | '720p' | '1080p' | 'gt1080p';

// 时长预设档位（互斥区间）
export type DurationPreset = 
  | 'lte30s'      // ≤ 30秒
  | 'range30s2m'  // 30秒 < duration ≤ 2分钟
  | 'range2m10m'  // 2分钟 < duration ≤ 10分钟
  | 'range10m30m' // 10分钟 < duration ≤ 30分钟
  | 'range30m1h'  // 30分钟 < duration ≤ 1小时
  | 'gt1h';       // > 1小时

// 单一过滤器类型(保持向后兼容)
export type ResolutionFilter = 'all' | ResolutionPreset;
export type DurationFilter = 'all' | DurationPreset;

// 多维度过滤器状态
export interface FilterState {
  resolution: ResolutionFilter;  // 分辨率过滤
  duration: DurationFilter;       // 时长过滤
  // 未来扩展:
  // fileSize?: FileSizeFilter;
  // codec?: CodecFilter;
  // frameRate?: FrameRateFilter;
}

// 过滤器配置元数据(支持泛型)
export interface FilterDimension<T extends string = string> {
  key: string;                    // 过滤维度的唯一标识
  label: string;                  // 显示名称
  options: Array<{
    value: T | 'all';
    label: string;
    icon?: string;                // 可选图标
  }>;
  defaultValue: T | 'all';        // 默认值
}

// ==================== 视频文件类型 ====================

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

// ==================== 重复检测相关类型 ====================

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

// ==================== 相似检测相关类型 ====================

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

// ==================== 检测进度类型 ====================

// 检测进度
export interface DetectionProgress {
  current: number;
  total: number;
  percentage: number;
  message: string;
  currentFile?: string;
}

// ==================== Electron API 类型 ====================

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
