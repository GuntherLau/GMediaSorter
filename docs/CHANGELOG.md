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

