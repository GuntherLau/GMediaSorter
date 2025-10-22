import { useMemo, useState, useEffect } from 'react';
import './App.css';
import type { VideoFile, DuplicateResult, SimilarityResult, DetectionProgress, SimilarityOptions, FilterState } from './types';
import { filterVideoFiles, formatDuration } from './utils/filters';
import Toolbar from './components/Toolbar';
import ProgressDialog from './components/ProgressDialog';
import DuplicatePanel from './components/DuplicatePanel';
import SimilarityPanel from './components/SimilarityPanel';
import { FilterPanel } from './components/FilterPanel';

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

function App() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  // 多维度过滤器状态
  const [filters, setFilters] = useState<FilterState>({
    resolution: 'all',
    duration: 'all',
  });
  
  // 检测相关状态
  const [detecting, setDetecting] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState<DetectionProgress | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateResult | null>(null);
  const [similarityResult, setSimilarityResult] = useState<SimilarityResult | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // 过滤后的视频文件列表
  const filteredVideoFiles = useMemo(() => {
    return filterVideoFiles(videoFiles, filters);
  }, [videoFiles, filters]);

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
      // 重置过滤器
      setFilters({
        resolution: 'all',
        duration: 'all',
      });
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

  // 更新单个过滤维度
  const updateFilter = <K extends keyof FilterState>(
    dimension: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [dimension]: value }));
  };

  // 清除所有过滤器
  const clearAllFilters = () => {
    setFilters({
      resolution: 'all',
      duration: 'all',
    });
  };

  // 监听检测进度
  useEffect(() => {
    const removeListener = window.electronAPI.onDetectionProgress((progress) => {
      setDetectionProgress(progress);
    });
    return removeListener;
  }, []);

  // 处理"找相同"
  const handleFindDuplicates = async () => {
    try {
      // 清除之前的结果
      setDuplicateResult(null);
      setSimilarityResult(null);
      
      setDetecting(true);
      setCurrentTaskId('duplicate');
      setDetectionProgress({ current: 0, total: videoFiles.length, percentage: 0, message: '准备检测...' });
      
      const result = await window.electronAPI.detectDuplicates(videoFiles);
      
      // 先关闭进度对话框
      setDetectionProgress(null);
      setDetecting(false);
      setCurrentTaskId(null);
      
      // 稍微延迟一下再显示结果，确保进度对话框已关闭
      setTimeout(() => {
        setDuplicateResult(result);
      }, 100);
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      setDetectionProgress(null);
      setDetecting(false);
      setCurrentTaskId(null);
      alert(`检测失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 处理"找相似"
  const handleFindSimilar = async () => {
    // 弹出配置对话框（简化版：使用固定配置）
    const threshold = 0.8; // 可以后续改为用户配置
    
    const options: SimilarityOptions = {
      threshold,
      checkDuration: true,
      checkResolution: true,
      checkFileSize: true,
      checkVisual: true,
    };

    try {
      // 清除之前的结果
      setDuplicateResult(null);
      setSimilarityResult(null);
      
      setDetecting(true);
      setCurrentTaskId('similarity');
      setDetectionProgress({ current: 0, total: videoFiles.length, percentage: 0, message: '准备检测...' });
      
      const result = await window.electronAPI.detectSimilarity(videoFiles, options);
      
      // 先关闭进度对话框
      setDetectionProgress(null);
      setDetecting(false);
      setCurrentTaskId(null);
      
      // 稍微延迟一下再显示结果，确保进度对话框已关闭
      setTimeout(() => {
        setSimilarityResult(result);
      }, 100);
    } catch (error) {
      console.error('Error detecting similarity:', error);
      setDetectionProgress(null);
      setDetecting(false);
      setCurrentTaskId(null);
      alert(`检测失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 取消检测
  const handleCancelDetection = () => {
    // 立即关闭进度对话框
    setDetecting(false);
    setDetectionProgress(null);
    const taskId = currentTaskId;
    setCurrentTaskId(null);
    
    // 异步通知后端取消
    if (taskId) {
      window.electronAPI.cancelDetection(taskId).catch(error => {
        console.error('Error cancelling detection:', error);
      });
    }
  };

  // 删除文件
  const handleDeleteFiles = async (files: VideoFile[]) => {
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        const result = await window.electronAPI.deleteFile(file.path);
        if (!result.success) {
          errors.push(`${file.name}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`部分文件删除失败:\n${errors.join('\n')}`);
    }

    // 刷新视频列表
    if (currentPath) {
      await loadVideoFiles(currentPath);
    }

    // 关闭结果面板
    setDuplicateResult(null);
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
          <div className="loading">
            <div className="spinner"></div>
            <p>正在扫描视频文件...</p>
          </div>
        ) : videoFiles.length > 0 ? (
          <div className="video-list">
            <Toolbar
              onFindDuplicates={handleFindDuplicates}
              onFindSimilar={handleFindSimilar}
              disabled={detecting}
              videoCount={filteredVideoFiles.length}
            />

            {/* 新的多维度过滤器面板 */}
            <FilterPanel
              filters={filters}
              onFilterChange={updateFilter}
              onClearAll={clearAllFilters}
              totalCount={videoFiles.length}
              filteredCount={filteredVideoFiles.length}
            />

            {/* 选中文件提示 */}
            {selectedFiles.size > 0 && (
              <div className="selection-info-bar">
                已选择 {selectedFiles.size} 个文件
              </div>
            )}

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
                        </p>
                      )}
                      {file.duration !== null && (
                        <p className="video-duration" title="视频时长">
                          时长: {formatDuration(file.duration)}
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

      {/* 检测进度对话框 - 只在没有结果时显示 */}
      {detectionProgress && !duplicateResult && !similarityResult && (
        <ProgressDialog
          title={currentTaskId === 'duplicate' ? '重复文件检测中' : '相似视频检测中'}
          progress={detectionProgress}
          onCancel={handleCancelDetection}
        />
      )}

      {/* 重复检测结果面板 */}
      {duplicateResult && (
        <DuplicatePanel
          result={duplicateResult}
          onClose={() => setDuplicateResult(null)}
          onDeleteFiles={handleDeleteFiles}
        />
      )}

      {/* 相似检测结果面板 */}
      {similarityResult && (
        <SimilarityPanel
          result={similarityResult}
          onClose={() => setSimilarityResult(null)}
        />
      )}
    </div>
  );
}

export default App;
