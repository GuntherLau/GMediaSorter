import { useMemo, useState } from 'react';
import './App.css';
import type { ResolutionFilter, ResolutionPreset, VideoFile } from './types';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatResolution = (file: VideoFile): string | null => {
  if (file.width && file.height) {
    return `${file.width} × ${file.height}`;
  }
  return null;
};

const resolutionLabelDisplay: Record<ResolutionPreset, string> = {
  lt720p: '小于 720p',
  '720p': '720p',
  '1080p': '1080p',
  gt1080p: '大于 1080p',
};

const resolutionFilterOptions: Array<{ value: ResolutionFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'lt720p', label: '小于 720p' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: 'gt1080p', label: '大于 1080p' },
];

function App() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [resolutionFilter, setResolutionFilter] = useState<ResolutionFilter>('all');

  const filteredVideoFiles = useMemo(() => {
    if (resolutionFilter === 'all') {
      return videoFiles;
    }
    return videoFiles.filter((file) => file.resolutionLabel === resolutionFilter);
  }, [videoFiles, resolutionFilter]);

  const handleSelectDirectory = async () => {
    try {
      const dirPath = await window.electronAPI.selectDirectory();
      if (dirPath) {
        setCurrentPath(dirPath);
        await loadVideoFiles(dirPath);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      alert('选择目录失败');
    }
  };

  const loadVideoFiles = async (dirPath: string) => {
    try {
      setLoading(true);
      const files = await window.electronAPI.getVideoFiles(dirPath);
      setVideoFiles(files);
      setSelectedFiles(new Set());
      setResolutionFilter('all');
    } catch (error) {
      console.error('Error loading video files:', error);
      alert('加载视频文件失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filePath)) {
      newSelection.delete(filePath);
    } else {
      newSelection.add(filePath);
    }
    setSelectedFiles(newSelection);
  };

  const handleFilterChange = (filter: ResolutionFilter) => {
    setResolutionFilter(filter);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>GMediaSorter - 视频管理工具</h1>
        <button onClick={handleSelectDirectory} className="select-btn">
          选择文件夹
        </button>
      </header>

      <main className="app-main">
        {currentPath && (
          <div className="current-path">
            <strong>当前路径:</strong> {currentPath}
          </div>
        )}

        {loading ? (
          <div className="loading">加载中...</div>
        ) : videoFiles.length > 0 ? (
          <div className="video-list">
            <div className="list-header">
              <span>找到 {videoFiles.length} 个视频文件</span>
              {resolutionFilter !== 'all' && (
                <span className="filter-count">筛选符合 {filteredVideoFiles.length} 个</span>
              )}
              {selectedFiles.size > 0 && (
                <span className="selection-info">已选择 {selectedFiles.size} 个文件</span>
              )}
            </div>

            <div className="filter-bar">
              <span className="filter-label">分辨率过滤:</span>
              <div className="filter-options">
                {resolutionFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`filter-btn ${resolutionFilter === option.value ? 'active' : ''}`}
                    onClick={() => handleFilterChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredVideoFiles.length > 0 ? (
              <div className="video-grid">
                {filteredVideoFiles.map((file) => (
                  <div
                    key={file.path}
                    className={`video-card ${selectedFiles.has(file.path) ? 'selected' : ''}`}
                    onClick={() => toggleFileSelection(file.path)}
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
                      {formatResolution(file) && (
                        <p className="video-resolution" title="视频分辨率">
                          分辨率: {formatResolution(file)}
                          {file.resolutionLabel && ` • ${resolutionLabelDisplay[file.resolutionLabel]}`}
                        </p>
                      )}
                    </div>
                    {selectedFiles.has(file.path) && <div className="selected-indicator">✓</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-filter-state">当前筛选条件下没有符合的视频</div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <p>请选择一个文件夹以查看视频文件</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
