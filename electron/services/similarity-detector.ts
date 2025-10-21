import { VideoFile, SimilarityOptions, SimilarityResult, SimilarGroup, SimilarPair } from '../../src/types';
import { calculateVideoFingerprint, calculateVisualSimilarity } from '../utils/video-fingerprint';
import { calculateOverallSimilarity, shouldCompareInDetail } from '../utils/similarity';
import { randomUUID } from 'crypto';
import pLimit from 'p-limit';

export class SimilarityDetectorService {
  private isRunning = false;
  private shouldCancel = false;
  private readonly FINGERPRINT_CONCURRENCY = 2; // 同时处理的视频指纹数

  /**
   * 检测相似视频
   * @param files 视频文件列表
   * @param options 检测选项
   * @param onProgress 进度回调
   * @returns 检测结果
   */
  async detectSimilarity(
    files: VideoFile[],
    options: SimilarityOptions,
    onProgress?: (current: number, total: number, message: string, file?: string) => void
  ): Promise<SimilarityResult> {
    this.isRunning = true;
    this.shouldCancel = false;

    const startTime = Date.now();

    try {
      // 阶段 1: 快速预筛选
      onProgress?.(0, files.length, '预筛选中...', undefined);
      const candidatePairs: [VideoFile, VideoFile][] = [];

      for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
          if (this.shouldCancel) throw new Error('检测已取消');

          const file1 = files[i];
          const file2 = files[j];

          if (shouldCompareInDetail(file1, file2, options.threshold * 0.6)) {
            candidatePairs.push([file1, file2]);
          }
        }
      }

      onProgress?.(
        files.length,
        files.length + candidatePairs.length * 2,
        `预筛选完成，找到 ${candidatePairs.length} 对候选`,
        undefined
      );

      // 阶段 2: 计算视频指纹
      const fingerprintMap = new Map<string, string[]>();
      const limit = pLimit(this.FINGERPRINT_CONCURRENCY);

      const uniqueFiles = new Set<VideoFile>();
      candidatePairs.forEach(([f1, f2]) => {
        uniqueFiles.add(f1);
        uniqueFiles.add(f2);
      });

      const uniqueFilesArray = Array.from(uniqueFiles);
      let processedFingerprints = 0;

      await Promise.all(
        uniqueFilesArray.map((file) =>
          limit(async () => {
            if (this.shouldCancel) throw new Error('检测已取消');

            try {
              onProgress?.(
                files.length + processedFingerprints,
                files.length + uniqueFilesArray.length,
                '提取视频特征中...',
                file.name
              );

              const fingerprint = await calculateVideoFingerprint(file.path, 5);
              fingerprintMap.set(file.path, fingerprint);
              processedFingerprints++;
            } catch (error) {
              console.error(`提取指纹失败: ${file.path}`, error);
              fingerprintMap.set(file.path, []); // 设置空指纹避免后续错误
            }
          })
        )
      );

      if (this.shouldCancel) throw new Error('检测已取消');

      // 阶段 3: 计算相似度
      const similarPairs: SimilarPair[] = [];
      let processedPairs = 0;
      const totalSteps = files.length + uniqueFilesArray.length + candidatePairs.length;

      for (const [file1, file2] of candidatePairs) {
        if (this.shouldCancel) throw new Error('检测已取消');

        processedPairs++;
        onProgress?.(
          files.length + uniqueFilesArray.length + processedPairs,
          totalSteps,
          '计算相似度中...',
          `${file1.name} vs ${file2.name}`
        );

        const fingerprint1 = fingerprintMap.get(file1.path) || [];
        const fingerprint2 = fingerprintMap.get(file2.path) || [];

        if (fingerprint1.length === 0 || fingerprint2.length === 0) {
          continue; // 跳过没有指纹的文件
        }

        const visualSim = calculateVisualSimilarity(fingerprint1, fingerprint2);
        const similarity = calculateOverallSimilarity(file1, file2, visualSim);

        if (similarity.overall >= options.threshold) {
          similarPairs.push({
            file1,
            file2,
            similarity
          });
        }
      }

      if (this.shouldCancel) throw new Error('检测已取消');

      // 构建相似组
      const groups = this.buildSimilarGroups(similarPairs);
      const totalSimilarFiles = new Set(
        groups.flatMap(g => g.files.map(f => f.path))
      ).size;

      const scanTime = Date.now() - startTime;

      return {
        groups,
        totalSimilarFiles,
        scanTime,
        threshold: options.threshold
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 从相似对构建相似组
   * @param pairs 相似对列表
   * @returns 相似组列表
   */
  private buildSimilarGroups(pairs: SimilarPair[]): SimilarGroup[] {
    if (pairs.length === 0) return [];

    // 使用并查集算法构建连通分量
    const fileToGroup = new Map<string, Set<VideoFile>>();
    const groups: Map<Set<VideoFile>, SimilarPair[]> = new Map();

    for (const pair of pairs) {
      const group1 = fileToGroup.get(pair.file1.path);
      const group2 = fileToGroup.get(pair.file2.path);

      if (!group1 && !group2) {
        // 创建新组
        const newGroup = new Set([pair.file1, pair.file2]);
        fileToGroup.set(pair.file1.path, newGroup);
        fileToGroup.set(pair.file2.path, newGroup);
        groups.set(newGroup, [pair]);
      } else if (group1 && !group2) {
        // file2 加入 file1 的组
        group1.add(pair.file2);
        fileToGroup.set(pair.file2.path, group1);
        groups.get(group1)!.push(pair);
      } else if (!group1 && group2) {
        // file1 加入 file2 的组
        group2.add(pair.file1);
        fileToGroup.set(pair.file1.path, group2);
        groups.get(group2)!.push(pair);
      } else if (group1 && group2 && group1 !== group2) {
        // 合并两个组
        const mergedGroup = new Set([...group1, ...group2]);
        const pairsFromGroup1 = groups.get(group1) || [];
        const pairsFromGroup2 = groups.get(group2) || [];

        // 更新所有文件的组引用
        for (const file of mergedGroup) {
          fileToGroup.set(file.path, mergedGroup);
        }

        groups.delete(group1);
        groups.delete(group2);
        groups.set(mergedGroup, [...pairsFromGroup1, ...pairsFromGroup2, pair]);
      } else if (group1 === group2 && group1) {
        // 同一组内的新连接
        const existingPairs = groups.get(group1);
        if (existingPairs) {
          existingPairs.push(pair);
        }
      }
    }

    // 转换为 SimilarGroup 格式
    const result: SimilarGroup[] = [];
    for (const [fileSet, groupPairs] of groups.entries()) {
      const files = Array.from(fileSet);
      const avgSimilarity =
        groupPairs.reduce((sum, p) => sum + p.similarity.overall, 0) / groupPairs.length;

      result.push({
        id: randomUUID(),
        files,
        avgSimilarity,
        pairs: groupPairs
      });
    }

    // 按平均相似度排序
    result.sort((a, b) => b.avgSimilarity - a.avgSimilarity);

    return result;
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
