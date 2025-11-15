import React from 'react';
import './Toolbar.css';
import type { MosaicPerformancePreset } from './VideoMosaicPrototype';

interface ToolbarProps {
  onFindDuplicates: () => void;
  onFindSimilar: () => void;
  onOpenConversion: () => void;
  onOpenContainerConversion: () => void;
  onOpenMosaic: () => void;
  disabled?: boolean;
  videoCount: number;
  conversionCount: number;
  containerConversionCount: number;
  mosaicSourceCount: number;
  mosaicLoading?: boolean;
  mosaicColumns: number;
  onMosaicColumnsChange: (columns: number) => void;
  mosaicPerformancePreset: MosaicPerformancePreset;
  onMosaicPerformanceChange: (preset: MosaicPerformancePreset) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onFindDuplicates, 
  onFindSimilar, 
  onOpenConversion,
  onOpenContainerConversion,
  onOpenMosaic,
  disabled = false,
  videoCount,
  conversionCount,
  containerConversionCount,
  mosaicSourceCount,
  mosaicLoading = false,
  mosaicColumns,
  onMosaicColumnsChange,
  mosaicPerformancePreset,
  onMosaicPerformanceChange,
}) => {
  const conversionDisabled = disabled || conversionCount === 0;
  const containerConversionDisabled = disabled || containerConversionCount === 0;
  const mosaicDisabled = disabled || mosaicSourceCount === 0 || mosaicLoading;

  return (
    <div className="toolbar">
      <div className="toolbar-actions">
        <div className="toolbar-mosaic-settings">
          <label className="toolbar-mosaic-label">
            拼墙列数
            <select
              className="toolbar-mosaic-select"
              value={mosaicColumns}
              onChange={(event) => onMosaicColumnsChange(Number(event.target.value))}
            >
              {[2, 3, 4, 5].map((option) => (
                <option key={option} value={option}>
                  {option} 列
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-mosaic-label">
            性能预设
            <select
              className="toolbar-mosaic-select"
              value={mosaicPerformancePreset}
              onChange={(event) => onMosaicPerformanceChange(event.target.value as MosaicPerformancePreset)}
            >
              <option value="low">低（少量视频）</option>
              <option value="medium">中（默认）</option>
              <option value="high">高（更多视频）</option>
            </select>
          </label>
        </div>
        <button
          className="toolbar-btn"
          onClick={onOpenMosaic}
          disabled={mosaicDisabled}
          title={mosaicSourceCount === 0 ? '当前筛选结果为空，请调整过滤条件后重试' : '开启动态视频拼墙演示'}
        >
          <span className="toolbar-btn-icon">🧩</span>
          动态视频拼墙
        </button>
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
          onClick={onOpenContainerConversion}
          disabled={containerConversionDisabled}
          title={containerConversionCount === 0 ? '当前没有可转换的视频' : '批量调整视频封装格式'}
        >
          <span className="toolbar-btn-icon">📦</span>
          容器转换
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
        共 {videoCount} 个视频{videoCount > 0 ? ' · 批量操作将处理当前列表' : ''}
      </div>
    </div>
  );
};

export default Toolbar;
