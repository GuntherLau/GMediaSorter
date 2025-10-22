/**
 * FilterDimension 组件
 * 
 * 可复用的过滤维度组件
 * 支持泛型，可用于任何类型的过滤维度
 */

import type { FilterDimension as FilterDimensionType } from '../types';
import { FilterChip } from './FilterChip';
import './FilterDimension.css';

export interface FilterDimensionProps<T extends string> {
  /** 过滤维度配置 */
  dimension: FilterDimensionType<T>;
  /** 当前选中的值 */
  value: T | 'all';
  /** 值变更回调函数 */
  onChange: (value: T | 'all') => void;
}

/**
 * FilterDimension 组件
 * 
 * 通用的过滤维度容器，显示维度标签和所有可选项
 * 
 * @example
 * <FilterDimension
 *   dimension={resolutionDimension}
 *   value={filters.resolution}
 *   onChange={(v) => updateFilter('resolution', v)}
 * />
 */
export const FilterDimension = <T extends string>({
  dimension,
  value,
  onChange,
}: FilterDimensionProps<T>) => {
  return (
    <div className="filter-dimension">
      {/* 维度标签 */}
      <div className="dimension-label">
        {dimension.label}
      </div>
      
      {/* 选项列表 */}
      <div className="dimension-options">
        {dimension.options.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            icon={option.icon}
            active={value === option.value}
            onClick={() => onChange(option.value as T | 'all')}
          />
        ))}
      </div>
    </div>
  );
};
