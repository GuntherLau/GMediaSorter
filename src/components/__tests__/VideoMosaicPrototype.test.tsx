import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import VideoMosaicPrototype, { type VideoMosaicSource } from '../VideoMosaicPrototype';

const createSources = (count: number): VideoMosaicSource[] =>
  Array.from({ length: count }, (_, index) => {
    const id = `video-${index + 1}`;
    return {
      id,
      src: `gms-media://preview?file=/videos/${id}.mp4`,
      title: `Video ${index + 1}`,
      duration: 120,
      width: 1920,
      height: 1080,
    } satisfies VideoMosaicSource;
  });

describe('VideoMosaicPrototype', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalPlay = HTMLMediaElement.prototype.play;
  const originalPause = HTMLMediaElement.prototype.pause;
  let uuidCounter = 0;

  beforeAll(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 720 });

    const cryptoStub: Pick<Crypto, 'randomUUID'> = {
      randomUUID: () => {
        uuidCounter += 1;
        const hex = uuidCounter.toString(16).padStart(12, '0');
        return `00000000-0000-0000-0000-${hex}`;
      },
    };
    vi.stubGlobal('crypto', cryptoStub as Crypto);

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: originalInnerHeight });

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: originalPlay,
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: originalPause,
    });
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('shows the empty state message when no sources are available', async () => {
    const onExit = vi.fn();
    const { getByText } = render(
      <VideoMosaicPrototype
        sources={[]}
        columns={3}
        performancePreset="medium"
        onExit={onExit}
      />,
    );

    await waitFor(() => {
      expect(
        getByText('当前没有可用的视频源，请退出并调整过滤条件后重试。'),
      ).toBeInTheDocument();
    });
  });

  it('limits the number of active slots according to the performance preset', async () => {
    const sources = createSources(20);
    const onExit = vi.fn();
    const { container } = render(
      <VideoMosaicPrototype
        sources={sources}
        columns={3}
        performancePreset="low"
        onExit={onExit}
      />,
    );

    await waitFor(() => {
      const videos = container.querySelectorAll('video');
      expect(videos.length).toBe(6);
    });
  });

  it('keeps exactly one video unmuted after the audio rotation effect initializes', async () => {
    const sources = createSources(8);
    const onExit = vi.fn();
    const { container } = render(
      <VideoMosaicPrototype
        sources={sources}
        columns={3}
        performancePreset="medium"
        onExit={onExit}
      />,
    );

    await waitFor(() => {
      const videos = Array.from(container.querySelectorAll('video'));
      const unmuted = videos.filter((video) => !video.muted);
      expect(unmuted).toHaveLength(1);
    });
  });

  it('replaces a failed video using entries from the waiting queue', async () => {
    const sources = createSources(7);
    const onExit = vi.fn();
    const { container } = render(
      <VideoMosaicPrototype
        sources={sources}
        columns={3}
        performancePreset="low"
        onExit={onExit}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('video').length).toBeGreaterThan(0);
    });

    const initialVideo = container.querySelectorAll('video')[0];
    expect(initialVideo).toBeDefined();
    const initialKey = initialVideo?.dataset.slotKey;
    const initialSrc = initialVideo?.getAttribute('src');

    fireEvent.error(initialVideo!);

    await waitFor(() => {
      const updatedVideo = container.querySelectorAll('video')[0];
      expect(updatedVideo.dataset.slotKey).not.toBe(initialKey);
      expect(updatedVideo.getAttribute('src')).not.toBe(initialSrc);
    });
  });

  it('calls onExit when the Escape key is pressed', async () => {
    const sources = createSources(4);
    const onExit = vi.fn();
    render(
      <VideoMosaicPrototype
        sources={sources}
        columns={3}
        performancePreset="medium"
        onExit={onExit}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(onExit).toHaveBeenCalled();
    });
  });
});
