import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
import { ContainerConversionService } from '../container-conversion-service';
import type { ContainerConversionProgress, ContainerFormat } from '../../../src/types';

type ServiceInternals = {
  runRemux: (input: string, output: string, target: ContainerFormat) => Promise<void>;
  appendLog: (message: string) => Promise<void>;
  currentCommand: { kill: (signal: string) => void } | null;
  isAlreadyInTargetContainer: (input: string, target: ContainerFormat) => Promise<boolean>;
};

const createWorkspace = async (fileNames: string[]) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gms-container-'));
  const inputDir = path.join(root, 'input');
  const outputDir = path.join(root, 'output');
  await fs.mkdir(inputDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  const files: string[] = [];
  for (const name of fileNames) {
    const filePath = path.join(inputDir, name);
    await fs.writeFile(filePath, name);
    files.push(filePath);
  }

  return { root, outputDir, files };
};

const cleanupWorkspace = async (root: string) => {
  await fs.rm(root, { recursive: true, force: true });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ContainerConversionService', () => {
  it('converts all files successfully and reports progress', async () => {
    const { root, outputDir, files } = await createWorkspace(['clip1.mov', 'clip2.avi']);
    try {
      const service = new ContainerConversionService();
      const serviceInternals = service as unknown as ServiceInternals;
      const logPath = path.join(root, 'logs', 'container.log');

      const alreadyMock = vi
        .spyOn(serviceInternals, 'isAlreadyInTargetContainer')
        .mockResolvedValue(false);

      const runMock = vi
        .spyOn(serviceInternals, 'runRemux')
        .mockImplementation(async (_input: string, output: string, _target: ContainerFormat) => {
          await fs.writeFile(output, 'converted');
        });
      const appendLogMock = vi.spyOn(serviceInternals, 'appendLog').mockResolvedValue();
      const logPathMock = vi
        .spyOn(ContainerConversionService, 'getLogPath')
        .mockReturnValue(logPath);

      const snapshots: ContainerConversionProgress[] = [];

      const result = await service.convert(
        {
          targetContainer: 'mp4',
          filePaths: files,
          outputDir,
        },
        (progress) => {
          snapshots.push({ ...progress });
        },
      );

  expect(alreadyMock).toHaveBeenCalledTimes(2);
  expect(runMock).toHaveBeenCalledTimes(2);
      expect(appendLogMock).toHaveBeenCalledTimes(2);
      expect(logPathMock).toHaveBeenCalled();

      expect(result.cancelled).toBe(false);
      expect(result.success).toHaveLength(2);
      expect(result.failures).toHaveLength(0);
      expect(result.targetContainer).toBe('mp4');
      expect(result.logPath).toBe(logPath);
      expect(result.success.map((item) => path.basename(item.output))).toEqual([
        'clip1_mp4.mp4',
        'clip2_mp4.mp4',
      ]);

      expect(snapshots.length).toBeGreaterThanOrEqual(3);
      const lastSnapshot = snapshots[snapshots.length - 1];
      expect(lastSnapshot.status).toBe('completed');
      expect(lastSnapshot.processed).toBe(2);
      expect(lastSnapshot.successCount).toBe(2);
      expect(lastSnapshot.failureCount).toBe(0);
    } finally {
      await cleanupWorkspace(root);
    }
  });

  it('records failures and continues processing when remux fails', async () => {
    const { root, outputDir, files } = await createWorkspace(['ok.webm', 'broken.mov']);
    try {
      const service = new ContainerConversionService();
      const serviceInternals = service as unknown as ServiceInternals;
      const logPath = path.join(root, 'logs', 'container.log');

      const alreadyMock = vi
        .spyOn(serviceInternals, 'isAlreadyInTargetContainer')
        .mockResolvedValue(false);

      const runMock = vi
        .spyOn(serviceInternals, 'runRemux')
        .mockImplementationOnce(async (_input: string, output: string, _target: ContainerFormat) => {
          await fs.writeFile(output, 'converted');
        })
        .mockImplementationOnce(async (_input: string, _output: string, _target: ContainerFormat) => {
          throw new Error('mock failure');
        });

      const appendLogMock = vi.spyOn(serviceInternals, 'appendLog').mockResolvedValue();
      vi.spyOn(ContainerConversionService, 'getLogPath').mockReturnValue(logPath);

      const snapshots: ContainerConversionProgress[] = [];

      const result = await service.convert(
        {
          targetContainer: 'mkv',
          filePaths: files,
          outputDir,
        },
        (progress) => {
          snapshots.push({ ...progress });
        },
      );

  expect(alreadyMock).toHaveBeenCalledTimes(2);
  expect(runMock).toHaveBeenCalledTimes(2);
      expect(appendLogMock).toHaveBeenCalledTimes(2);

      expect(result.cancelled).toBe(false);
      expect(result.success).toHaveLength(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].error).toContain('mock failure');

      const lastSnapshot = snapshots[snapshots.length - 1];
      expect(lastSnapshot.status).toBe('completed');
      expect(lastSnapshot.successCount).toBe(1);
      expect(lastSnapshot.failureCount).toBe(1);
    } finally {
      await cleanupWorkspace(root);
    }
  });

  it('can cancel an in-flight conversion and stop further work', async () => {
    const { root, outputDir, files } = await createWorkspace(['clip-a.mp4', 'clip-b.mp4']);
    try {
      const service = new ContainerConversionService();
      const serviceInternals = service as unknown as ServiceInternals;
      const logPath = path.join(root, 'logs', 'container.log');
      vi.spyOn(ContainerConversionService, 'getLogPath').mockReturnValue(logPath);
      vi.spyOn(serviceInternals, 'appendLog').mockResolvedValue();

      let resolveRun: (() => Promise<void>) | undefined;
      const killMock = vi.fn();

      vi.spyOn(serviceInternals, 'isAlreadyInTargetContainer').mockResolvedValue(false);

      vi.spyOn(serviceInternals, 'runRemux').mockImplementation(
        (_input: string, output: string, _target: ContainerFormat) => {
          return new Promise<void>((resolve) => {
            serviceInternals.currentCommand = {
              kill: killMock,
            } as { kill: (signal: string) => void };
            resolveRun = async () => {
              await fs.writeFile(output, 'converted');
              serviceInternals.currentCommand = null;
              resolve();
            };
          });
        },
      );

      const snapshots: ContainerConversionProgress[] = [];

      const convertPromise = service.convert(
        {
          targetContainer: 'mp4',
          filePaths: files,
          outputDir,
        },
        (progress) => {
          snapshots.push({ ...progress });
        },
      );

      await Promise.resolve();

  service.cancel();

      await resolveRun?.();
      const result = await convertPromise;

  expect(result.cancelled).toBe(true);
  const handled = result.success.length + result.failures.length;
  expect(handled).toBeLessThanOrEqual(1);

  const lastSnapshot = snapshots[snapshots.length - 1];
  expect(lastSnapshot.status).toBe('cancelled');
  expect(lastSnapshot.processed).toBe(handled);
    } finally {
      await cleanupWorkspace(root);
    }
  });

  it('copies file directly when container already matches target', async () => {
    const { root, outputDir, files } = await createWorkspace(['origin.mp4']);
    try {
      const service = new ContainerConversionService();
      const serviceInternals = service as unknown as ServiceInternals;
      const logPath = path.join(root, 'logs', 'container.log');
      vi.spyOn(ContainerConversionService, 'getLogPath').mockReturnValue(logPath);

      const alreadyMock = vi.spyOn(serviceInternals, 'isAlreadyInTargetContainer').mockResolvedValue(true);
      const runMock = vi.spyOn(serviceInternals, 'runRemux');
      const appendLogMock = vi.spyOn(serviceInternals, 'appendLog').mockResolvedValue();

      const snapshots: ContainerConversionProgress[] = [];

      const result = await service.convert(
        {
          targetContainer: 'mp4',
          filePaths: files,
          outputDir,
        },
        (progress) => {
          snapshots.push({ ...progress });
        },
      );

      expect(alreadyMock).toHaveBeenCalledTimes(1);
      expect(runMock).not.toHaveBeenCalled();
  const logMessages = appendLogMock.mock.calls.map((call: [unknown]) => String(call[0]));
  expect(logMessages.some((msg: string) => msg.includes('快速复制'))).toBe(true);

      expect(result.cancelled).toBe(false);
      expect(result.success).toHaveLength(1);
      expect(result.failures).toHaveLength(0);
      expect(await fs.readFile(result.success[0].output, 'utf8')).toBe('origin.mp4');

      const lastSnapshot = snapshots[snapshots.length - 1];
      expect(lastSnapshot.status).toBe('completed');
      expect(lastSnapshot.successCount).toBe(1);
    } finally {
      await cleanupWorkspace(root);
    }
  });
});
