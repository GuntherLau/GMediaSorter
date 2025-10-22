# 视频时长过滤与多条件过滤器重构规划

## 背景与目标

当前 GMediaSorter 已经实现了基于视频分辨率的过滤功能,但仅支持单一维度的过滤。用户现在希望:

1. **新增时长过滤功能**:提供 6 个时长档位的过滤选项
2. **支持多维度过滤**:同时按分辨率、时长等多个条件过滤
3. **面向未来扩展**:UI 结构能够轻松容纳更多过滤维度(如文件大小、编码格式、帧率等)

该文档定义了实现时长过滤功能的技术方案、UI 重构方案、接口设计和分阶段任务,作为后续迭代开发与验收的依据。

## 当前状态分析

### 已实现的功能

- ✅ 分辨率过滤:4 个档位(< 720p, 720p, 1080p, > 1080p)
- ✅ 视频元数据:已通过 ffprobe 获取 `duration` 字段
- ✅ 单一过滤器:使用 `resolutionFilter` 状态管理

### 存在的问题

1. **UI 局限性**:当前 filter-bar 采用单行按钮布局,不适合多维度过滤
2. **状态管理**:只支持单一过滤维度,无法组合多个条件
3. **扩展性差**:新增过滤维度需要大量重复代码

## 需求定义

### 时长过滤档位

| 档位 | 条件 | 显示标签 | 说明 |
|------|------|----------|------|
| ≤ 30秒 | `duration ≤ 30` | 30秒内 | 超短视频/片段 |
| 30秒-2分钟 | `30 < duration ≤ 120` | 30秒-2分钟 | 短视频/音乐MV |
| 2-10分钟 | `120 < duration ≤ 600` | 2-10分钟 | 中短视频/预告片 |
| 10-30分钟 | `600 < duration ≤ 1800` | 10-30分钟 | 中长视频/剧集 |
| 30分钟-1小时 | `1800 < duration ≤ 3600` | 30分钟-1小时 | 长视频/电影 |
| > 1小时 | `duration > 3600` | 超过1小时 | 超长视频/直播回放 |

**重要说明**：各档位之间是**互斥的区间**，不会有重叠。例如选择"2-10分钟"时，不会包含"30秒内"和"30秒-2分钟"的视频。

### 多维度过滤行为

- **组合逻辑**:多个过滤维度之间使用 **AND** 逻辑(同时满足所有条件)
- **单维度逻辑**:同一维度内只能选择一个选项(互斥)
- **清除过滤**:每个维度独立清除,或一键清除所有过滤

## 技术方案

### 1. 数据模型扩展

#### 类型定义 (`src/types.ts`)

```typescript
// 时长预设档位（互斥区间）
export type DurationPreset = 
  | 'lte30s'      // ≤ 30秒
  | 'range30s2m'  // 30秒 < duration ≤ 2分钟
  | 'range2m10m'  // 2分钟 < duration ≤ 10分钟
  | 'range10m30m' // 10分钟 < duration ≤ 30分钟
  | 'range30m1h'  // 30分钟 < duration ≤ 1小时
  | 'gt1h';       // > 1小时

// 单一过滤器类型(保持向后兼容)
export type ResolutionFilter = 'all' | ResolutionPreset;
export type DurationFilter = 'all' | DurationPreset;

// 多维度过滤器状态
export interface FilterState {
  resolution: ResolutionFilter;
  duration: DurationFilter;
  // 未来扩展:
  // fileSize?: FileSizeFilter;
  // codec?: CodecFilter;
  // frameRate?: FrameRateFilter;
}

// 过滤器配置元数据
export interface FilterDimension<T extends string = string> {
  key: string;                    // 过滤维度的唯一标识
  label: string;                  // 显示名称
  options: Array<{
    value: T | 'all';
    label: string;
    icon?: string;                // 可选图标
  }>;
  defaultValue: T | 'all';        // 默认值
}

// VideoFile 接口已包含 duration 字段,无需修改
```

#### 主进程数据 (`electron/main.ts`)

- ✅ 已通过 ffprobe 获取 `duration` 字段
- ✅ 无需修改,时长数据已存在

### 2. UI 架构重构

#### 设计原则

1. **模块化**:每个过滤维度独立组件,便于复用
2. **可折叠**:过滤器面板支持折叠,节省屏幕空间
3. **响应式**:适配不同屏幕尺寸
4. **可扩展**:新增维度只需添加配置,无需改动布局代码

