import React, { useState } from 'react';
import { SimilarityResult } from '../types';
import './SimilarityPanel.css';

interface SimilarityPanelProps {
  result: SimilarityResult;
  onClose: () => void;
}

const SimilarityPanel: React.FC<SimilarityPanelProps> = ({ result, onClose }) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分${seconds % 60}秒`;
    const hours = Math.floor(minutes / 60);
    return `${hours}小时${minutes % 60}分`;
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '未知';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="panel-overlay">
      <div className="similarity-panel">
        <div className="panel-header">
          <h2>相似视频检测结果</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="panel-summary">
          <div className="summary-item">
            <span className="summary-label">相似组数</span>
            <span className="summary-value">{result.groups.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">相似文件数</span>
            <span className="summary-value">{result.totalSimilarFiles}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">相似度阈值</span>
            <span className="summary-value">{formatPercentage(result.threshold)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">扫描耗时</span>
            <span className="summary-value">{formatTime(result.scanTime)}</span>
          </div>
        </div>

        <div className="panel-content">
          {result.groups.map((group, index) => (
            <div key={group.id} className="similar-group">
              <div className="group-header" onClick={() => toggleGroup(group.id)}>
                <span className="group-title">
                  <span className="group-icon">{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
                  组 {index + 1}: {group.files.length} 个相似文件
                </span>
                <span className="group-info">
                  平均相似度 {formatPercentage(group.avgSimilarity)}
                </span>
              </div>

              {expandedGroups.has(group.id) && (
                <div className="group-content">
                  <div className="file-list">
                    {group.files.map(file => (
                      <div key={file.path} className="file-item">
                        <div className="file-info">
                          <div className="file-name" title={file.path}>
                            {file.name}
                          </div>
                          <div className="file-meta">
                            {formatSize(file.size)} · 
                            {file.width && file.height && ` ${file.width}×${file.height} · `}
                            时长 {formatDuration(file.duration)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {group.pairs.length > 0 && (
                    <div className="similarity-details">
                      <h4>相似度详情</h4>
                      {group.pairs.map((pair, pairIndex) => (
                        <div key={pairIndex} className="similarity-pair">
                          <div className="pair-files">
                            <span className="pair-file">{pair.file1.name}</span>
                            <span className="pair-separator">↔</span>
                            <span className="pair-file">{pair.file2.name}</span>
                          </div>
                          <div className="similarity-scores">
                            <div className="score-item">
                              <span className="score-label">综合</span>
                              <span className="score-value overall">
                                {formatPercentage(pair.similarity.overall)}
                              </span>
                            </div>
                            <div className="score-item">
                              <span className="score-label">视觉</span>
                              <span className="score-value">
                                {formatPercentage(pair.similarity.visual)}
                              </span>
                            </div>
                            <div className="score-item">
                              <span className="score-label">时长</span>
                              <span className="score-value">
                                {formatPercentage(pair.similarity.duration)}
                              </span>
                            </div>
                            <div className="score-item">
                              <span className="score-label">分辨率</span>
                              <span className="score-value">
                                {formatPercentage(pair.similarity.resolution)}
                              </span>
                            </div>
                            <div className="score-item">
                              <span className="score-label">大小</span>
                              <span className="score-value">
                                {formatPercentage(pair.similarity.fileSize)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {result.groups.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <p>未发现相似视频</p>
              <p className="empty-hint">尝试降低相似度阈值</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimilarityPanel;
