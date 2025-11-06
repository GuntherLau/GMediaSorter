# 更新日志

## 2025-11-06

### Added

- **视频编码格式转换功能（H.264 / H.265）**（[方案文档](video-encoding-conversion-plan.md)）
  - 在菜单栏新增 “工具 → 视频编码转换” 入口，支持下拉选择目标编码
  - 批量转码流程：输出目录选择、进度对话框、取消操作与最终摘要
  - 转码结果面板：展示成功/失败列表、耗时统计，并支持一键打开输出目录
- 新增 `ConversionProgressDialog` 与 `ConversionResultDialog` 组件，提供转码过程的 UI 呈现

### Technical

- 新增 `electron/services/conversion-service.ts`，封装 ffmpeg 队列转码、命名冲突处理与日志记录
- Electron 主进程扩展 IPC：`conversion-start`、`conversion-progress`、`conversion-complete`、`conversion-cancel`、`select-output-directory`、`open-path`
- `preload.ts` 更新安全桥，向渲染进程暴露转码相关 API 与事件订阅
- 引入 `logs/conversion.log` 日志记录机制，保存失败原因
- 渲染层集成转码菜单、进度对话框、结果摘要及错误提示逻辑

## 2025-10-20

### Added

- 接入 ffprobe 元数据解析，支持提取视频分辨率与标签。
- 在渲染层提供分辨率过滤控件（全部 / 小于 720p / 720p / 1080p / 大于 1080p）。
- 视频卡片新增分辨率展示与过滤结果提示。

### Changed

- IPC `get-video-files` 接口扩展返回的视频信息结构，并统一将修改时间序列化为 ISO 字符串。
- 更新前端类型定义与过滤逻辑，确保横竖屏视频均能匹配正确的分辨率分类。
- 修复打包后应用中 ffprobe 路径问题，使用 `app.asar.unpacked` 路径。

## 2025-10-21

### Improved

- 优化加载指示器，使用旋转动画提升用户体验。

### Added

- **视频去重与相似检测功能**（[设计文档](duplicate-similarity-detection-plan.md)）
  - **工具栏组件**：在视频列表上方新增操作工具栏，集成"找相同"和"找相似"功能按钮
  - **找相同功能**：
    - 两阶段哈希检测：快速哈希预筛选 + 完整哈希精确验证
    - 支持检测完全重复的视频文件（即使文件名不同）
    - 显示重复组详情：文件列表、总占用空间、浪费空间统计
    - 批量操作：选择保留文件、批量删除重复项
    - 智能推荐：自动标记最早修改的文件为保留项
  - **找相似功能**：
    - 三级相似检测：元数据预筛选 → 视频指纹提取 → 相似度计算
    - 基于感知哈希（pHash）的视觉相似度分析
    - 多维度相似度评分：综合评估时长、分辨率、文件大小、视觉内容
    - 相似组展示：显示平均相似度、两两配对详情
    - 支持自定义相似度阈值（默认 80%）
  - **进度对话框**：实时显示检测进度、当前处理文件、支持取消操作
  - **检测结果面板**：
    - 重复文件面板：展示重复组、统计信息、支持批量删除
    - 相似视频面板：展示相似组、详细相似度评分
  - **IPC 通信**：
    - `detect-duplicates`：执行重复检测
    - `detect-similarity`：执行相似检测
    - `cancel-detection`：取消正在进行的检测
    - `delete-file`：删除指定文件
    - `detection-progress`：实时推送检测进度

### Technical

- **新增依赖**：
  - `xxhash-wasm`：高性能哈希计算
  - `sharp`：图像处理与帧提取
  - `blockhash-core`：感知哈希算法
  - `uuid`：生成唯一标识符
- **核心模块**：
  - `electron/utils/hash.ts`：快速哈希与完整哈希计算
  - `electron/utils/video-fingerprint.ts`：视频关键帧提取、感知哈希计算
  - `electron/utils/similarity.ts`：多维度相似度计算工具
  - `electron/services/duplicate-detector.ts`：重复检测服务
  - `electron/services/similarity-detector.ts`：相似检测服务（并查集分组算法）
