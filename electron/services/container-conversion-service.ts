import { app } from 'electron';
import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs/promises';
import type {
  ContainerConversionRequest,
  ContainerConversionProgress,
  ContainerConversionResult,
  ContainerConversionFileSuccess,
  ContainerConversionFileFailure,
  ContainerFormat,
} from '../../src/types';

const TARGET_CONTAINER_ALIASES: Record<ContainerFormat, string[]> = {
  mp4: ['mp4', 'mov', 'm4a', '3gp', '3g2', 'mj2'],
  mkv: ['matroska', 'webm', 'mkv'],
};

export class ContainerConversionService {
  private running = false;
  private cancelling = false;
  private currentCommand: FfmpegCommand | null = null;

  async convert(
    request: ContainerConversionRequest,
    onProgress: (progress: ContainerConversionProgress) => void,
  ): Promise<ContainerConversionResult> {
    if (this.running) {
      throw new Error('已有容器转换任务正在执行，请稍后再试');
    }

    this.running = true;
    this.cancelling = false;

    const total = request.filePaths.length;
    const success: ContainerConversionFileSuccess[] = [];
    const failures: ContainerConversionFileFailure[] = [];
    const startedAt = Date.now();

    onProgress({
      total,
      processed: 0,
      successCount: 0,
      failureCount: 0,
      percentage: total === 0 ? 100 : 0,
      status: 'running',
    });

    try {
      await fs.mkdir(request.outputDir, { recursive: true });

      for (let index = 0; index < total; index += 1) {
        if (this.cancelling) {
          break;
        }

        const inputPath = request.filePaths[index];
        const currentFileName = path.basename(inputPath);
        const outputPath = await this.resolveOutputPath(request.outputDir, inputPath, request.targetContainer);

        onProgress({
          total,
          processed: success.length + failures.length,
          successCount: success.length,
          failureCount: failures.length,
          percentage: total === 0 ? 100 : Math.floor(((success.length + failures.length) / total) * 100),
          status: 'running',
          currentFile: currentFileName,
        });

        const alreadyMatches = await this.isAlreadyInTargetContainer(inputPath, request.targetContainer);
        if (alreadyMatches) {
          const copyStartedAt = Date.now();
          try {
            await fs.copyFile(inputPath, outputPath);
            success.push({
              input: inputPath,
              output: outputPath,
              durationMs: Date.now() - copyStartedAt,
            });
            await this.appendLog(`已符合目标容器，执行快速复制：${inputPath} -> ${outputPath}`);
          } catch (error) {
            await this.safeUnlink(outputPath);
            const message = this.normalizeError(error);
            failures.push({
              input: inputPath,
              error: message,
              attempts: 1,
            });
            await this.appendLog(`复制文件失败：${inputPath} -> ${message}`);
          }

          const processedAfterCopy = success.length + failures.length;
          onProgress({
            total,
            processed: processedAfterCopy,
            successCount: success.length,
            failureCount: failures.length,
            percentage: total === 0 ? 100 : Math.floor((processedAfterCopy / total) * 100),
            status: this.cancelling ? 'cancelled' : 'running',
          });

          if (this.cancelling) {
            break;
          }

          continue;
        }

        const startedSingle = Date.now();

        try {
          await this.runRemux(inputPath, outputPath, request.targetContainer);
          success.push({
            input: inputPath,
            output: outputPath,
            durationMs: Date.now() - startedSingle,
          });
          await this.appendLog(`容器转换成功：${inputPath} -> ${outputPath}`);
        } catch (error) {
          await this.safeUnlink(outputPath);
          const message = this.normalizeError(error);
          failures.push({
            input: inputPath,
            error: message,
            attempts: 1,
          });
          await this.appendLog(`容器转换失败：${inputPath} -> ${message}`);
        }

        if (this.cancelling) {
          break;
        }

        const processed = success.length + failures.length;
        onProgress({
          total,
          processed,
          successCount: success.length,
          failureCount: failures.length,
          percentage: total === 0 ? 100 : Math.floor((processed / total) * 100),
          status: this.cancelling ? 'cancelled' : 'running',
        });
      }

      const processed = success.length + failures.length;
      const cancelled = this.cancelling;
      const elapsedMs = Date.now() - startedAt;

      onProgress({
        total,
        processed,
        successCount: success.length,
        failureCount: failures.length,
        percentage: total === 0 ? 100 : Math.floor((processed / total) * 100),
        status: cancelled ? 'cancelled' : 'completed',
      });

      return {
        targetContainer: request.targetContainer,
        outputDir: request.outputDir,
        success,
        failures,
        cancelled,
        elapsedMs,
        logPath: ContainerConversionService.getLogPath(),
      };
    } finally {
      this.cleanup();
      this.running = false;
      this.cancelling = false;
    }
  }

  cancel() {
    if (!this.running) {
      return;
    }
    this.cancelling = true;
    if (this.currentCommand) {
      try {
        this.currentCommand.kill('SIGTERM');
      } catch (error) {
        // ignore
      }
    }
  }

  private async resolveOutputPath(outputDir: string, inputPath: string, target: ContainerFormat): Promise<string> {
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const ext = `.${target}`;
    let candidate = path.join(outputDir, `${baseName}_${target}${ext}`);
    let counter = 1;

    while (await this.pathExists(candidate)) {
      candidate = path.join(outputDir, `${baseName}_${target}_${counter}${ext}`);
      counter += 1;
    }

    return candidate;
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async safeUnlink(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore
    }
  }

  private normalizeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private cleanup() {
    this.currentCommand = null;
  }

  private async isAlreadyInTargetContainer(inputPath: string, target: ContainerFormat): Promise<boolean> {
    try {
      const formatName = await this.getContainerFormat(inputPath);
      if (!formatName) {
        return false;
      }
      const normalized = formatName.toLowerCase();
      return TARGET_CONTAINER_ALIASES[target].some((candidate) => normalized.includes(candidate));
    } catch (error) {
      await this.appendLog(`检测容器格式失败，继续尝试转换：${inputPath} -> ${this.normalizeError(error)}`);
      return false;
    }
  }

  private getContainerFormat(inputPath: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (error, data) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(data.format?.format_name ?? null);
      });
    });
  }

  private runRemux(inputPath: string, outputPath: string, target: ContainerFormat): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .outputOptions(['-map', '0', '-c', 'copy'])
        .output(outputPath)
        .on('start', () => {
          this.currentCommand = command;
        })
        .on('error', (error) => {
          this.currentCommand = null;
          reject(error);
        })
        .on('end', () => {
          this.currentCommand = null;
          resolve();
        });

      // fluent-ffmpeg 需要显式 format 时调用 format 方法
      command.format(target);
      command.run();
    });
  }

  private async appendLog(message: string) {
    try {
      const logPath = ContainerConversionService.getLogPath();
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      const timestamp = new Date().toISOString();
      await fs.appendFile(logPath, `[${timestamp}] ${message}\n`, 'utf8');
    } catch (error) {
      console.error('写入容器转换日志失败:', error);
    }
  }

  static getLogPath(): string {
    return path.join(app.getPath('userData'), 'logs', 'container-conversion.log');
  }
}
