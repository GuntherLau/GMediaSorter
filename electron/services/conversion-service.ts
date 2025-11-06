import { app } from 'electron';
import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  DEFAULT_CONVERSION_OPTIONS,
  type ConversionRequest,
  type ConversionResult,
  type ConversionProgress,
  type ConversionFileSuccess,
  type ConversionFileFailure,
  type EncodingFormat,
  type ConversionOptions,
  type ConversionQuality,
  type AudioStrategy,
} from '../../src/types';

const FORMAT_CONFIG: Record<EncodingFormat, {
  videoCodec: string;
  suffix: string;
  quality: Record<ConversionQuality, { preset: string; crf: string; extra?: string[] }>;
}> = {
  h264: {
    videoCodec: 'libx264',
    suffix: 'h264',
    quality: {
      balanced: { preset: 'medium', crf: '23' },
      high: { preset: 'slow', crf: '20' },
    },
  },
  h265: {
    videoCodec: 'libx265',
    suffix: 'h265',
    quality: {
      balanced: { preset: 'medium', crf: '28', extra: ['-tag:v', 'hvc1'] },
      high: { preset: 'slow', crf: '24', extra: ['-tag:v', 'hvc1'] },
    },
  },
};

const AUDIO_STRATEGY_CONFIG: Record<AudioStrategy, { codec: string; bitrate?: string }> = {
  copy: { codec: 'copy' },
  aac: { codec: 'aac', bitrate: '192k' },
};

const MAX_RETRY_CAP = 3;
const TARGET_CODEC_VARIANTS: Record<EncodingFormat, string[]> = {
  h264: ['h264', 'avc1', 'avc', 'x264'],
  h265: ['hevc', 'h265', 'x265', 'hvc1'],
};

export class ConversionService {
  private running = false;
  private cancelling = false;
  private currentCommand: FfmpegCommand | null = null;

  async convert(
    request: ConversionRequest,
    onProgress: (progress: ConversionProgress) => void,
  ): Promise<ConversionResult> {
    if (this.running) {
      throw new Error('已有转换任务正在执行，请稍后再试');
    }

    this.running = true;
    this.cancelling = false;

    const normalizedOptions = this.normalizeOptions(request.format, request.options);
    const total = request.filePaths.length;
    const success: ConversionFileSuccess[] = [];
    const failures: ConversionFileFailure[] = [];
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
        const outputPath = await this.resolveOutputPath(request.outputDir, inputPath, request.format);

        const alreadyMatches = await this.isAlreadyInTargetFormat(inputPath, request.format);
        if (alreadyMatches) {
          const copyStartedAt = Date.now();
          try {
            onProgress({
              total,
              processed: success.length + failures.length,
              successCount: success.length,
              failureCount: failures.length,
              percentage: total === 0 ? 100 : Math.floor(((success.length + failures.length) / total) * 100),
              status: 'running',
              currentFile: currentFileName,
            });

            await fs.copyFile(inputPath, outputPath);
            const durationMs = Date.now() - copyStartedAt;
            success.push({ input: inputPath, output: outputPath, durationMs });
            await this.appendLog(`已符合目标编码，执行快速复制：${inputPath} -> ${outputPath}`);
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

        const maxAttempts = normalizedOptions.maxRetries + 1;
        let attempt = 0;

        while (attempt < maxAttempts && !this.cancelling) {
          attempt += 1;

          onProgress({
            total,
            processed: success.length + failures.length,
            successCount: success.length,
            failureCount: failures.length,
            percentage: total === 0 ? 100 : Math.floor(((success.length + failures.length) / total) * 100),
            status: 'running',
            currentFile: currentFileName,
            currentAttempt: attempt,
            maxAttempts,
          });

          try {
            const durationMs = await this.runConversion(inputPath, outputPath, request.format, normalizedOptions);
            success.push({ input: inputPath, output: outputPath, durationMs });
            await this.appendLog(`转码成功：${inputPath} -> ${outputPath}（耗时 ${durationMs} ms）`);
            break;
          } catch (error) {
            await this.safeUnlink(outputPath);
            const message = this.normalizeError(error);
            await this.appendLog(`转码失败（尝试 ${attempt}/${maxAttempts}）：${inputPath} -> ${message}`);

            if (this.cancelling) {
              break;
            }

            if (attempt >= maxAttempts) {
              failures.push({
                input: inputPath,
                error: message,
                attempts: attempt,
              });
            }
          }
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
        format: request.format,
        outputDir: request.outputDir,
        success,
        failures,
        cancelled,
        elapsedMs,
        options: normalizedOptions,
        logPath: ConversionService.getLogPath(),
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
        // ignore kill errors
      }
    }
  }

  private async resolveOutputPath(outputDir: string, inputPath: string, format: EncodingFormat): Promise<string> {
    const ext = path.extname(inputPath) || '.mp4';
    const baseName = path.basename(inputPath, ext);
    const { suffix } = FORMAT_CONFIG[format];

    let candidate = path.join(outputDir, `${baseName}_${suffix}${ext}`);
    let counter = 1;

    while (await this.pathExists(candidate)) {
      candidate = path.join(outputDir, `${baseName}_${suffix}_${counter}${ext}`);
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
      // ignore remove errors
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

  private async isAlreadyInTargetFormat(inputPath: string, format: EncodingFormat): Promise<boolean> {
    try {
      const codec = await this.getVideoCodec(inputPath);
      if (!codec) {
        return false;
      }
      const normalized = codec.toLowerCase();
      return TARGET_CODEC_VARIANTS[format].some((candidate) => normalized.includes(candidate));
    } catch (error) {
      await this.appendLog(`检测视频编码失败，继续尝试转码：${inputPath} -> ${this.normalizeError(error)}`);
      return false;
    }
  }

  private getVideoCodec(inputPath: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (error, data) => {
        if (error) {
          reject(error);
          return;
        }
        const videoStream = data.streams.find((stream) => stream.codec_type === 'video');
        resolve(videoStream?.codec_name ?? null);
      });
    });
  }

