import React from 'react';
import './Toolbar.css';

interface ToolbarProps {
  onFindDuplicates: () => void;
  onFindSimilar: () => void;
  onOpenConversion: () => void;
  disabled?: boolean;
  videoCount: number;
  conversionCount: number;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onFindDuplicates, 
  onFindSimilar, 
  onOpenConversion,
  disabled = false,
  videoCount,
  conversionCount,
}) => {
  const conversionDisabled = disabled || conversionCount === 0;

  return (
    <div className="toolbar">
      <div className="toolbar-actions">
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={onOpenConversion}
          disabled={conversionDisabled}
          title={conversionCount === 0 ? '当前没有可转换的视频' : '批量转换当前列表中的所有视频'}
        >
          <span className="toolbar-btn-icon">🎞️</span>
          视频转码
        </button>
        <button 
          className="toolbar-btn" 
          onClick={onFindDuplicates}
          disabled={disabled || videoCount === 0}
          title="检测完全重复的视频文件"
        >
          <span className="toolbar-btn-icon">🔍</span>
          找相同
        </button>
        <button 
          className="toolbar-btn" 
          onClick={onFindSimilar}
          disabled={disabled || videoCount === 0}
          title="检测内容相似的视频"
        >
          <span className="toolbar-btn-icon">🎯</span>
          找相似
        </button>
      </div>
      <div className="toolbar-info">
        共 {videoCount} 个视频{conversionCount > 0 ? ' · 转码将处理全部视频' : ''}
      </div>
    </div>
  );
};

export default Toolbar;
