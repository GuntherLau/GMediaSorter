import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import App from '../App';
import type { ElectronAPI, VideoFile, VideoPreviewSource } from '../types';

const sampleFile: VideoFile = {
  name: 'sample.mp4',
  path: '/videos/sample.mp4',
  size: 1024 * 1024,
  modified: new Date('2024-01-01T00:00:00Z').toISOString(),
  extension: '.mp4',
  width: 1920,
  height: 1080,
  duration: 120,
  aspectRatio: '16:9',
  resolutionLabel: '1080p',
  effectiveVerticalResolution: 1080,
};

const samplePreview: VideoPreviewSource = {
  url: 'gms-media://preview?file=/videos/sample.mp4',
  filePath: '/videos/sample.mp4',
  fileName: 'sample.mp4',
  stats: {
    size: 1024 * 1024,
    modified: new Date('2024-01-01T00:00:00Z').toISOString(),
  },
  metadata: {
    duration: 120,
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    codec: 'h264',
    formatName: 'mp4',
    bitRate: 7_500_000,
  },
};

const createElectronAPIMock = (): ElectronAPI => ({
  selectDirectory: vi.fn().mockResolvedValue('/videos'),
  selectOutputDirectory: vi.fn().mockResolvedValue('/tmp'),
  getVideoFiles: vi.fn().mockResolvedValue([sampleFile]),
  moveFile: vi.fn().mockResolvedValue({ success: true }),
  copyFile: vi.fn().mockResolvedValue({ success: true }),
  detectDuplicates: vi.fn().mockResolvedValue({
    groups: [],
    totalDuplicates: 0,
    totalWasteSize: 0,
    scanTime: 0,
  }),
  detectSimilarity: vi.fn().mockResolvedValue({
    groups: [],
    totalSimilarFiles: 0,
    scanTime: 0,
    threshold: 0.8,
  }),
  cancelDetection: vi.fn().mockResolvedValue(undefined),
  onDetectionProgress: vi.fn().mockReturnValue(() => {}),
  deleteFile: vi.fn().mockResolvedValue({ success: true }),
  onConversionMenuOpen: vi.fn().mockReturnValue(() => {}),
  requestConversion: vi.fn().mockResolvedValue(undefined),
  onConversionProgress: vi.fn().mockReturnValue(() => {}),
  onConversionComplete: vi.fn().mockReturnValue(() => {}),
  cancelConversion: vi.fn().mockResolvedValue(undefined),
  onContainerConversionMenuOpen: vi.fn().mockReturnValue(() => {}),
  requestContainerConversion: vi.fn().mockResolvedValue(undefined),
  onContainerConversionProgress: vi.fn().mockReturnValue(() => {}),
  onContainerConversionComplete: vi.fn().mockReturnValue(() => {}),
  cancelContainerConversion: vi.fn().mockResolvedValue(undefined),
  openPath: vi.fn().mockResolvedValue(undefined),
  getConversionLogPath: vi.fn().mockResolvedValue('/logs/conversion.log'),
  getContainerConversionLogPath: vi.fn().mockResolvedValue('/logs/container.log'),
  openFilePreview: vi.fn().mockResolvedValue(samplePreview),
  getVideoMetadata: vi.fn().mockResolvedValue(samplePreview.metadata ?? null),
});

describe('App video playback integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.electronAPI = createElectronAPIMock();
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('loads files and opens the video player through IPC preview', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '选择文件夹' }));
    });

    await waitFor(() => {
      expect(window.electronAPI.getVideoFiles).toHaveBeenCalledWith('/videos');
    });

    expect(await screen.findByText('sample.mp4')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '播放' }));
    });

    await waitFor(() => {
      expect(window.electronAPI.openFilePreview).toHaveBeenCalledWith('/videos/sample.mp4');
    });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('sample.mp4');
    expect(screen.getByText('MP4 · H264 · 1920×1080 · 8 Mbps')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '关闭播放器' }));
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