- **UI 组件**：
  - `src/components/Toolbar.tsx`：操作工具栏
  - `src/components/ProgressDialog.tsx`：进度对话框（带取消按钮）
  - `src/components/DuplicatePanel.tsx`：重复结果面板（支持批量选择与删除）
  - `src/components/SimilarityPanel.tsx`：相似结果面板（详细相似度评分展示）
- **性能优化**：
  - 两阶段哈希：避免对所有文件进行完整哈希
  - 元数据预筛选：减少视觉相似度计算量
  - 并发控制：限制同时处理的视频指纹提取数量
  - 流式读取：大文件哈希计算使用流式处理

## 2025-10-22

### Added

- **视频时长过滤与多条件过滤器重构**（[设计文档](video-duration-filter-plan.md)）
  - **时长过滤功能**：新增6个互斥区间档位的时长过滤
    - 30秒内：≤ 30秒（超短视频/片段）
    - 30秒-2分钟：30秒 < duration ≤ 2分钟（短视频/音乐MV）
    - 2-10分钟：2分钟 < duration ≤ 10分钟（中短视频/预告片）
    - 10-30分钟：10分钟 < duration ≤ 30分钟（中长视频/剧集）
    - 30分钟-1小时：30分钟 < duration ≤ 1小时（长视频/电影）
    - 超过1小时：> 1小时（超长视频/直播回放）
  - **多维度过滤架构**：重构过滤器系统，支持分辨率和时长同时过滤
    - 多维度组合过滤（AND逻辑）
    - 配置驱动的可扩展架构
    - 一键清除所有过滤器
  - **新UI组件**：
    - `FilterPanel`：主过滤器面板（可折叠、集成所有维度）
    - `FilterDimension`：通用过滤维度组件（支持泛型，高度复用）
    - `FilterChip`：现代化Chip风格按钮（React.memo优化）
    - `FilterSummary`：过滤结果摘要（实时显示已过滤X/Y）
  - **配置管理**：
    - `src/config/filters.ts`：集中管理所有过滤器配置
    - 新增过滤维度只需添加配置，无需修改核心代码
  - **工具函数**：
    - `src/utils/filters.ts`：完整的过滤工具函数集
    - `matchDurationFilter()`：时长区间匹配
    - `filterVideoFiles()`：批量过滤
    - `formatDuration()`：时长格式化显示

### Changed

- **过滤器UI重构**：替换旧的单行过滤栏为新的多维度过滤面板
  - 从单一分辨率过滤升级为多维度组合过滤
  - 新增可折叠功能，节省屏幕空间
  - 响应式设计，支持移动端和小屏幕
  - 深色模式支持
- **视频卡片增强**：新增时长显示（格式化为易读的 MM:SS 或 HH:MM:SS）
- **类型系统扩展**：
  - 新增 `FilterState` 接口：管理多维度过滤器状态
  - 新增 `FilterDimension<T>` 泛型接口：过滤器元数据配置
  - 新增 `DurationPreset` 和 `DurationFilter` 类型

### Technical

- **架构改进**：
  - 配置驱动架构：所有过滤器配置集中在 `config/filters.ts`
  - 状态管理优化：从单一状态升级为结构化多维度状态
  - 组件化设计：4个独立可复用的过滤器组件
  - 性能优化：使用 React.memo 和 useMemo 减少不必要的重渲染
- **代码组织**：
  - 新增 `src/config/` 目录：存放配置文件
  - 新增 `src/utils/` 目录：存放工具函数
  - 详细的中文注释和JSDoc文档（注释覆盖率 > 40%）
- **响应式与无障碍**：
  - 移动端优化（小屏幕隐藏文字只显示图标）
  - 键盘导航支持（focus-visible）
  - ARIA标签支持

### Documentation

- 新增 `docs/video-duration-filter-plan.md`：时长过滤功能设计文档
- 新增 `docs/DURATION_FILTER_CHANGELOG.md`：详细的开发变更记录
- 新增 `docs/DURATION_FILTER_LOGIC_CHANGE.md`：过滤逻辑调整说明文档
- 更新 `docs/README.md`：添加新功能文档链接

### Notes

- ⚠️ 时长过滤档位采用**互斥区间**设计，选择"2-10分钟"不会包含"30秒内"的视频
- ✅ 向后兼容：原有分辨率过滤功能保持正常工作
- 🚀 可扩展：未来可轻松添加文件大小、编码格式、帧率等过滤维度