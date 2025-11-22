import { useCallback, useEffect, useRef, useState } from 'react';
import './VideoMosaicPrototype.css';

export type VideoMosaicSource = {
  id: string;
  src: string;
  title: string;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
};

export type MosaicPerformancePreset = 'low' | 'medium' | 'high';

type PerformancePresetConfig = {
  maxActiveSlots: number;
  shuffleBatchSize: number;
  preloadAhead: number;
  soundSwitchInterval: number;
};

type ActiveSlot = {
  key: string;
  video: VideoMosaicSource;
  colSpan: number;
  rowSpan: number;
};

const PERFORMANCE_PRESETS: Record<MosaicPerformancePreset, PerformancePresetConfig> = {
  low: {
    maxActiveSlots: 6,
    shuffleBatchSize: 2,
    preloadAhead: 2,
    soundSwitchInterval: 24000,
  },
  medium: {
    maxActiveSlots: 12,
    shuffleBatchSize: 3,
    preloadAhead: 3,
    soundSwitchInterval: 20000,
  },
  high: {
    maxActiveSlots: 18,
    shuffleBatchSize: 4,
    preloadAhead: 4,
    soundSwitchInterval: 16000,
  },
};

const DEFAULT_COLUMNS = 3;
const SLOT_MIN_DURATION = 4; // 秒，避免过快轮换
const SHUFFLE_INTERVAL = 12000;
const ERROR_COOLDOWN_MS = 45000;
const DEFAULT_ASPECT_RATIO = 16 / 9;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const shuffleArray = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const generateUniqueId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createSlotKey = (videoId: string) => `${videoId}-${generateUniqueId()}`;

const safelyPlay = (element: HTMLVideoElement | null | undefined) => {
  if (!element) {
    return;
  }
  try {
    const playResult = element.play();
    if (playResult && typeof playResult.catch === 'function') {
      void playResult.catch(() => undefined);
    }
  } catch {
    // 忽略播放失败
  }
};

const pickRandomVideo = (pool: VideoMosaicSource[]): VideoMosaicSource | null => {
  if (pool.length === 0) {
    return null;
  }
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
};

const resolveTargetSlotCount = (sourceCount: number, layoutSlotCount: number, maxActiveSlots: number) => {
  if (sourceCount <= 0) {
    return 0;
  }
  const cappedByLayout = Math.min(layoutSlotCount, maxActiveSlots);
  return Math.min(cappedByLayout, Math.max(1, sourceCount));
};

const getAspectRatio = (source: VideoMosaicSource): number => {
  const { width, height } = source;
  if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
    return clamp(width / height, 0.4, 3.2);
  }
  return DEFAULT_ASPECT_RATIO;
};

const createTileSpan = (video: VideoMosaicSource, columnCount: number) => {
  const aspect = getAspectRatio(video);
  const maxColumns = Math.max(3, columnCount);
  let colSpan: number;
  if (aspect >= 2.4) {
    colSpan = maxColumns >= 4 ? 4 : Math.min(3, maxColumns);
  } else if (aspect >= 1.7) {
    colSpan = Math.min(3, maxColumns);
  } else if (aspect >= 1.15) {
    colSpan = Math.min(2, maxColumns);
  } else {
    colSpan = 1;
  }

  if (maxColumns <= 4) {
    colSpan = clamp(colSpan, 1, maxColumns);
  }

  const verticalFactor = 1 / aspect;
  let rowSpan: number;
  if (aspect <= 0.75) {
    rowSpan = clamp(Math.round(colSpan * verticalFactor * 1.6), 2, 4);
  } else if (aspect >= 1.8) {
    rowSpan = clamp(Math.round(colSpan * verticalFactor * 1.1), 1, 3);
  } else {
    rowSpan = clamp(Math.round(colSpan * verticalFactor * 1.3), 1, 3);
  }

  if (!Number.isFinite(rowSpan) || rowSpan < 1) {
    rowSpan = 1;
  }

  return {
    colSpan,
    rowSpan,
  } satisfies Pick<ActiveSlot, 'colSpan' | 'rowSpan'>;
};

