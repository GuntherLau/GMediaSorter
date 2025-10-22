/**
 * FilterPanel 组件
 * 
 * 主过滤器面板容器
 * 集成所有过滤维度，支持折叠和清除全部功能
 */

import { useState } from 'react';
import type { FilterState } from '../types';
import { resolutionDimension, durationDimension } from '../config/filters';
import { FilterDimension } from './FilterDimension';
import { FilterSummary } from './FilterSummary';
import { hasActiveFilters } from '../utils/filters';
import './FilterPanel.css';

export interface FilterPanelProps {
  /** 当前过滤器状态 */
  filters: FilterState;
  /** 过滤器变更回调 */
  onFilterChange: <K extends keyof FilterState>(
    dimension: K,
    value: FilterState[K]
  ) => void;
  /** 清除所有过滤器 */
  onClearAll: () => void;
  /** 总视频数量 */
  totalCount: number;
  /** 过滤后的数量 */
  filteredCount: number;
}

/**
 * FilterPanel 组件
 * 
 * 提供完整的过滤器界面，包括：
 * - 可折叠的面板
 * - 多个过滤维度
 * - 过滤结果摘要
 * - 清除全部按钮
 * 
 * @example
 * <FilterPanel
 *   filters={filters}
 *   onFilterChange={updateFilter}
 *   onClearAll={clearAllFilters}
 *   totalCount={500}
 *   filteredCount={120}
 * />
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  onClearAll,
  totalCount,
  filteredCount,
}) => {
  // 折叠状态（默认展开）
  const [expanded, setExpanded] = useState(true);
  
  // 是否有激活的过滤器
  const hasFilters = hasActiveFilters(filters);

  return (
    <div className="filter-panel">
      {/* 顶部栏 */}
      <div className="filter-header">
        {/* 折叠按钮 */}
        <button
          className="filter-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          title={expanded ? '收起过滤器' : '展开过滤器'}
        >
          <span className="toggle-icon">{expanded ? '▼' : '▶'}</span>
          <span className="toggle-text">过滤器</span>
        </button>
        
        {/* 过滤结果摘要 */}
        <FilterSummary
          filtered={filteredCount}
          total={totalCount}
        />
        
        {/* 清除全部按钮 */}
        {hasFilters && (
          <button
            className="clear-all-btn"
            onClick={onClearAll}
            title="清除所有过滤条件"
          >
            <span className="clear-icon">✕</span>
            <span className="clear-text">清除全部</span>
          </button>
        )}
      </div>
      
      {/* 过滤器主体（可折叠） */}
      {expanded && (
        <div className="filter-body">
          {/* 分辨率过滤 */}
          <FilterDimension
            dimension={resolutionDimension}
            value={filters.resolution}
            onChange={(v) => onFilterChange('resolution', v)}
          />
          
          {/* 时长过滤 */}
          <FilterDimension
            dimension={durationDimension}
            value={filters.duration}
            onChange={(v) => onFilterChange('duration', v)}
          />
          
          {/* 未来可添加更多过滤维度：
          <FilterDimension
            dimension={fileSizeDimension}
            value={filters.fileSize}
            onChange={(v) => onFilterChange('fileSize', v)}
          />
          */}
        </div>
      )}
    </div>
  );
};