#### 新 UI 结构

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar: [找相同] [找相似]  已过滤: 120/500  已选: 3   │
├─────────────────────────────────────────────────────────┤
│ ▼ 过滤器 (Filters)                          [清除全部] │
│                                                          │
│  📐 分辨率                                               │
│  [ 全部 ] [ <720p ] [ 720p ] [ 1080p ] [ >1080p ]     │
│                                                          │
│  ⏱️ 时长                                                 │
│  [ 全部 ] [ 30秒内 ] [ 2分钟内 ] [ 10分钟内 ]         │
│  [ 30分钟内 ] [ 1小时内 ] [ 超过1小时 ]                │
│                                                          │
│  + 更多过滤器 (未来扩展)                                │
├─────────────────────────────────────────────────────────┤
│ 视频列表 (Video Grid)                                   │
└─────────────────────────────────────────────────────────┘
```

#### 组件拆分

```
src/components/
├── FilterPanel.tsx          # 主过滤器面板(容器)
├── FilterDimension.tsx      # 单个过滤维度组件(可复用)
├── FilterChip.tsx           # 过滤器标签按钮
└── FilterSummary.tsx        # 过滤结果摘要(已过滤 X/Y)
```

### 3. 状态管理方案

#### 状态结构 (`App.tsx`)

```typescript
// 替换原有的单一状态
// const [resolutionFilter, setResolutionFilter] = useState<ResolutionFilter>('all');

// 新的多维度状态
const [filters, setFilters] = useState<FilterState>({
  resolution: 'all',
  duration: 'all',
});

// 更新单个过滤维度
const updateFilter = <K extends keyof FilterState>(
  dimension: K,
  value: FilterState[K]
) => {
  setFilters(prev => ({ ...prev, [dimension]: value }));
};

// 清除所有过滤
const clearAllFilters = () => {
  setFilters({
    resolution: 'all',
    duration: 'all',
  });
};
```

#### 过滤逻辑

```typescript
const filteredVideoFiles = useMemo(() => {
  return videoFiles.filter(file => {
    // 分辨率过滤
    if (filters.resolution !== 'all') {
      if (file.resolutionLabel !== filters.resolution) {
        return false;
      }
    }

    // 时长过滤
    if (filters.duration !== 'all') {
      if (!matchDurationFilter(file.duration, filters.duration)) {
        return false;
      }
    }

    // 未来可添加更多维度...
    return true;
  });
}, [videoFiles, filters]);

// 时长匹配函数
```typescript
const matchDurationFilter = (
  duration: number | null,
  filter: DurationFilter
): boolean => {
  if (filter === 'all' || duration === null) return true;

  switch (filter) {
    case 'lte30s': return duration <= 30;
    case 'range30s2m': return duration > 30 && duration <= 120;
    case 'range2m10m': return duration > 120 && duration <= 600;
    case 'range10m30m': return duration > 600 && duration <= 1800;
    case 'range30m1h': return duration > 1800 && duration <= 3600;
    case 'gt1h': return duration > 3600;
    default: return true;
  }
};
```

### 4. 组件实现详情

#### FilterPanel 组件

```typescript
interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(
    dimension: K,
    value: FilterState[K]
  ) => void;
  onClearAll: () => void;
  totalCount: number;
  filteredCount: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  onClearAll,
  totalCount,
  filteredCount,
}) => {
  const [expanded, setExpanded] = useState(true);
  
  const hasActiveFilters = Object.values(filters).some(v => v !== 'all');

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? '▼' : '▶'} 过滤器
        </button>
        <FilterSummary 
          total={totalCount} 
          filtered={filteredCount} 
        />
        {hasActiveFilters && (
          <button onClick={onClearAll} className="clear-all-btn">
            清除全部
          </button>
        )}
      </div>
      
      {expanded && (
        <div className="filter-body">
          <FilterDimension
            dimension={resolutionDimension}
            value={filters.resolution}
            onChange={(v) => onFilterChange('resolution', v)}
          />
          <FilterDimension
            dimension={durationDimension}
            value={filters.duration}
            onChange={(v) => onFilterChange('duration', v)}
          />
        </div>
      )}
    </div>
  );
};
```

#### FilterDimension 组件

```typescript
interface FilterDimensionProps<T extends string> {
  dimension: FilterDimension<T>;
  value: T | 'all';
  onChange: (value: T | 'all') => void;
}

export const FilterDimension = <T extends string>({
  dimension,
  value,
  onChange,
}: FilterDimensionProps<T>) => {
  return (
    <div className="filter-dimension">
      <div className="dimension-label">
        {dimension.label}
      </div>
      <div className="dimension-options">
        {dimension.options.map(option => (
          <FilterChip
            key={option.value}
            label={option.label}
            icon={option.icon}
            active={value === option.value}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
};
```

### 5. 配置数据

