/**
 * 过滤器配置文件
 * 
 * 本文件定义了所有过滤维度的配置元数据。
 * 新增过滤维度时，只需在此文件添加相应配置即可。
 */

import type { FilterDimension, ResolutionPreset, DurationPreset, AspectRatioPreset } from '../types';

/**
 * 分辨率过滤器配置
 * 
 * 支持4个档位：
 * - lt720p: 有效垂直分辨率 < 720
 * - 720p: 有效垂直分辨率在 720 ± 16px
 * - 1080p: 有效垂直分辨率在 1080 ± 16px
 * - gt1080p: 有效垂直分辨率 > 1080
 */
export const resolutionDimension: FilterDimension<ResolutionPreset> = {
  key: 'resolution',
  label: '📐 分辨率',
  options: [
    { value: 'all', label: '全部' },
    { value: 'lt720p', label: '<720p' },
    { value: '720p', label: '720p' },
    { value: '1080p', label: '1080p' },
    { value: 'gt1080p', label: '>1080p' },
  ],
  defaultValue: 'all',
};

/**
 * 时长过滤器配置
 * 
 * 支持6个互斥区间档位：
 * - lte30s: ≤ 30秒（超短视频/片段）
 * - range30s2m: 30秒 < duration ≤ 2分钟（短视频/音乐MV）
 * - range2m10m: 2分钟 < duration ≤ 10分钟（中短视频/预告片）
 * - range10m30m: 10分钟 < duration ≤ 30分钟（中长视频/剧集）
 * - range30m1h: 30分钟 < duration ≤ 1小时（长视频/电影）
 * - gt1h: > 1小时（超长视频/直播回放）
 */
export const durationDimension: FilterDimension<DurationPreset> = {
  key: 'duration',
  label: '⏱️ 时长',
  options: [
    { value: 'all', label: '全部' },
    { value: 'lte30s', label: '30秒内' },
    { value: 'range30s2m', label: '30秒-2分钟' },
    { value: 'range2m10m', label: '2-10分钟' },
    { value: 'range10m30m', label: '10-30分钟' },
    { value: 'range30m1h', label: '30分钟-1小时' },
    { value: 'gt1h', label: '超过1小时' },
  ],
  defaultValue: 'all',
};

/**
 * 长宽比过滤器配置
 *
 * 借助预设区间快速筛选不同画面形态：
 * - portrait: 竖屏视频（常用于短视频平台）
 * - square: 方形画面（接近 1:1）
 * - standard: 标准横屏（覆盖 4:3 ～ 16:9 常见比例）
 * - ultrawide: 超宽屏（电影宽幅、21:9 等）
 */
export const aspectRatioDimension: FilterDimension<AspectRatioPreset> = {
  key: 'aspectRatio',
  label: '🖼️ 长宽比',
  options: [
    { value: 'all', label: '全部' },
    // 直接显示典型比例数值，便于用户快速识别
    { value: 'portrait', label: '9:16 竖屏' },
    { value: 'square', label: '1:1 方形' },
    { value: 'standard', label: '16:9 标准横屏' },
    { value: 'ultrawide', label: '21:9 宽屏/电影' },
    { value: 'unknown', label: '仅查看未知' },
  ],
  defaultValue: 'all',
};

/**
 * 所有过滤维度的配置列表
 * 
 * 用于批量处理或遍历所有过滤维度
 */
export const allFilterDimensions = [
  resolutionDimension,
  durationDimension,
  aspectRatioDimension,
  // 未来可添加更多维度：
  // fileSizeDimension,
  // codecDimension,
  // frameRateDimension,
] as const;

/**
 * 过滤维度的默认值映射
 * 
 * 用于初始化或重置过滤器状态
 */
export const defaultFilterValues = {
  resolution: resolutionDimension.defaultValue,
  duration: durationDimension.defaultValue,
  aspectRatio: aspectRatioDimension.defaultValue,
} as const;
