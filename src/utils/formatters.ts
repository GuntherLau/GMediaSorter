/**
 * 常用格式化工具函数
 *
 * 收敛文件大小与分辨率转换逻辑，避免组件中重复实现。
 */

import type { VideoFile } from '../types';

/**
 * 将字节数量转换为易读格式
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/**
 * 将视频分辨率格式化为 "宽 × 高" 形式
 */
export const formatResolution = (file: VideoFile): string | null => {
  if (file.width && file.height) {
    return `${file.width} × ${file.height}`;
  }
  return null;
};
