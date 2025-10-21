import { VideoFile, DuplicateGroup, DuplicateResult } from '../../src/types';
import { calculateHashesWithProgress } from '../utils/hash';
import { randomUUID } from 'crypto';

export class DuplicateDetectorService {
  private isRunning = false;
  private shouldCancel = false;

  /**
   * 检测重复视频文件
   * @param files 视频文件列表
   * @param onProgress 进度回调
   * @returns 检测结果
   */
  async detectDuplicates(
    files: VideoFile[],
    onProgress?: (current: number, total: number, message: string, file?: string) => void
  ): Promise<DuplicateResult> {
    this.isRunning = true;
    this.shouldCancel = false;

    const startTime = Date.now();

    try {
      // 提取文件路径
      const filePaths = files.map(f => f.path);

      // 计算哈希值
      const hashMap = await calculateHashesWithProgress(
        filePaths,
        (current, total, file) => {
          if (this.shouldCancel) {
            throw new Error('检测已取消');
          }
          const percentage = Math.floor((current / total) * 100);
          const phase = current <= filePaths.length ? '快速扫描' : '精确验证';
          onProgress?.(current, total, `${phase}中... (${percentage}%)`, file);
        }
      );

      if (this.shouldCancel) {
        throw new Error('检测已取消');
      }

      // 构建重复组
      const groups: DuplicateGroup[] = [];
      let totalDuplicates = 0;
      let totalWasteSize = 0;

      for (const [hash, paths] of hashMap.entries()) {
        // 找到对应的 VideoFile 对象
        const duplicateFiles = paths
          .map(path => files.find(f => f.path === path))
          .filter((f): f is VideoFile => f !== undefined);

        if (duplicateFiles.length < 2) continue;

        // 选择代表文件（最早修改的文件）
        const representativeFile = duplicateFiles.reduce((earliest, current) => {
          return new Date(current.modified) < new Date(earliest.modified) ? current : earliest;
        });

        const totalSize = duplicateFiles.reduce((sum, f) => sum + f.size, 0);
        const wasteSize = totalSize - representativeFile.size;

        groups.push({
          id: randomUUID(),
          hash,
          files: duplicateFiles,
          totalSize,
          wasteSize,
          representativeFile
        });

        totalDuplicates += duplicateFiles.length;
        totalWasteSize += wasteSize;
      }

      // 按浪费空间排序
      groups.sort((a, b) => b.wasteSize - a.wasteSize);

      const scanTime = Date.now() - startTime;

      return {
        groups,
        totalDuplicates,
        totalWasteSize,
        scanTime
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 取消当前检测
   */
  cancel(): void {
    this.shouldCancel = true;
  }

  /**
   * 检查是否正在运行
   */
  isDetecting(): boolean {
    return this.isRunning;
  }
}
