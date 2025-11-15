import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent, Menu, MenuItemConstructorOptions, shell, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';
import pLimit from 'p-limit';
import { DuplicateDetectorService } from './services/duplicate-detector';
import { SimilarityDetectorService } from './services/similarity-detector';
import { ConversionService } from './services/conversion-service';
import {
  VideoFile,
  SimilarityOptions,
  DetectionProgress,
  ConversionRequest,
  ConversionProgress,
  ContainerConversionRequest,
  ContainerConversionProgress,
  ContainerConversionResult,
} from '../src/types';
import { ContainerConversionService } from './services/container-conversion-service';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'gms-media',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const ffprobePath = ffprobeStatic.path.replace('app.asar', 'app.asar.unpacked');
ffmpeg.setFfprobePath(ffprobePath);

const RESOLUTION_TOLERANCE = 16;
const PROBE_CONCURRENCY = 4;

type ResolutionLabel = 'lt720p' | '720p' | '1080p' | 'gt1080p';

interface VideoMetadata {
  width: number | null;
  height: number | null;
  duration: number | null;
  aspectRatio: string | null;
  resolutionLabel: ResolutionLabel | null;
  effectiveVerticalResolution: number | null;
  codecName: string | null;
  formatName: string | null;
  bitRate: number | null;
}

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const probeLimit = pLimit(PROBE_CONCURRENCY);
const previewAllowList = new Set<string>();

function registerMediaProtocol() {
  protocol.registerFileProtocol('gms-media', (request, callback) => {
    try {
      const requestUrl = new URL(request.url);
      const rawPath = requestUrl.searchParams.get('file');
      if (!rawPath) {
        callback({ error: -6 });
        return;
      }

      const normalizedPath = path.normalize(rawPath);
      if (!path.isAbsolute(normalizedPath)) {
        callback({ error: -6 });
        return;
      }

      if (!previewAllowList.has(normalizedPath)) {
        callback({ error: -10 });
        return;
      }

      callback({ path: normalizedPath });
    } catch (error) {
      console.error('Failed to resolve media protocol request:', error);
      callback({ error: -2 });
    }
  });
}

function createAppMenu() {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' as const },
    { role: 'editMenu' as const },
    {
      label: '工具',
      submenu: [
        {
          label: '视频编码转换',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:open-conversion-menu');
            }
          },
        },
        {
          label: '容器格式转换',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:open-container-conversion-menu');
            }
          },
        },
      ],
    },
    { role: 'viewMenu' as const },
    { role: 'windowMenu' as const },
    ...(isDev
      ? [
          {
            role: 'help' as const,
            submenu: [{ role: 'toggleDevTools' as const }],
          },
        ]
      : []),
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function calculateResolutionLabel(width: number | null, height: number | null): Pick<VideoMetadata, 'resolutionLabel' | 'effectiveVerticalResolution'> {
  if (!width || !height) {
    return { resolutionLabel: null, effectiveVerticalResolution: null };
  }

  const effective = Math.min(width, height);

  if (effective < 720 - RESOLUTION_TOLERANCE) {
    return { resolutionLabel: 'lt720p', effectiveVerticalResolution: effective };
  }

  if (Math.abs(effective - 720) <= RESOLUTION_TOLERANCE) {
    return { resolutionLabel: '720p', effectiveVerticalResolution: effective };
  }

  if (Math.abs(effective - 1080) <= RESOLUTION_TOLERANCE) {
    return { resolutionLabel: '1080p', effectiveVerticalResolution: effective };
  }

  if (effective > 1080 + RESOLUTION_TOLERANCE) {
    return { resolutionLabel: 'gt1080p', effectiveVerticalResolution: effective };
  }

  return { resolutionLabel: null, effectiveVerticalResolution: effective };
}

