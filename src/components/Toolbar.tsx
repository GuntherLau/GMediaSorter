import React from 'react';
import './Toolbar.css';

interface ToolbarProps {
  onFindDuplicates: () => void;
  onFindSimilar: () => void;
  disabled?: boolean;
  videoCount: number;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onFindDuplicates, 
  onFindSimilar, 
  disabled = false,
  videoCount 
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-actions">
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
        共 {videoCount} 个视频
      </div>
    </div>
  );
};

export default Toolbar;
