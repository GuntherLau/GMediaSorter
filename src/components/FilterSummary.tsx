/**
 * FilterSummary 组件
 * 
 * 显示过滤结果的摘要信息
 * 例如："已过滤 120 / 500 个视频"
 */

import React from 'react';
import './FilterSummary.css';

export interface FilterSummaryProps {
  /** 过滤后的数量 */
  filtered: number;
  /** 总数量 */
  total: number;
  /** 可选：当前激活过滤标签，用于向用户提示具体维度 */
  activeLabels?: string[];
}

/**
 * FilterSummary 组件
 * 
 * 当过滤后的数量与总数量不同时，高亮显示过滤结果
 * 
 * @example
 * <FilterSummary filtered={120} total={500} />
 * // 显示: "已过滤 120 / 500 个视频"
 */
export const FilterSummary: React.FC<FilterSummaryProps> = ({
  filtered,
  total,
  activeLabels = [],
}) => {
  // 是否正在过滤（数量不同）
  const isFiltering = filtered !== total;
  
  // 过滤百分比
  const percentage = total > 0 ? Math.round((filtered / total) * 100) : 0;

  return (
    <div className={`filter-summary ${isFiltering ? 'filtering' : ''}`}>
      <div className="filter-summary-main">
        {isFiltering ? (
          <>
            <span className="filter-summary-label">已过滤</span>
            <span className="filter-summary-count">
              {filtered} / {total}
            </span>
            <span className="filter-summary-percentage">({percentage}%)</span>
          </>
        ) : (
          <>
            <span className="filter-summary-label">共</span>
            <span className="filter-summary-count">{total}</span>
            <span className="filter-summary-label">个视频</span>
          </>
        )}
      </div>
      {/* 展示当前激活的过滤标签，便于快速了解筛选条件 */}
      {isFiltering && activeLabels.length > 0 && (
        <ul className="filter-summary-active">
          {activeLabels.map((label) => (
            <li key={label} className="filter-summary-active-item">
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