async function probeVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return probeLimit(() =>
    new Promise<VideoMetadata>((resolve) => {
      ffmpeg.ffprobe(filePath, (error, data) => {
        if (error) {
          console.warn('ffprobe failed for file:', filePath, error);
          resolve({
            width: null,
            height: null,
            duration: null,
            aspectRatio: null,
            resolutionLabel: null,
            effectiveVerticalResolution: null,
            codecName: null,
            formatName: null,
            bitRate: null,
          });
          return;
        }

        const videoStream = data.streams.find((stream) => stream.codec_type === 'video');

        const width = videoStream?.width ?? null;
        const height = videoStream?.height ?? null;
        const rawDuration = data.format?.duration;
        const duration =
          typeof rawDuration === 'number'
            ? rawDuration
            : typeof rawDuration === 'string'
            ? Number.parseFloat(rawDuration)
            : null;
        const aspectRatio = videoStream?.display_aspect_ratio ?? null;

        const { resolutionLabel, effectiveVerticalResolution } = calculateResolutionLabel(width, height);

        const codecName = videoStream?.codec_name ?? null;
        const formatName = data.format?.format_name ?? null;
        const bitRate = typeof data.format?.bit_rate === 'number'
          ? data.format.bit_rate
          : typeof data.format?.bit_rate === 'string'
          ? Number.parseInt(data.format.bit_rate, 10)
          : null;

        resolve({
          width,
          height,
          duration,
          aspectRatio,
          resolutionLabel,
          effectiveVerticalResolution,
          codecName,
          formatName,
          bitRate,
        });
      });
    }),
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerMediaProtocol();
  createWindow();
  createAppMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for video management
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0];
});

ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.filePaths[0];
});

ipcMain.handle('get-video-files', async (_event: IpcMainInvokeEvent, dirPath: string) => {
  const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

  try {
    if (!dirPath) {
      return [];
    }

    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const videoEntries = files.filter((file) => file.isFile() && videoExtensions.includes(path.extname(file.name).toLowerCase()));

    const videoFiles = await Promise.all(
      videoEntries.map(async (file) => {
        const fullPath = path.join(dirPath, file.name);
        const stats = await fs.stat(fullPath);
        const metadata = await probeVideoMetadata(fullPath);

        return {
          name: file.name,
          path: fullPath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          extension: path.extname(file.name).toLowerCase(),
          width: metadata.width,
          height: metadata.height,
          duration: metadata.duration,
          aspectRatio: metadata.aspectRatio,
          resolutionLabel: metadata.resolutionLabel,
          effectiveVerticalResolution: metadata.effectiveVerticalResolution,
        };
      }),
    );

    return videoFiles;
  } catch (error) {
    console.error('Error reading directory:', error);
    throw error;
  }
});