```typescript
// src/config/filters.ts
export const resolutionDimension: FilterDimension<ResolutionPreset> = {
  key: 'resolution',
  label: '📐 分辨率',
  options: [
    { value: 'all', label: '全部' },
    { value: 'lt720p', label: '<720p' },
    { value: '720p', label: '720p' },
    { value: '1080p', label: '1080p' },
    { value: 'gt1080p', label: '>1080p' },
  ],
  defaultValue: 'all',
};

export const durationDimension: FilterDimension<DurationPreset> = {
  key: 'duration',
  label: '⏱️ 时长',
  options: [
    { value: 'all', label: '全部' },
    { value: 'lte30s', label: '30秒内' },
    { value: 'range30s2m', label: '30秒-2分钟' },
    { value: 'range2m10m', label: '2-10分钟' },
    { value: 'range10m30m', label: '10-30分钟' },
    { value: 'range30m1h', label: '30分钟-1小时' },
    { value: 'gt1h', label: '超过1小时' },
  ],
  defaultValue: 'all',
};
```

### 6. 样式设计

#### 设计要点

- 使用卡片式布局,每个维度独立一个区域
- 过滤器按钮采用 chip 风格,支持圆角和阴影
- 激活状态使用主题色高亮
- 支持响应式布局,小屏幕自动换行

#### CSS 结构

```css
.filter-panel {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.filter-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filter-dimension {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dimension-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.dimension-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  padding: 6px 16px;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.filter-chip:hover {
  border-color: var(--primary-color);
  background: var(--bg-hover);
}

.filter-chip.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .filter-body {
    gap: 16px;
  }
  
  .dimension-options {
    gap: 6px;
  }
  
  .filter-chip {
    padding: 5px 12px;
    font-size: 12px;
  }
}
```

### 7. 性能优化

#### 优化点

1. **过滤计算**:使用 `useMemo` 缓存过滤结果
2. **配置数据**:提取为常量,避免重复创建对象
3. **组件渲染**:使用 `React.memo` 优化 FilterChip 组件
4. **时长格式化**:缓存时长显示字符串

#### 示例:FilterChip 优化

```typescript
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
    >
      {icon && <span className="chip-icon">{icon}</span>}
      {label}
    </button>
  );
});
```

## 拆分任务

### Phase 1: 类型与数据基础

| 任务 | 工作内容 | 预估时间 |
|------|----------|----------|
| 1.1 类型定义 | 在 `types.ts` 中添加 `DurationPreset`、`DurationFilter`、`FilterState`、`FilterDimension` 类型 | 30分钟 |
| 1.2 配置文件 | 创建 `src/config/filters.ts`,定义 `resolutionDimension` 和 `durationDimension` | 30分钟 |
| 1.3 工具函数 | 实现 `matchDurationFilter` 时长匹配函数 | 20分钟 |

**验收标准**:
- TypeScript 编译通过,无类型错误
- 配置数据结构完整,包含所有档位选项
- 工具函数单元测试通过

### Phase 2: UI 组件实现

| 任务 | 工作内容 | 预估时间 |
|------|----------|----------|
| 2.1 FilterChip | 创建基础过滤器按钮组件,支持激活状态和图标 | 45分钟 |
| 2.2 FilterSummary | 创建过滤结果摘要组件(显示 X/Y 个视频) | 30分钟 |
| 2.3 FilterDimension | 创建可复用的过滤维度组件,支持泛型 | 1小时 |
| 2.4 FilterPanel | 创建主过滤器面板,支持折叠和清除全部 | 1.5小时 |
| 2.5 样式设计 | 实现 CSS 样式,包含响应式布局 | 1.5小时 |

**验收标准**:
- 所有组件可独立运行和测试
- UI 符合设计稿,支持深色/浅色模式
- 响应式布局在移动端正常显示
- 过滤器面板可正常折叠/展开

### Phase 3: 状态管理重构

| 任务 | 工作内容 | 预估时间 |
|------|----------|----------|
| 3.1 状态迁移 | 将 `resolutionFilter` 迁移到 `filters.resolution` | 30分钟 |
| 3.2 状态更新 | 实现 `updateFilter` 和 `clearAllFilters` 函数 | 30分钟 |
| 3.3 过滤逻辑 | 重构 `filteredVideoFiles`,支持多维度过滤 | 1小时 |
| 3.4 Toolbar 更新 | 更新 Toolbar 组件,传递新的过滤状态 | 30分钟 |

**验收标准**:
- 分辨率过滤功能保持正常工作(向后兼容)
- 时长过滤功能正常工作
- 多维度同时过滤结果正确
- 状态更新无性能问题

### Phase 4: 集成与测试

| 任务 | 工作内容 | 预估时间 |
|------|----------|----------|
| 4.1 组件集成 | 将 FilterPanel 集成到 App.tsx 主界面 | 45分钟 |
| 4.2 旧代码清理 | 删除旧的 filter-bar 相关代码和样式 | 30分钟 |
| 4.3 功能测试 | 测试各种过滤组合和边界情况 | 1小时 |
| 4.4 性能测试 | 测试大量视频(1000+)时的过滤性能 | 30分钟 |
| 4.5 文档更新 | 更新用户指南和实现总结文档 | 45分钟 |

