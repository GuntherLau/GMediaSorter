import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';
import pLimit from 'p-limit';
import { DuplicateDetectorService } from './services/duplicate-detector';
import { SimilarityDetectorService } from './services/similarity-detector';
import { VideoFile, SimilarityOptions, DetectionProgress } from '../src/types';

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
}

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const probeLimit = pLimit(PROBE_CONCURRENCY);

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

        resolve({
          width,
          height,
          duration,
          aspectRatio,
          resolutionLabel,
          effectiveVerticalResolution,
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
  createWindow();

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
