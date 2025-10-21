import * as crypto from 'crypto';
import * as fs from 'fs/promises';

/**
 * 计算文件的快速哈希值（仅读取头部、中部、尾部片段）
 * @param filePath 文件路径
 * @param chunkSize 每个片段大小（默认 64KB）
 * @returns 快速哈希值
 */
export async function calculateFastHash(filePath: string, chunkSize: number = 64 * 1024): Promise<string> {
  const fileHandle = await fs.open(filePath, 'r');
  try {
    const stats = await fileHandle.stat();
    const fileSize = stats.size;

    const hash = crypto.createHash('md5');

    // 读取文件头部
    const headBuffer = Buffer.alloc(Math.min(chunkSize, fileSize));
    await fileHandle.read(headBuffer, 0, headBuffer.length, 0);
    hash.update(headBuffer);

    // 如果文件足够大，读取中部
    if (fileSize > chunkSize * 3) {
      const middleOffset = Math.floor(fileSize / 2) - Math.floor(chunkSize / 2);
      const middleBuffer = Buffer.alloc(chunkSize);
      await fileHandle.read(middleBuffer, 0, chunkSize, middleOffset);
      hash.update(middleBuffer);
    }

    // 如果文件足够大，读取尾部
    if (fileSize > chunkSize * 2) {
      const tailOffset = fileSize - chunkSize;
      const tailBuffer = Buffer.alloc(chunkSize);
      await fileHandle.read(tailBuffer, 0, chunkSize, tailOffset);
      hash.update(tailBuffer);
    }

    // 添加文件大小到哈希中，避免不同大小文件的片段碰撞
    hash.update(Buffer.from(fileSize.toString()));

    return hash.digest('hex');
  } finally {
    await fileHandle.close();
  }
}

/**
 * 计算文件的完整哈希值
 * @param filePath 文件路径
 * @returns 完整哈希值
 */
export async function calculateFullHash(filePath: string): Promise<string> {
  const fileHandle = await fs.open(filePath, 'r');
  try {
    const hash = crypto.createHash('md5');
    const stream = fileHandle.createReadStream();

    for await (const chunk of stream) {
      hash.update(chunk);
    }

    return hash.digest('hex');
  } finally {
    await fileHandle.close();
  }
}

/**
 * 两阶段哈希检测：先快速哈希分组，再完整哈希验证
 * @param filePaths 文件路径数组
 * @param onProgress 进度回调
 * @returns 哈希值到文件路径的映射
 */
export async function calculateHashesWithProgress(
  filePaths: string[],
  onProgress?: (current: number, total: number, file: string) => void
): Promise<Map<string, string[]>> {
  const fastHashMap = new Map<string, string[]>();
  const fullHashMap = new Map<string, string[]>();

  // 阶段 1：快速哈希
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    try {
      onProgress?.(i + 1, filePaths.length * 2, filePath);
      const fastHash = await calculateFastHash(filePath);
      const existing = fastHashMap.get(fastHash) || [];
      existing.push(filePath);
      fastHashMap.set(fastHash, existing);
    } catch (error) {
      console.error(`计算快速哈希失败: ${filePath}`, error);
    }
  }

  // 阶段 2：对疑似重复的文件进行完整哈希验证
  const suspiciousGroups = Array.from(fastHashMap.values()).filter(group => group.length > 1);
  const suspiciousFiles = suspiciousGroups.flat();

  let processedInPhase2 = 0;
  for (const group of suspiciousGroups) {
    for (const filePath of group) {
      try {
        processedInPhase2++;
        onProgress?.(
          filePaths.length + processedInPhase2,
          filePaths.length + suspiciousFiles.length,
          filePath
        );
        const fullHash = await calculateFullHash(filePath);
        const existing = fullHashMap.get(fullHash) || [];
        existing.push(filePath);
        fullHashMap.set(fullHash, existing);
      } catch (error) {
        console.error(`计算完整哈希失败: ${filePath}`, error);
      }
    }
  }

  // 只返回真正重复的组（完整哈希相同的文件数 > 1）
  const result = new Map<string, string[]>();
  for (const [hash, files] of fullHashMap.entries()) {
    if (files.length > 1) {
      result.set(hash, files);
    }
  }

  return result;
}
