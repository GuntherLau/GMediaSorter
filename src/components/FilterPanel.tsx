/**
 * FilterPanel 组件
 * 
 * 主过滤器面板容器
 * 集成所有过滤维度，支持折叠和清除全部功能
 */

import { useState } from 'react';
import type { FilterState } from '../types';
import { resolutionDimension, durationDimension, aspectRatioDimension } from '../config/filters';
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
  /** 长宽比过滤时的额外提示，如未知数据统计 */
  aspectRatioNotice?: string | null;
  /** 当前列表中未知长宽比的视频数量，用于快捷筛选 */
  unknownAspectRatioCount: number;
  /** 切换“仅查看未知”快捷筛选 */
  onToggleUnknownAspectRatio: () => void;
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
  aspectRatioNotice = null,
  unknownAspectRatioCount,
  onToggleUnknownAspectRatio,
}) => {
  // 折叠状态（默认展开）
  const [expanded, setExpanded] = useState(true);
  
  // 是否有激活的过滤器
  const hasFilters = hasActiveFilters(filters);
  const isUnknownOnlyActive = filters.aspectRatio === 'unknown';

  // 记录当前激活的过滤维度标签，帮助摘要区域展示更详细信息
  const activeLabels: string[] = [];
  if (filters.resolution !== 'all') {
    const option = resolutionDimension.options.find((item) => item.value === filters.resolution);
    if (option) {
      activeLabels.push(`${resolutionDimension.label}：${option.label}`);
    }
  }
  if (filters.duration !== 'all') {
    const option = durationDimension.options.find((item) => item.value === filters.duration);
    if (option) {
      activeLabels.push(`${durationDimension.label}：${option.label}`);
    }
  }
  if (filters.aspectRatio !== 'all') {
    const option = aspectRatioDimension.options.find((item) => item.value === filters.aspectRatio);
    if (option) {
      // 将“含 X 个未知长宽比”等提示拼接到标签中，帮助用户快速了解筛选副作用
      const labelText = aspectRatioNotice
        ? `${aspectRatioDimension.label}：${option.label}（${aspectRatioNotice}）`
        : `${aspectRatioDimension.label}：${option.label}`;
      activeLabels.push(labelText);
    }
  }

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
          activeLabels={activeLabels}
        />

        {/* 未知长宽比快捷筛选 */}
        {unknownAspectRatioCount > 0 && (
          <button
            type="button"
            className={`unknown-only-btn ${isUnknownOnlyActive ? 'active' : ''}`}
            onClick={onToggleUnknownAspectRatio}
          >
            {isUnknownOnlyActive
              ? `退出仅查看未知（${unknownAspectRatioCount}）`
              : `仅查看未知（${unknownAspectRatioCount}）`}
          </button>
        )}
        
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

          {/* 长宽比过滤 */}
          <FilterDimension
            dimension={aspectRatioDimension}
            value={filters.aspectRatio}
            onChange={(v) => onFilterChange('aspectRatio', v)}
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