const buildInitialSlots = (pool: VideoMosaicSource[], slotCount: number, columnCount: number): ActiveSlot[] => {
  if (pool.length === 0 || slotCount <= 0) {
    return [];
  }
  const result: ActiveSlot[] = [];
  const available: VideoMosaicSource[] = [...pool];

  for (let index = 0; index < slotCount; index++) {
    if (available.length === 0) {
      available.push(...pool);
    }
    const pickIndex = Math.floor(Math.random() * available.length);
    const [video] = available.splice(pickIndex, 1);
    if (!video) {
      continue;
    }
    const { colSpan, rowSpan } = createTileSpan(video, columnCount);
    result.push({
      key: createSlotKey(video.id),
      video,
      colSpan,
      rowSpan,
    });
  }
  return result;
};

const buildWaitingQueue = (
  sources: VideoMosaicSource[],
  activeSlots: ActiveSlot[],
  availabilityFilter?: (source: VideoMosaicSource) => boolean
) => {
  if (sources.length === 0) {
    return [] as VideoMosaicSource[];
  }
  const activeIds = new Set(activeSlots.map((slot) => slot.video.id));
  const pending = sources.filter(
    (source) => !activeIds.has(source.id) && (!availabilityFilter || availabilityFilter(source))
  );
  if (pending.length === 0) {
    return [] as VideoMosaicSource[];
  }
  return shuffleArray(pending);
};

