import React, { useState } from 'react';
import { DuplicateResult, DuplicateGroup, VideoFile } from '../types';
import './DuplicatePanel.css';

interface DuplicatePanelProps {
  result: DuplicateResult;
  onClose: () => void;
  onDeleteFiles: (files: VideoFile[]) => Promise<void>;
}

const DuplicatePanel: React.FC<DuplicatePanelProps> = ({ result, onClose, onDeleteFiles }) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllInGroup = (group: DuplicateGroup, exceptRepresentative: boolean = false) => {
    const newSelected = new Set(selectedFiles);
    group.files.forEach(file => {
      if (!exceptRepresentative || file.path !== group.representativeFile.path) {
        newSelected.add(file.path);
      }
    });
    setSelectedFiles(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    const confirmMessage = `确定要删除选中的 ${selectedFiles.size} 个文件吗？此操作不可撤销！`;
    if (!confirm(confirmMessage)) return;

    setDeleting(true);
    try {
      const filesToDelete = result.groups
        .flatMap(g => g.files)
        .filter(f => selectedFiles.has(f.path));
      
      await onDeleteFiles(filesToDelete);
      setSelectedFiles(new Set());
    } catch (error) {
      alert(`删除失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="panel-overlay">
      <div className="duplicate-panel">
        <div className="panel-header">
          <h2>重复文件检测结果</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="panel-summary">
          <div className="summary-item">
            <span className="summary-label">重复组数</span>
            <span className="summary-value">{result.groups.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">重复文件数</span>
            <span className="summary-value">{result.totalDuplicates}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">浪费空间</span>
            <span className="summary-value highlight">{formatSize(result.totalWasteSize)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">扫描耗时</span>
            <span className="summary-value">{formatTime(result.scanTime)}</span>
          </div>
        </div>

        {selectedFiles.size > 0 && (
          <div className="panel-actions">
            <span className="action-info">已选中 {selectedFiles.size} 个文件</span>
            <button 
              className="btn-delete" 
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? '删除中...' : '删除选中'}
            </button>
          </div>
        )}

        <div className="panel-content">
          {result.groups.map((group, index) => (
            <div key={group.id} className="duplicate-group">
              <div className="group-header" onClick={() => toggleGroup(group.id)}>
                <span className="group-title">
                  <span className="group-icon">{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
                  组 {index + 1}: {group.files.length} 个文件
                </span>
                <span className="group-info">
                  总计 {formatSize(group.totalSize)} · 浪费 {formatSize(group.wasteSize)}
                </span>
              </div>

              {expandedGroups.has(group.id) && (
                <div className="group-content">
                  <div className="group-actions">
                    <button 
                      className="btn-group-action"
                      onClick={() => selectAllInGroup(group, true)}
                    >
                      选择重复项（保留最早）
                    </button>
                  </div>

                  <div className="file-list">
                    {group.files.map(file => {
                      const isRepresentative = file.path === group.representativeFile.path;
                      const isSelected = selectedFiles.has(file.path);

                      return (
                        <div 
                          key={file.path} 
                          className={`file-item ${isSelected ? 'selected' : ''} ${isRepresentative ? 'representative' : ''}`}
                          onClick={() => toggleFileSelection(file.path)}
                        >
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleFileSelection(file.path)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="file-info">
                            <div className="file-name" title={file.path}>
                              {isRepresentative && <span className="badge-keep">保留</span>}
                              {file.name}
                            </div>
                            <div className="file-meta">
                              {formatSize(file.size)} · {new Date(file.modified).toLocaleString()}
                              {file.width && file.height && ` · ${file.width}×${file.height}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {result.groups.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <p>未发现重复文件</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuplicatePanel;
