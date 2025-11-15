import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './VideoPlayer.css';
import type { PlayerPreferences, VideoPreviewSource } from '../types';

interface VideoPlayerProps {
  open: boolean;
  source: VideoPreviewSource | null;
  preferences: PlayerPreferences;
  onClose: () => void;
  onUpdatePreferences: (preferences: PlayerPreferences) => void;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const secs = (total % 60).toString().padStart(2, '0');
  const hours = Math.floor(total / 3600);
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins}:${secs}`;
  }
  return `${mins}:${secs}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  open,
  source,
  preferences,
  onClose,
  onUpdatePreferences,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [playbackRate, setPlaybackRate] = useState(() => preferences.defaultPlaybackRate || 1);
  const progressKey = useMemo(() => (source ? `gms-player-progress:${source.filePath}` : null), [source]);
  const metadataSummary = useMemo(() => {
    if (!source?.metadata) {
      return '暂无元数据';
    }
    const parts: string[] = [];
    if (source.metadata.formatName) {
      parts.push(source.metadata.formatName.toUpperCase());
    }
    if (source.metadata.codec) {
      parts.push(source.metadata.codec.toUpperCase());
    }
    if (source.metadata.width && source.metadata.height) {
      parts.push(`${source.metadata.width}×${source.metadata.height}`);
    }
    if (source.metadata.bitRate) {
      parts.push(`${Math.round(source.metadata.bitRate / (1000 * 1000))} Mbps`);
    }
    return parts.length > 0 ? parts.join(' · ') : '暂无元数据';
  }, [source?.metadata]);

  useEffect(() => {
    // 关闭抽屉时立即暂停，避免后台继续播放。
    if (!open) {
      videoRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (preferences.autoPlay) {
      videoRef.current
        ?.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(false);
    }
  }, [open, preferences.autoPlay]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    videoEl.volume = volume;
  }, [volume]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    videoEl.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const nextRate = preferences.defaultPlaybackRate || 1;
    setPlaybackRate(nextRate);
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.playbackRate = nextRate;
    }
  }, [preferences.defaultPlaybackRate, source?.filePath]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    videoEl.loop = preferences.loop;
  }, [preferences.loop]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) {
        return;
      }
      const tagName = (event.target as HTMLElement | null)?.tagName ?? '';
      if (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') {
        return;
      }

      const videoEl = videoRef.current;
      if (!videoEl) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case ' ': {
          event.preventDefault();
          if (videoEl.paused) {
            videoEl
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => undefined);
          } else {
            videoEl.pause();
            setIsPlaying(false);
          }
          break;
        }
        case 'arrowleft': {
          event.preventDefault();
          videoEl.currentTime = clamp(videoEl.currentTime - 5, 0, videoEl.duration || Number.POSITIVE_INFINITY);
          break;
        }
        case 'arrowright': {
          event.preventDefault();
          videoEl.currentTime = clamp(videoEl.currentTime + 5, 0, videoEl.duration || Number.POSITIVE_INFINITY);
          break;
        }
        case 'arrowup': {
          event.preventDefault();
          const newVolume = clamp(videoEl.volume + 0.1, 0, 1);
          videoEl.volume = newVolume;
          setVolume(newVolume);
          break;
        }
        case 'arrowdown': {
          event.preventDefault();
          const newVolume = clamp(videoEl.volume - 0.1, 0, 1);
          videoEl.volume = newVolume;
          setVolume(newVolume);
          break;
        }
        case 'f': {
          event.preventDefault();
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          } else {
            void videoEl.requestFullscreen().catch(() => undefined);
          }
          break;
        }
        case 'm': {
          event.preventDefault();
          const nextMuted = !videoEl.muted;
          videoEl.muted = nextMuted;
          setIsMuted(nextMuted);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleTimeUpdate = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    setCurrentTime(videoEl.currentTime);
    if (preferences.rememberProgress && progressKey) {
      try {
        window.localStorage.setItem(progressKey, String(videoEl.currentTime));
      } catch {
        // ignore storage failures
      }
    }
  }, [preferences.rememberProgress, progressKey]);

  const handleLoadedMetadata = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    setDuration(videoEl.duration || source?.metadata?.duration || 0);

    if (preferences.rememberProgress && progressKey) {
      try {
        const saved = window.localStorage.getItem(progressKey);
        if (saved) {
          const restoreTime = Number.parseFloat(saved);
          if (Number.isFinite(restoreTime) && restoreTime > 0 && restoreTime < videoEl.duration) {
            videoEl.currentTime = restoreTime;
            setCurrentTime(restoreTime);
          }
        }
      } catch {
        // ignore storage failures
      }
    }

    if (preferences.autoPlay) {
      videoEl
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [preferences.autoPlay, preferences.rememberProgress, progressKey, source?.metadata?.duration]);

  const handleProgressChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    const value = Number.parseFloat(event.target.value);
    const nextTime = clamp(value * duration, 0, duration);
    videoEl.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [duration]);

  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    const nextVolume = clamp(Number.parseFloat(event.target.value), 0, 1);
    videoEl.volume = nextVolume;
    setVolume(nextVolume);
    if (nextVolume > 0 && videoEl.muted) {
      videoEl.muted = false;
      setIsMuted(false);
    }
  }, []);

  const handlePlaybackRateChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    const nextRate = Number.parseFloat(event.target.value) || 1;
    videoEl.playbackRate = nextRate;
    setPlaybackRate(nextRate);
    onUpdatePreferences({
      ...preferences,
      defaultPlaybackRate: nextRate,
    });
  }, [onUpdatePreferences, preferences]);

  const handleToggleMute = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    const nextMuted = !videoEl.muted;
    videoEl.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  const handleTogglePlay = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    if (videoEl.paused) {
      videoEl
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.pause();
    }
    onClose();
  }, [onClose]);

  const handleRememberToggle = useCallback(() => {
    onUpdatePreferences({
      ...preferences,
      rememberProgress: !preferences.rememberProgress,
    });
  }, [onUpdatePreferences, preferences]);

  const handleAutoPlayToggle = useCallback(() => {
    onUpdatePreferences({
      ...preferences,
      autoPlay: !preferences.autoPlay,
    });
  }, [onUpdatePreferences, preferences]);

  const handleLoopToggle = useCallback(() => {
    onUpdatePreferences({
      ...preferences,
      loop: !preferences.loop,
    });
  }, [onUpdatePreferences, preferences]);

  const progress = duration > 0 ? currentTime / duration : 0;

  if (!open || !source) {
    return null;
  }

  return (
    <div className="video-player-overlay" role="dialog" aria-modal="true">
      <div className="video-player-panel">
        <header className="video-player-header">
          <div>
            <h3>{source.fileName}</h3>
            <p className="video-player-subtitle" title={source.filePath}>
              {metadataSummary}
            </p>
          </div>
          <button className="video-player-close" onClick={handleClose} aria-label="关闭播放器">
            ×
          </button>
        </header>

        <div className="video-player-main">
          <video
            ref={videoRef}
            src={source.url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onEnded={() => setIsPlaying(false)}
            controls={false}
            preload="metadata"
            loop={preferences.loop}
          />
        </div>

        <div className="video-player-controls">
          <div className="video-player-row">
            <button className="video-player-btn" onClick={handleTogglePlay}>
              {isPlaying ? '暂停' : '播放'}
            </button>
            <button className="video-player-btn" onClick={handleToggleMute}>
              {isMuted ? '取消静音' : '静音'}
            </button>
            <button className="video-player-btn" onClick={() => videoRef.current && void videoRef.current.requestFullscreen()}>
              全屏
            </button>
          </div>

          <div className="video-player-row video-player-progress">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={progress}
              onChange={handleProgressChange}
              aria-label="播放进度"
            />
            <span>{formatTime(duration)}</span>
          </div>

          <div className="video-player-row video-player-settings">
            <label>
              音量
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
              />
            </label>
            <label>
              倍速
              <select value={playbackRate} onChange={handlePlaybackRateChange}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <option key={rate} value={rate}>
                    {rate.toFixed(2)}x
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="video-player-row video-player-preferences">
            <label>
              <input type="checkbox" checked={preferences.autoPlay} onChange={handleAutoPlayToggle} /> 自动播放
            </label>
            <label>
              <input type="checkbox" checked={preferences.rememberProgress} onChange={handleRememberToggle} /> 记住播放进度
            </label>
            <label>
              <input type="checkbox" checked={preferences.loop} onChange={handleLoopToggle} /> 循环播放
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
