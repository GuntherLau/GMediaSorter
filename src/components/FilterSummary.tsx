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
}) => {
  // 是否正在过滤（数量不同）
  const isFiltering = filtered !== total;
  
  // 过滤百分比
  const percentage = total > 0 ? Math.round((filtered / total) * 100) : 0;

  return (
    <div className={`filter-summary ${isFiltering ? 'filtering' : ''}`}>
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
  );
};