**验收标准**:
- 所有过滤组合正常工作
- 过滤性能满足要求(1000个视频 < 100ms)
- 无遗留的旧代码和样式
- 文档完整,包含截图和使用说明

### Phase 5: 扩展性验证(可选)

| 任务 | 工作内容 | 预估时间 |
|------|----------|----------|
| 5.1 新维度原型 | 实现一个文件大小过滤维度(作为扩展性验证) | 1小时 |
| 5.2 配置驱动 | 验证仅通过配置即可添加新维度 | 30分钟 |
| 5.3 性能评估 | 评估 3-5 个维度时的性能表现 | 30分钟 |

**验收标准**:
- 新增过滤维度无需修改核心组件代码
- 配置文件清晰易懂,便于后续扩展
- 多维度性能满足要求

## 验收标准

### 功能性

1. ✅ 时长过滤的 6 个档位全部正常工作
2. ✅ 分辨率和时长可同时过滤,结果正确
3. ✅ 过滤器面板可折叠/展开
4. ✅ "清除全部"按钮可一键重置所有过滤
5. ✅ 过滤结果摘要实时更新(已过滤 X/Y)
6. ✅ 无视频时长数据时有合理的 fallback 处理

### 易用性

1. ✅ UI 布局清晰,过滤维度分组明确
2. ✅ 按钮状态有明显视觉反馈(激活/未激活)
3. ✅ 响应式设计,在小屏幕上布局合理
4. ✅ 支持键盘导航和快捷键(可选)

### 性能

1. ✅ 1000 个视频文件过滤响应时间 < 100ms
2. ✅ 过滤器状态更新无明显延迟
3. ✅ 组件渲染优化,避免不必要的重绘

### 可维护性

1. ✅ 所有新类型有完整的 TypeScript 定义
2. ✅ 组件和工具函数有清晰的注释
3. ✅ 配置数据与业务逻辑分离
4. ✅ 代码结构支持未来扩展,无硬编码

### 向后兼容性

1. ✅ 原有分辨率过滤功能保持不变
2. ✅ 不影响其他功能模块(找相同、找相似等)
3. ✅ 数据格式兼容,不需要重新扫描视频

## 未来扩展方向

### 短期扩展(3个月内)

- **文件大小过滤**:< 100MB, 100MB-500MB, 500MB-1GB, > 1GB
- **编码格式过滤**:H.264, H.265/HEVC, VP9, AV1
- **帧率过滤**:≤ 24fps, 30fps, 60fps, > 60fps

### 中期扩展(6个月内)

- **组合过滤预设**:保存常用的过滤组合为预设
- **高级过滤模式**:支持自定义范围输入(如时长 5-10 分钟)
- **过滤器历史**:记录最近使用的过滤条件
- **批量操作**:基于过滤结果批量处理视频

### 长期扩展(1年内)

- **智能过滤**:基于内容分析的过滤(场景、人物、音频等)
- **过滤器链**:支持复杂的逻辑组合(AND/OR/NOT)
- **过滤器导出**:将过滤条件导出为可分享的配置文件
- **统计分析**:基于过滤维度的视频库统计报告

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 大量视频时过滤性能差 | 高 | 中 | 使用 Web Worker 进行过滤计算,实现虚拟滚动 |
| UI 在小屏幕上显示混乱 | 中 | 中 | 充分的响应式测试,必要时提供移动端专用布局 |
| 状态管理复杂度增加 | 中 | 低 | 考虑引入状态管理库(如 Zustand),或使用 React Context |
| 向后兼容性问题 | 高 | 低 | 保留旧代码作为备份,分阶段迁移,充分测试 |
| 时长数据缺失率高 | 中 | 低 | 统计缺失率,必要时优化 ffprobe 调用逻辑 |

## 技术债务记录

- **旧的 filter-bar 代码**:在 Phase 4.2 完全移除
- **硬编码的过滤逻辑**:迁移到配置驱动的模式
- **缺少单元测试**:为核心过滤函数补充测试用例
- **样式变量不统一**:统一使用 CSS 变量管理主题色

## 参考资料

- [视频分辨率过滤设计](./video-resolution-filter-plan.md) - 原有分辨率过滤功能设计
- [React useMemo 性能优化](https://react.dev/reference/react/useMemo)
- [CSS Grid 布局指南](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Material Design - Chips](https://material.io/components/chips) - 过滤器按钮设计参考

---

**文档版本**: v1.0  
**创建日期**: 2025-10-22  
**作者**: GMediaSorter Team  
**最后更新**: 2025-10-22

*本方案作为视频时长过滤功能的设计基准,后续开发可按阶段逐步实现并验证。*