  private async appendLog(message: string) {
    try {
      const logPath = ConversionService.getLogPath();
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      const timestamp = new Date().toISOString();
      await fs.appendFile(logPath, `[${timestamp}] ${message}\n`, 'utf8');
    } catch (error) {
      console.error('写入转码日志失败:', error);
    }
  }

  private runConversion(
    inputPath: string,
    outputPath: string,
    format: EncodingFormat,
    options: ConversionOptions,
  ): Promise<number> {
    const formatConfig = FORMAT_CONFIG[format];
    const qualityConfig = formatConfig.quality[options.quality];
    const audioConfig = AUDIO_STRATEGY_CONFIG[options.audioStrategy];
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .videoCodec(formatConfig.videoCodec)
        .outputOptions([
          '-preset', qualityConfig.preset,
          '-crf', qualityConfig.crf,
          ...(qualityConfig.extra ?? []),
        ]);

      if (audioConfig.codec === 'copy') {
        command.audioCodec('copy');
      } else {
        command.audioCodec(audioConfig.codec);
        if (audioConfig.bitrate) {
          command.audioBitrate(audioConfig.bitrate);
        }
      }

      command
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
          resolve(Date.now() - startedAt);
        });

      command.run();
    });
  }

  static getLogPath(): string {
    return path.join(app.getPath('userData'), 'logs', 'conversion.log');
  }

  private normalizeOptions(format: EncodingFormat, options?: ConversionOptions): ConversionOptions {
    const defaults = DEFAULT_CONVERSION_OPTIONS;
    const formatConfig = FORMAT_CONFIG[format];

    const quality = options && options.quality && formatConfig.quality[options.quality]
      ? options.quality
      : defaults.quality;

    const audioStrategy = options && options.audioStrategy && AUDIO_STRATEGY_CONFIG[options.audioStrategy]
      ? options.audioStrategy
      : defaults.audioStrategy;

    const maxRetries = options && Number.isInteger(options.maxRetries)
      ? Math.max(0, Math.min(MAX_RETRY_CAP, options.maxRetries))
      : defaults.maxRetries;

    return {
      quality,
      audioStrategy,
      maxRetries,
    };
  }
}

export default ConversionService;
