import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { bmvbhash } from 'blockhash-core';
import ffprobeStatic from 'ffprobe-static';
// @ts-ignore
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// 设置 ffmpeg 路径
let ffmpegPath = ffmpegInstaller.path;
if (process.env.NODE_ENV === 'production') {
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}
ffmpeg.setFfmpegPath(ffmpegPath);

// 设置 ffprobe 路径
let ffprobePath = ffprobeStatic.path;
if (process.env.NODE_ENV === 'production') {
  ffprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
}
ffmpeg.setFfprobePath(ffprobePath);

/**
 * 从视频中提取关键帧
 * @param videoPath 视频文件路径
 * @param count 提取帧数
 * @returns 帧图片的临时文件路径数组
 */
export async function extractKeyFrames(videoPath: string, count: number = 5): Promise<string[]> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-frames-'));

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count,
        folder: tempDir,
        filename: 'frame-%i.jpg',
        size: '320x240'
      })
      .on('end', async () => {
        try {
          const files = await fs.readdir(tempDir);
          const framePaths = files
            .filter(f => f.startsWith('frame-') && f.endsWith('.jpg'))
            .map(f => path.join(tempDir, f))
            .sort();
          resolve(framePaths);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (err: Error) => {
        reject(new Error(`提取帧失败: ${err.message}`));
      });
  });
}

/**
 * 计算图片的感知哈希值（pHash）
 * @param imagePath 图片路径
 * @returns pHash 值（十六进制字符串）
 */
export async function calculatePerceptualHash(imagePath: string): Promise<string> {
  try {
    // 使用 sharp 读取并处理图片
    const { data } = await sharp(imagePath)
      .resize(16, 16, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 使用 blockhash 计算感知哈希
    const bits = 8; // 8x8 = 64 bits
    const hash = bmvbhash({ data, width: 16, height: 16 }, bits);

    return hash;
  } catch (error) {
    throw new Error(`计算感知哈希失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 计算视频的感知哈希序列
 * @param videoPath 视频路径
 * @param frameCount 提取帧数
 * @returns pHash 序列
 */
export async function calculateVideoFingerprint(
  videoPath: string,
  frameCount: number = 5
): Promise<string[]> {
  let framePaths: string[] = [];
  try {
    framePaths = await extractKeyFrames(videoPath, frameCount);
    const hashes: string[] = [];

    for (const framePath of framePaths) {
      const hash = await calculatePerceptualHash(framePath);
      hashes.push(hash);
    }

    return hashes;
  } finally {
    // 清理临时文件
    if (framePaths.length > 0) {
      const tempDir = path.dirname(framePaths[0]);
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error('清理临时文件失败:', error);
      }
    }
  }
}

/**
 * 计算两个 pHash 序列之间的汉明距离
 * @param hash1 pHash 1
 * @param hash2 pHash 2
 * @returns 汉明距离
 */
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('哈希长度不匹配');
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * 计算两个感知哈希序列的相似度
 * @param hashes1 视频1的哈希序列
 * @param hashes2 视频2的哈希序列
 * @returns 相似度 (0-1)
 */
export function calculateVisualSimilarity(hashes1: string[], hashes2: string[]): number {
  const minLength = Math.min(hashes1.length, hashes2.length);
  if (minLength === 0) return 0;

  let totalDistance = 0;
  let maxPossibleDistance = 0;

  for (let i = 0; i < minLength; i++) {
    const distance = hammingDistance(hashes1[i], hashes2[i]);
    totalDistance += distance;
    maxPossibleDistance += hashes1[i].length;
  }

  // 相似度 = 1 - (平均距离 / 最大可能距离)
  const similarity = 1 - (totalDistance / maxPossibleDistance);
  return Math.max(0, Math.min(1, similarity));
}

/**
 * 清理临时文件
 * @param dirPath 目录路径
 */
export async function cleanupTempFiles(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
}
