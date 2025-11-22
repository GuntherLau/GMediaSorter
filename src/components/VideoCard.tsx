import React from 'react';
import type { VideoFile } from '../types';
import { formatDuration } from '../utils/filters';
import { formatFileSize, formatResolution } from '../utils/formatters';

export interface VideoCardProps {
  file: VideoFile;
  selected: boolean;
  onToggleSelect: (filePath: string) => void;
  onPlay: (file: VideoFile) => void;
}

/**
 * 视频卡片组件，统一卡片交互与信息展示
 */
export const VideoCard: React.FC<VideoCardProps> = React.memo(({ file, selected, onToggleSelect, onPlay }) => {
  const handleCardClick = () => {
    onToggleSelect(file.path);
  };

  const handlePlayClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onPlay(file);
  };

  const resolution = formatResolution(file);
  const durationText = file.duration !== null ? formatDuration(file.duration) : null;

  return (
    <div
      className={`video-card ${selected ? 'selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="video-icon">🎬</div>
      <div className="video-info">
        <h3 className="video-name" title={file.name}>
          {file.name}
        </h3>
        <p className="video-details">
          {formatFileSize(file.size)} • {file.extension}
        </p>
        <p className="video-date">
          {new Date(file.modified).toLocaleString('zh-CN')}
        </p>
        {resolution && (
          <p className="video-resolution" title="视频分辨率">
            分辨率: {resolution}
          </p>
        )}
        {durationText && (
          <p className="video-duration" title="视频时长">
            时长: {durationText}
          </p>
        )}
      </div>
      <div className="video-card-actions">
        <button
          className="video-card-play"
          onClick={handlePlayClick}
        >
          播放
        </button>
      </div>
      {selected && <div className="selected-indicator">✓</div>}
    </div>
  );
});

VideoCard.displayName = 'VideoCard';
