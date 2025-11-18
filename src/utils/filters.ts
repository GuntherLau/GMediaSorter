/**
 * 过滤器工具函数
 * 
 * 提供各种过滤条件的匹配函数
 */

import type {
  DurationFilter,
  ResolutionFilter,
  AspectRatioFilter,
  VideoFile,
  FilterState,
} from '../types';

/**
 * 时长匹配函数（区间互斥）
 * 
 * 根据给定的时长过滤器判断视频时长是否匹配
 * 注意：各档位之间是互斥的区间，不会有重叠
 * 
 * @param duration - 视频时长（秒），null 表示无时长数据
 * @param filter - 时长过滤器类型
 * @returns 是否匹配过滤条件
 * 
 * @example
 * matchDurationFilter(25, 'lte30s') // true (25秒 ≤ 30秒)
 * matchDurationFilter(60, 'range30s2m') // true (30秒 < 60秒 ≤ 120秒)
 * matchDurationFilter(60, 'lte30s') // false (60秒 > 30秒)
 * matchDurationFilter(null, 'range2m10m') // true (无数据时默认匹配)
 */
export const matchDurationFilter = (
  duration: number | null,
  filter: DurationFilter
): boolean => {
  // 'all' 或无时长数据时默认匹配
  if (filter === 'all' || duration === null) {
    return true;
  }

  // 根据不同区间档位判断（互斥区间）
  switch (filter) {
    case 'lte30s':
      // ≤ 30秒
      return duration <= 30;
    case 'range30s2m':
      // 30秒 < duration ≤ 2分钟(120秒)
      return duration > 30 && duration <= 120;
    case 'range2m10m':
      // 2分钟(120秒) < duration ≤ 10分钟(600秒)
      return duration > 120 && duration <= 600;
    case 'range10m30m':
      // 10分钟(600秒) < duration ≤ 30分钟(1800秒)
      return duration > 600 && duration <= 1800;
    case 'range30m1h':
      // 30分钟(1800秒) < duration ≤ 1小时(3600秒)
      return duration > 1800 && duration <= 3600;
    case 'gt1h':
      // > 1小时(3600秒)
      return duration > 3600;
    default:
      return true;
  }
};

/**
 * 分辨率匹配函数
 * 
 * 根据给定的分辨率过滤器判断视频分辨率是否匹配
 * 注意：使用视频的 resolutionLabel 字段进行匹配
 * 
 * @param resolutionLabel - 视频的分辨率标签
 * @param filter - 分辨率过滤器类型
 * @returns 是否匹配过滤条件
 */
export const matchResolutionFilter = (
  resolutionLabel: string | null,
  filter: ResolutionFilter
): boolean => {
  if (filter === 'all' || resolutionLabel === null) {
    return true;
  }
  return resolutionLabel === filter;
};

/**
 * 解析视频的实际长宽比（宽 / 高）
 *
 * - 若存在 width/height 字段，优先使用数值计算
 * - 若仅存在字符串形式（如 "16:9"），尝试解析
 * - 当数据缺失或异常时返回 null，调用方可自行决定兜底策略
 */
export const computeAspectRatio = (file: VideoFile): number | null => {
  const { width, height, aspectRatio } = file;
  if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
    const ratio = width / height;
    return Number.isFinite(ratio) ? Number(ratio.toFixed(2)) : null;
  }

  if (typeof aspectRatio === 'string' && aspectRatio.includes(':')) {
    const [w, h] = aspectRatio.split(':').map((value) => Number.parseFloat(value));
    if (Number.isFinite(w) && Number.isFinite(h) && h !== 0) {
      const ratio = w / h;
      return Number.isFinite(ratio) ? Number(ratio.toFixed(2)) : null;
    }
  }

  return null;
};

/**
 * 长宽比匹配函数
 *
 * 采用互斥区间降低浮点误差影响，默认对缺失数据保持宽松匹配。
 */
export const matchAspectRatioFilter = (
  ratio: number | null,
  filter: AspectRatioFilter
): boolean => {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'unknown') {
    // 仅查看未知时，只保留缺失或异常长宽比的视频
    return ratio === null || !Number.isFinite(ratio) || ratio <= 0;
  }

  if (ratio === null || !Number.isFinite(ratio) || ratio <= 0) {
    // 对缺失或异常数据保持兼容，避免误过滤
    return true;
  }

  switch (filter) {
    case 'portrait':
      return ratio < 0.9;
    case 'square':
      return ratio >= 0.9 && ratio <= 1.1;
    case 'standard':
      return ratio > 1.1 && ratio <= 1.9;
    case 'ultrawide':
      return ratio > 1.9;
    default:
      return true;
  }
};

/**
 * 多维度过滤函数
 * 
 * 对视频文件应用多个过滤条件（AND 逻辑）
 * 
 * @param file - 视频文件对象
 * @param filters - 过滤器状态
 * @returns 是否通过所有过滤条件
 * 
 * @example
 * const filters = { resolution: '1080p', duration: 'lte10m' };
 * const passed = matchAllFilters(videoFile, filters);
 */
export const matchAllFilters = (
  file: VideoFile,
  filters: FilterState
): boolean => {
  // 分辨率过滤
  if (!matchResolutionFilter(file.resolutionLabel, filters.resolution)) {
    return false;
  }

  // 时长过滤
  if (!matchDurationFilter(file.duration, filters.duration)) {
    return false;
  }

  // 长宽比过滤
  const aspectRatio = computeAspectRatio(file);
  if (!matchAspectRatioFilter(aspectRatio, filters.aspectRatio)) {
    return false;
  }

  // 未来可添加更多过滤维度...
  // if (!matchFileSizeFilter(file.size, filters.fileSize)) {
  //   return false;
  // }

  return true;
};

/**
 * 批量过滤函数
 * 
 * 对视频文件列表应用过滤器，返回符合条件的文件
 * 
 * @param files - 视频文件列表
 * @param filters - 过滤器状态
 * @returns 过滤后的文件列表
 * 
 * @example
 * const filtered = filterVideoFiles(allVideos, {
 *   resolution: '1080p',
 *   duration: 'lte30m'
 * });
 */
export const filterVideoFiles = (
  files: VideoFile[],
  filters: FilterState
): VideoFile[] => {
  return files.filter(file => matchAllFilters(file, filters));
};

/**
 * 检查是否有激活的过滤器
 * 
 * 判断是否有任何非 'all' 的过滤条件
 * 
 * @param filters - 过滤器状态
 * @returns 是否有激活的过滤器
 */
export const hasActiveFilters = (filters: FilterState): boolean => {
  return Object.values(filters).some(value => value !== 'all');
};

/**
 * 格式化时长显示
 * 
 * 将秒数转换为易读的时长格式
 * 
 * @param seconds - 秒数
 * @returns 格式化的时长字符串
 * 
 * @example
 * formatDuration(65) // "1:05"
 * formatDuration(3725) // "1:02:05"
 * formatDuration(null) // "未知"
 */
export const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) {
    return '未知';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};