const computeLayout = (columns: number) => {
  const density = columns > 0 ? columns : DEFAULT_COLUMNS;
  if (typeof window === 'undefined') {
    return {
      columns: Math.max(3, density * 2),
      slotCount: density * 8,
      baseRowHeight: 160,
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const viewportArea = viewportWidth * viewportHeight;

  const estimatedColumns = clamp(Math.round(viewportWidth / 280), 3, 12);
  const columnsCount = clamp(estimatedColumns + density - 3, 3, 12);

  const baseSlots = Math.round(viewportArea / 90000);
  const slotCount = clamp(baseSlots, density * 6, density * 14);
  const baseRowHeight = clamp(Math.round(viewportHeight / Math.max(4, density + 2)), 120, 240);

  return {
    columns: columnsCount,
    slotCount,
    baseRowHeight,
  };
};

interface VideoMosaicPrototypeProps {
  sources: VideoMosaicSource[];
  isLoading?: boolean;
  error?: string | null;
  onExit: () => void;
  columns: number;
  performancePreset: MosaicPerformancePreset;
}

const VideoMosaicPrototype = ({
  sources,
  isLoading = false,
  error = null,
  onExit,
  columns,
  performancePreset,
}: VideoMosaicPrototypeProps) => {
  const preset = PERFORMANCE_PRESETS[performancePreset] ?? PERFORMANCE_PRESETS.medium;
  const [layout, setLayout] = useState(() => computeLayout(columns));
  const initialSlotCount = resolveTargetSlotCount(sources.length, layout.slotCount, preset.maxActiveSlots);
  const [slots, setSlots] = useState<ActiveSlot[]>(() => buildInitialSlots(sources, initialSlotCount, layout.columns));
  const [waitingQueue, setWaitingQueue] = useState<VideoMosaicSource[]>(() => buildWaitingQueue(sources, slots));
  const [audibleSlotKey, setAudibleSlotKey] = useState<string | null>(null);
  const errorCooldownRef = useRef<Map<string, number>>(new Map());
  const preloadedRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const fullscreenAttemptedRef = useRef(false);

  const showEmptyState = !isLoading && !error && sources.length === 0;

  const isSourceCooling = useCallback((sourceId: string) => {
    const store = errorCooldownRef.current;
    const expiry = store.get(sourceId);
    if (typeof expiry !== 'number') {
      return false;
    }
    if (expiry <= Date.now()) {
      store.delete(sourceId);
      return false;
    }
    return true;
  }, []);

  const putSourceOnCooldown = useCallback((sourceId: string) => {
    if (!sourceId) {
      return;
    }
    errorCooldownRef.current.set(sourceId, Date.now() + ERROR_COOLDOWN_MS);
  }, []);

  const filterAvailableSources = useCallback(
    (list: VideoMosaicSource[]) => list.filter((source) => !isSourceCooling(source.id)),
    [isSourceCooling]
  );

  useEffect(() => {
    const targetCount = resolveTargetSlotCount(sources.length, layout.slotCount, preset.maxActiveSlots);
    setSlots((prev) => {
      if (targetCount === 0) {
        return [];
      }

      const sourceMap = new Map(sources.map((source) => [source.id, source]));
      const next: ActiveSlot[] = [];
      const usedIds = new Set<string>();

      for (const slot of prev) {
        if (next.length >= targetCount) {
          break;
        }
        const source = sourceMap.get(slot.video.id);
        if (!source || usedIds.has(source.id)) {
          continue;
        }
        const { colSpan, rowSpan } = createTileSpan(source, layout.columns);
        next.push({
          key: slot.key,
          video: source,
          colSpan,
          rowSpan,
        });
        usedIds.add(source.id);
      }

      const remainingPool: VideoMosaicSource[] = filterAvailableSources(
        sources.filter((source) => !usedIds.has(source.id))
      );

      while (next.length < targetCount && sources.length > 0) {
        if (remainingPool.length === 0) {
          const availablePool = filterAvailableSources(sources);
          const fallbackPool = availablePool.length > 0 ? availablePool : sources;
          const video = pickRandomVideo(fallbackPool);
          if (!video) {
            break;
          }
          const { colSpan, rowSpan } = createTileSpan(video, layout.columns);
          next.push({
            key: createSlotKey(video.id),
            video,
            colSpan,
            rowSpan,
          });
          continue;
        }

        const pickIndex = Math.floor(Math.random() * remainingPool.length);
        const [video] = remainingPool.splice(pickIndex, 1);
        if (!video) {
          continue;
        }
        usedIds.add(video.id);
        const { colSpan, rowSpan } = createTileSpan(video, layout.columns);
        next.push({
          key: createSlotKey(video.id),
          video,
          colSpan,
          rowSpan,
        });
      }

      if (next.length > targetCount) {
        next.length = targetCount;
      }

      if (
        next.length === prev.length &&
        next.every(
          (slot, index) =>
            slot.key === prev[index]?.key &&
            slot.colSpan === prev[index]?.colSpan &&
            slot.rowSpan === prev[index]?.rowSpan
        )
      ) {
        return prev;
      }

      return next;
    });
  }, [sources, layout.columns, layout.slotCount, preset.maxActiveSlots, filterAvailableSources]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleResize = () => {
      setLayout((prev) => {
        const next = computeLayout(columns);
        if (
          prev.columns === next.columns &&
          prev.slotCount === next.slotCount &&
          prev.baseRowHeight === next.baseRowHeight
        ) {
          return prev;
        }
        return next;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [columns]);

  useEffect(() => {
    setLayout((prev) => {
      const next = computeLayout(columns);
      if (
        prev.columns === next.columns &&
        prev.slotCount === next.slotCount &&
        prev.baseRowHeight === next.baseRowHeight
      ) {
        return prev;
      }
      return next;
    });
  }, [columns]);

  useEffect(() => {
    if (slots.length === 0) {
      setAudibleSlotKey(null);
      return;
    }

    setAudibleSlotKey((current) => {
      if (current && slots.some((slot) => slot.key === current)) {
        return current;
      }
      return slots[0]?.key ?? null;
    });

    if (typeof window === 'undefined') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setAudibleSlotKey((current) => {
        if (slots.length === 0) {
          return null;
        }
        const currentIndex = current ? slots.findIndex((slot) => slot.key === current) : -1;
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % slots.length : 0;
        return slots[nextIndex]?.key ?? null;
      });
    }, preset.soundSwitchInterval);

    return () => window.clearInterval(intervalId);
  }, [slots, preset.soundSwitchInterval]);

  useEffect(() => {
    setWaitingQueue((prevQueue) => {
      if (sources.length === 0) {
        return prevQueue.length === 0 ? prevQueue : [];
      }
      const activeIds = new Set(slots.map((slot) => slot.video.id));
      const desired = filterAvailableSources(sources).filter((source) => !activeIds.has(source.id));
      if (desired.length === 0) {
        return prevQueue.length === 0 ? prevQueue : [];
      }
      const desiredIds = new Set(desired.map((item) => item.id));
      const preserved = prevQueue.filter((item) => desiredIds.has(item.id));
      if (preserved.length === desired.length) {
        return preserved.length === prevQueue.length ? prevQueue : preserved;
      }
      const preservedIds = new Set(preserved.map((item) => item.id));
      const missing = desired.filter((item) => !preservedIds.has(item.id));
      if (missing.length === 0) {
        return preserved.length === prevQueue.length ? prevQueue : preserved;
      }
      return [...preserved, ...shuffleArray(missing)];
    });
  }, [slots, sources, filterAvailableSources]);

  useEffect(() => {
    if (typeof document === 'undefined' || !audibleSlotKey) {
      return;
    }
    const element = document.querySelector<HTMLVideoElement>(`video[data-slot-key="${audibleSlotKey}"]`);
    if (!element) {
      return;
    }
    element.muted = false;
    safelyPlay(element);
  }, [audibleSlotKey]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const handleChange = () => {
      if (!document.fullscreenElement) {
        onExit();
      }
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, [onExit]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onExit();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  useEffect(() => {
    if (typeof document === 'undefined' || fullscreenAttemptedRef.current) {
      return;
    }
    const root = document.getElementById('mosaic-prototype-root');
    if (!root || typeof root.requestFullscreen !== 'function') {
      return;
    }
    fullscreenAttemptedRef.current = true;
    try {
      const result = root.requestFullscreen();
      if (result && typeof result.catch === 'function') {
        result.catch((reason) => {
          fullscreenAttemptedRef.current = false;
          if (process.env.NODE_ENV !== 'production') {
            console.warn('动态视频拼墙未能自动进入全屏：', reason);
          }
        });
      }
    } catch (error) {
      fullscreenAttemptedRef.current = false;
      if (process.env.NODE_ENV !== 'production') {
        console.warn('动态视频拼墙未能自动进入全屏：', error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || slots.length < 2) {
      return;
    }
    const intervalId = window.setInterval(() => {
      let queueSnapshot = waitingQueue.filter((item) => !isSourceCooling(item.id));
      let queueChanged = queueSnapshot.length !== waitingQueue.length;
      let audioUpdate: { previous: string; next: string } | undefined;

      setSlots((prev) => {
        if (prev.length < 2) {
          return prev;
        }
        const next = [...prev];
        const batch = Math.min(preset.shuffleBatchSize, next.length);
        const activeIds = new Set(next.map((slot) => slot.video.id));

        for (let index = 0; index < batch; index++) {
          const from = Math.floor(Math.random() * next.length);
          const [slot] = next.splice(from, 1);
          if (!slot) {
            continue;
          }
          activeIds.delete(slot.video.id);

          let replacement: VideoMosaicSource | null = null;
          if (queueSnapshot.length > 0 && Math.random() < 0.6) {
            replacement = queueSnapshot.shift() ?? null;
            if (replacement) {
              queueChanged = true;
            }
          }

          if (!replacement) {
            const unusedSources = sources.filter((source) => !activeIds.has(source.id));
            const availableUnused = filterAvailableSources(unusedSources);
            const fallbackPool = availableUnused.length > 0 ? availableUnused : filterAvailableSources(sources);
            const pool = fallbackPool.length > 0 ? fallbackPool : unusedSources.length > 0 ? unusedSources : sources;
            replacement = pickRandomVideo(pool);
          }

          let updatedSlot: ActiveSlot;
          if (replacement) {
            const { colSpan, rowSpan } = createTileSpan(replacement, layout.columns);
            updatedSlot = {
              key: createSlotKey(replacement.id),
              video: replacement,
              colSpan,
              rowSpan,
            };
          } else {
            const { colSpan, rowSpan } = createTileSpan(slot.video, layout.columns);
            updatedSlot = {
              ...slot,
              colSpan,
              rowSpan,
            };
          }

          if (audibleSlotKey === slot.key) {
            audioUpdate = { previous: slot.key, next: updatedSlot.key };
          }

          activeIds.add(updatedSlot.video.id);
          const to = Math.floor(Math.random() * (next.length + 1));
          next.splice(to, 0, updatedSlot);
        }
        return next;
      });

      if (queueChanged) {
        setWaitingQueue(queueSnapshot);
      }

      if (audioUpdate) {
        setAudibleSlotKey((current) => (current === audioUpdate?.previous ? audioUpdate.next : current));
      }
    }, SHUFFLE_INTERVAL);
    return () => window.clearInterval(intervalId);
  }, [
    slots.length,
    layout.columns,
    sources,
    waitingQueue,
    audibleSlotKey,
    preset.shuffleBatchSize,
    filterAvailableSources,
    isSourceCooling,
  ]);

  const replaceSlot = useCallback(
    (slotIndex: number, options?: { failedSourceId?: string }) => {
      const failedSourceId = options?.failedSourceId ?? null;
      if (failedSourceId) {
        putSourceOnCooldown(failedSourceId);
      }

      const baseQueue = failedSourceId
        ? waitingQueue.filter((item) => item.id !== failedSourceId)
        : waitingQueue;
      let queueSnapshot = baseQueue.filter((item) => !isSourceCooling(item.id));
      let queueChanged = queueSnapshot.length !== waitingQueue.length;
      let audioUpdate: { previous: string; next: string } | undefined;

      setSlots((prev) => {
        const target = prev[slotIndex];
        if (!target) {
          return prev;
        }

        let nextVideo: VideoMosaicSource | null = null;
        if (queueSnapshot.length > 0) {
          const head = queueSnapshot.shift() ?? null;
          if (head) {
            nextVideo = head;
            queueChanged = true;
          }
        }

        if (!nextVideo) {
          const activeIds = new Set(
            prev.map((slot, index) => (index === slotIndex ? null : slot.video.id)).filter(Boolean) as string[]
          );
          const unused = sources.filter((source) => !activeIds.has(source.id));
          const availableUnused = filterAvailableSources(unused);
          const fallbackPool = availableUnused.length > 0 ? availableUnused : filterAvailableSources(sources);
          const pool = fallbackPool.length > 0 ? fallbackPool : unused.length > 0 ? unused : sources;
          nextVideo = pickRandomVideo(pool) ?? target.video;
        }

        const video = nextVideo ?? target.video;
        if (!video) {
          return prev;
        }

        const { colSpan, rowSpan } = createTileSpan(video, layout.columns);
        const updatedSlot: ActiveSlot = {
          key: createSlotKey(video.id),
          video,
          colSpan,
          rowSpan,
        };

        const next = [...prev];
        next[slotIndex] = updatedSlot;

        if (audibleSlotKey === target.key) {
          audioUpdate = { previous: target.key, next: updatedSlot.key };
        }

        return next;
      });

      if (queueChanged) {
        setWaitingQueue(queueSnapshot);
      }

      if (audioUpdate) {
        setAudibleSlotKey((current) => (current === audioUpdate?.previous ? audioUpdate.next : current));
      }
    },
    [
      waitingQueue,
      putSourceOnCooldown,
      isSourceCooling,
      filterAvailableSources,
      sources,
      layout.columns,
      audibleSlotKey,
    ]
  );

  const handleEnded = useCallback(
    (slotIndex: number, videoElement: HTMLVideoElement | null) => {
      if (videoElement && videoElement.currentTime < SLOT_MIN_DURATION) {
        videoElement.currentTime = 0;
        safelyPlay(videoElement);
        return;
      }
      replaceSlot(slotIndex);
    },
    [replaceSlot]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const intervalId = window.setInterval(() => {
      const store = errorCooldownRef.current;
      const now = Date.now();
      for (const [id, expiry] of store.entries()) {
        if (expiry <= now) {
          store.delete(id);
        }
      }
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const store = preloadedRef.current;
    if (preset.preloadAhead <= 0) {
      if (store.size > 0) {
        for (const [, element] of store.entries()) {
          element.removeAttribute('src');
          element.load();
        }
        store.clear();
      }
      return;
    }

    const targets = waitingQueue.slice(0, preset.preloadAhead);
    const keepIds = new Set(targets.map((item) => item.id));

    targets.forEach((source) => {
      if (store.has(source.id)) {
        return;
      }
      const element = document.createElement('video');
      element.preload = 'auto';
      element.src = source.src;
      element.muted = true;
      element.playsInline = true;
      store.set(source.id, element);
    });

    for (const [id, element] of store.entries()) {
      if (!keepIds.has(id)) {
        element.removeAttribute('src');
        element.load();
        store.delete(id);
      }
    }
  }, [waitingQueue, preset.preloadAhead]);

  useEffect(() => {
    return () => {
      const store = preloadedRef.current;
      for (const [, element] of store.entries()) {
        element.removeAttribute('src');
        element.load();
      }
      store.clear();
    };
  }, []);

  const gridStyle = {
    gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
    gridAutoRows: `${layout.baseRowHeight}px`,
  } as const;

  return (
    <div id="mosaic-prototype-root" className="mosaic-prototype">
      <main className="mosaic-content">
        {(isLoading || error || showEmptyState) && (
          <div className="mosaic-overlay">
            {isLoading && (
              <div className="mosaic-overlay__block">
                <div className="mosaic-spinner" />
                <p>正在加载所选视频...</p>
              </div>
            )}
            {error && !isLoading && (
              <div className="mosaic-overlay__block mosaic-overlay__block--error">
                <p>{error}</p>
              </div>
            )}
            {showEmptyState && !isLoading && !error && (
              <div className="mosaic-overlay__block">
                <p>当前没有可用的视频源，请退出并调整过滤条件后重试。</p>
              </div>
            )}
          </div>
        )}
        <div className="mosaic-grid" style={gridStyle}>
          {slots.map((slot, index) => (
            <article
              key={slot.key}
              className="mosaic-tile"
              style={{
                gridColumn: `span ${Math.min(slot.colSpan, layout.columns)}`,
                gridRow: `span ${slot.rowSpan}`,
              }}
            >
              <video
                key={slot.key}
                className="mosaic-video"
                src={slot.video.src}
                autoPlay
                muted={slot.key !== audibleSlotKey}
                playsInline
                loop={false}
                preload="auto"
                data-slot-key={slot.key}
                onEnded={(event) => handleEnded(index, event.currentTarget)}
                onError={() => replaceSlot(index, { failedSourceId: slot.video.id })}
                onLoadedMetadata={(event) => {
                  const element = event.currentTarget;
                  const duration = Number.isFinite(element.duration) ? element.duration : 0;
                  if (duration > 0) {
                    const startAt = Math.min(duration * Math.random(), Math.max(0, duration - SLOT_MIN_DURATION));
                    try {
                      element.currentTime = startAt;
                    } catch {
                      // 忽略跳转失败
                    }
                  }
                  safelyPlay(element);
                }}
              />
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default VideoMosaicPrototype;

