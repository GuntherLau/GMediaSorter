import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { VideoPlayer } from '../VideoPlayer';
import type { PlayerPreferences, VideoPreviewSource } from '../../types';

const BASE_SOURCE: VideoPreviewSource = {
  url: 'gms-media://preview?file=/videos/sample.mp4',
  filePath: '/videos/sample.mp4',
  fileName: 'sample.mp4',
  stats: {
    size: 1024,
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

const BASE_PREFERENCES: PlayerPreferences = {
  autoPlay: false,
  rememberProgress: false,
  loop: false,
  defaultPlaybackRate: 1,
};

describe('VideoPlayer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders metadata summary and toggles preferences', async () => {
    const onClose = vi.fn();
    const onUpdatePreferences = vi.fn();
    const user = userEvent.setup();

    await act(async () => {
      render(
        <VideoPlayer
          open
          source={BASE_SOURCE}
          preferences={BASE_PREFERENCES}
          onClose={onClose}
          onUpdatePreferences={onUpdatePreferences}
        />,
      );
    });

    expect(screen.getByRole('heading', { name: /sample\.mp4/i })).toBeInTheDocument();
    expect(screen.getByText('MP4 · H264 · 1920×1080 · 8 Mbps')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByLabelText('循环播放'));
    });
    expect(onUpdatePreferences).toHaveBeenCalledWith({
      ...BASE_PREFERENCES,
      loop: true,
    });

    await act(async () => {
      await user.click(screen.getByLabelText('自动播放'));
    });
    expect(onUpdatePreferences).toHaveBeenLastCalledWith({
      ...BASE_PREFERENCES,
      loop: false,
      autoPlay: true,
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText('倍速'), ['1.5']);
    });
    expect(onUpdatePreferences).toHaveBeenLastCalledWith({
      ...BASE_PREFERENCES,
      defaultPlaybackRate: 1.5,
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '关闭播放器' }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('toggles playback state via the play button', async () => {
    const onUpdatePreferences = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play');
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause');

    await act(async () => {
      render(
        <VideoPlayer
          open
          source={BASE_SOURCE}
          preferences={BASE_PREFERENCES}
          onClose={onClose}
          onUpdatePreferences={onUpdatePreferences}
        />,
      );
    });

    const toggleButton = screen.getByRole('button', { name: '播放' });
    await act(async () => {
      await user.click(toggleButton);
    });

    await waitFor(() => {
      expect(playSpy).toHaveBeenCalled();
      expect(toggleButton).toHaveTextContent('暂停');
    });

    await act(async () => {
      await user.click(toggleButton);
    });

    await waitFor(() => {
      expect(pauseSpy).toHaveBeenCalled();
      expect(toggleButton).toHaveTextContent('播放');
    });

    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });
});
