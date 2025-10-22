/**
 * FilterChip 组件
 * 
 * 过滤器按钮组件，采用 Chip 风格设计
 * 支持激活状态、图标和点击事件
 */

import React from 'react';
import './FilterChip.css';

export interface FilterChipProps {
  /** 按钮显示文本 */
  label: string;
  /** 可选的图标（emoji 或图标字符） */
  icon?: string;
  /** 是否处于激活状态 */
  active: boolean;
  /** 点击事件处理函数 */
  onClick: () => void;
}

/**
 * FilterChip 组件
 * 
 * 使用 React.memo 优化性能，避免不必要的重渲染
 * 
 * @example
 * <FilterChip
 *   label="1080p"
 *   active={true}
 *   onClick={() => handleFilter('1080p')}
 * />
 */
export const FilterChip = React.memo<FilterChipProps>(({
  label,
  icon,
  active,
  onClick,
}) => {
  return (
    <button
      type="button"
      className={`filter-chip ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      title={label}
    >
      {icon && <span className="chip-icon">{icon}</span>}
      {label}
    </button>
  );
});

FilterChip.displayName = 'FilterChip';