ipcMain.handle('move-file', async (_event: IpcMainInvokeEvent, sourcePath: string, destPath: string) => {
  try {
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });
    await fs.rename(sourcePath, destPath);
    return { success: true };
  } catch (error) {
    console.error('Error moving file:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('copy-file', async (_event: IpcMainInvokeEvent, sourcePath: string, destPath: string) => {
  try {
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(sourcePath, destPath);
    return { success: true };
  } catch (error) {
    console.error('Error copying file:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('delete-file', async (_event: IpcMainInvokeEvent, filePath: string) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 重复检测服务实例
const duplicateDetector = new DuplicateDetectorService();

ipcMain.handle('detect-duplicates', async (event: IpcMainInvokeEvent, files: VideoFile[]) => {
  try {
    const result = await duplicateDetector.detectDuplicates(
      files,
      (current, total, message, file) => {
        const progress: DetectionProgress = {
          current,
          total,
          percentage: Math.floor((current / total) * 100),
          message,
          currentFile: file
        };
        event.sender.send('detection-progress', progress);
      }
    );
    return result;
  } catch (error) {
    console.error('Error detecting duplicates:', error);
    throw error;
  }
});

// 相似检测服务实例
const similarityDetector = new SimilarityDetectorService();
const conversionService = new ConversionService();
const containerConversionService = new ContainerConversionService();

ipcMain.handle('detect-similarity', async (event: IpcMainInvokeEvent, files: VideoFile[], options: SimilarityOptions) => {
  try {
    const result = await similarityDetector.detectSimilarity(
      files,
      options,
      (current, total, message, file) => {
        const progress: DetectionProgress = {
          current,
          total,
          percentage: Math.floor((current / total) * 100),
          message,
          currentFile: file
        };
        event.sender.send('detection-progress', progress);
      }
    );
    return result;
  } catch (error) {
    console.error('Error detecting similarity:', error);
    throw error;
  }
});

ipcMain.handle('cancel-detection', async (_event: IpcMainInvokeEvent, taskId: string) => {
  try {
    if (taskId === 'duplicate') {
      duplicateDetector.cancel();
    } else if (taskId === 'similarity') {
      similarityDetector.cancel();
    }
  } catch (error) {
    console.error('Error cancelling detection:', error);
    throw error;
  }
});

ipcMain.handle('conversion-start', async (event: IpcMainInvokeEvent, request: ConversionRequest) => {
  try {
    const result = await conversionService.convert(
      request,
      (progress: ConversionProgress) => {
        event.sender.send('conversion-progress', progress);
      },
    );
    event.sender.send('conversion-complete', result);
    return result;
  } catch (error) {
    console.error('Error during conversion:', error);
    throw error;
  }
});

ipcMain.handle('conversion-cancel', async () => {
  conversionService.cancel();
});

ipcMain.handle('container-conversion-start', async (event: IpcMainInvokeEvent, request: ContainerConversionRequest) => {
  try {
    const result: ContainerConversionResult = await containerConversionService.convert(
      request,
      (progress: ContainerConversionProgress) => {
        event.sender.send('container-conversion-progress', progress);
      },
    );
    event.sender.send('container-conversion-complete', result);
    return result;
  } catch (error) {
    console.error('Error during container conversion:', error);
    throw error;
  }
});

ipcMain.handle('container-conversion-cancel', async () => {
  containerConversionService.cancel();
});

ipcMain.handle('open-path', async (_event: IpcMainInvokeEvent, targetPath: string) => {
  if (!targetPath) {
    return '';
  }
  try {
    return await shell.openPath(targetPath);
  } catch (error) {
    console.error('Error opening path:', error);
    throw error;
  }
});

ipcMain.handle('get-conversion-log-path', async () => {
  try {
    return ConversionService.getLogPath();
  } catch (error) {
    console.error('Error getting conversion log path:', error);
    throw error;
  }
});

ipcMain.handle('get-container-conversion-log-path', async () => {
  try {
    return ContainerConversionService.getLogPath();
  } catch (error) {
    console.error('Error getting container conversion log path:', error);
    throw error;
  }
});

ipcMain.handle('open-file-preview', async (_event: IpcMainInvokeEvent, targetPath: string) => {
  if (typeof targetPath !== 'string' || targetPath.trim() === '') {
    throw new Error('无效的文件路径');
  }

  const normalizedPath = path.normalize(targetPath);

  try {
    const stats = await fs.stat(normalizedPath);
    const metadata = await probeVideoMetadata(normalizedPath);
    const previewUrl = new URL('gms-media://preview');
    previewUrl.searchParams.set('file', normalizedPath);
    previewAllowList.add(normalizedPath);

    return {
      url: previewUrl.toString(),
      filePath: normalizedPath,
      fileName: path.basename(normalizedPath),
      stats: {
        size: stats.size,
        modified: stats.mtime.toISOString(),
      },
      metadata: {
        duration: metadata.duration ?? undefined,
        width: metadata.width ?? undefined,
        height: metadata.height ?? undefined,
        aspectRatio: metadata.aspectRatio,
        codec: metadata.codecName,
        formatName: metadata.formatName,
        bitRate: metadata.bitRate,
      },
    };
  } catch (error) {
    console.error('Error preparing file preview:', error);
    throw error;
  }
});

ipcMain.handle('get-video-metadata', async (_event: IpcMainInvokeEvent, targetPath: string) => {
  if (typeof targetPath !== 'string' || targetPath.trim() === '') {
    return null;
  }

  try {
    const metadata = await probeVideoMetadata(path.normalize(targetPath));
    return {
      duration: metadata.duration ?? undefined,
      width: metadata.width ?? undefined,
      height: metadata.height ?? undefined,
      aspectRatio: metadata.aspectRatio,
      codec: metadata.codecName,
      formatName: metadata.formatName,
      bitRate: metadata.bitRate,
    };
  } catch (error) {
    console.error('Error probing video metadata:', error);
    return null;
  }
});
