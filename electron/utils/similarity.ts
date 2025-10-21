import { VideoFile, SimilarityScore } from '../../src/types';

/**
 * 计算时长相似度
 * @param duration1 视频1时长（秒）
 * @param duration2 视频2时长（秒）
 * @param tolerance 容差百分比（默认 5%）
 * @returns 相似度 (0-1)
 */
export function calculateDurationSimilarity(
  duration1: number | null,
  duration2: number | null,
  tolerance: number = 0.05
): number {
  if (!duration1 || !duration2) return 0;

  const diff = Math.abs(duration1 - duration2);
  const avg = (duration1 + duration2) / 2;
  const ratio = diff / avg;

  if (ratio <= tolerance) return 1;
  if (ratio >= 1) return 0;

  return 1 - ratio;
}

/**
 * 计算分辨率相似度
 * @param file1 视频文件1
 * @param file2 视频文件2
 * @returns 相似度 (0-1)
 */
export function calculateResolutionSimilarity(file1: VideoFile, file2: VideoFile): number {
  if (!file1.width || !file1.height || !file2.width || !file2.height) return 0;

  const pixels1 = file1.width * file1.height;
  const pixels2 = file2.width * file2.height;

  const ratio = Math.min(pixels1, pixels2) / Math.max(pixels1, pixels2);
  return ratio;
}

/**
 * 计算文件大小相似度
 * @param size1 文件1大小
 * @param size2 文件2大小
 * @param tolerance 容差百分比（默认 10%）
 * @returns 相似度 (0-1)
 */
export function calculateFileSizeSimilarity(
  size1: number,
  size2: number,
  tolerance: number = 0.1
): number {
  const diff = Math.abs(size1 - size2);
  const avg = (size1 + size2) / 2;
  const ratio = diff / avg;

  if (ratio <= tolerance) return 1;
  if (ratio >= 1) return 0;

  return 1 - ratio;
}

/**
 * 计算综合相似度
 * @param file1 视频文件1
 * @param file2 视频文件2
 * @param visualSimilarity 视觉相似度
 * @param weights 各维度权重
 * @returns 相似度评分对象
 */
export function calculateOverallSimilarity(
  file1: VideoFile,
  file2: VideoFile,
  visualSimilarity: number,
  weights = {
    duration: 0.2,
    resolution: 0.15,
    fileSize: 0.15,
    visual: 0.5
  }
): SimilarityScore {
  const durationSim = calculateDurationSimilarity(file1.duration, file2.duration);
  const resolutionSim = calculateResolutionSimilarity(file1, file2);
  const fileSizeSim = calculateFileSizeSimilarity(file1.size, file2.size);

  const overall =
    durationSim * weights.duration +
    resolutionSim * weights.resolution +
    fileSizeSim * weights.fileSize +
    visualSimilarity * weights.visual;

  return {
    duration: durationSim,
    resolution: resolutionSim,
    fileSize: fileSizeSim,
    visual: visualSimilarity,
    overall
  };
}

/**
 * 快速预筛选：基于元数据判断是否需要进行详细比对
 * @param file1 视频文件1
 * @param file2 视频文件2
 * @param minThreshold 最低阈值
 * @returns 是否需要详细比对
 */
export function shouldCompareInDetail(
  file1: VideoFile,
  file2: VideoFile,
  minThreshold: number = 0.5
): boolean {
  // 快速检查：时长相似度
  const durationSim = calculateDurationSimilarity(file1.duration, file2.duration, 0.05);
  if (durationSim < minThreshold) return false;

  // 快速检查：分辨率相似度
  const resolutionSim = calculateResolutionSimilarity(file1, file2);
  if (resolutionSim < minThreshold) return false;

  // 快速检查：文件大小相似度
  const fileSizeSim = calculateFileSizeSimilarity(file1.size, file2.size, 0.1);
  if (fileSizeSim < minThreshold) return false;

  return true;
}
