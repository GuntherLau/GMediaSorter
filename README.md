# GMediaSorter

基于 Electron + React + Vite + TypeScript 的本地视频管理应用。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-28.0-47848f)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646cff)](https://vitejs.dev/)

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [安装依赖](#安装依赖)
- [开发模式](#开发模式)
- [构建应用](#构建应用)
- [项目结构](#项目结构)
- [使用说明](#使用说明)
- [开发计划](#开发计划)
- [📚 文档](#-文档)
- [贡献指南](#贡献指南)
- [常见问题](#常见问题)
- [许可证](#许可证)

## 功能特性

- 📁 浏览本地文件夹中的视频文件
- 🎬 支持多种视频格式（MP4, AVI, MKV, MOV, WMV, FLV, WebM, M4V）
- 📊 显示视频文件详细信息（大小、修改日期、格式、分辨率）
- ✅ 多选视频文件
- 🎯 **分辨率过滤**：快速筛选不同分辨率的视频（<720p / 720p / 1080p / >1080p）
- 🔍 **重复检测**：基于哈希的完全重复文件检测，释放存储空间
- 🎯 **相似检测**：基于视频指纹的内容相似度分析，智能发现相似视频
- 🗑️ 批量删除重复和相似文件
- 🎨 现代化的用户界面

## 技术栈

- **Electron**: 桌面应用框架
- **React 18**: UI 框架
- **Vite**: 构建工具
- **TypeScript**: 类型安全
- **Node.js**: 后端运行时

## 安装依赖

```bash
npm install
```

### 系统依赖（仅开发环境）

开发时需要安装 ffmpeg：

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
```bash
choco install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

> **注意**: 打包后的应用会自动包含 ffmpeg,最终用户无需手动安装。详见 [部署指南](docs/DEPLOYMENT.md)。

## 开发模式

运行开发服务器和 Electron 应用：

```bash
npm run electron:dev
```

或者分别运行：

```bash
# 终端 1: 启动 Vite 开发服务器
npm run dev

# 终端 2: 编译 Electron 代码并启动应用
npm run build:electron && electron .
```

## 构建应用

构建生产版本：

```bash
npm run electron:build
```

生成的应用将位于 `release` 目录。

## 项目结构

```
GMediaSorter/
├── electron/          # Electron 主进程代码
│   ├── main.ts       # 主进程入口
│   └── preload.ts    # 预加载脚本
├── src/              # React 应用代码
│   ├── App.tsx       # 主应用组件
│   ├── App.css       # 应用样式
│   ├── main.tsx      # React 入口
│   └── index.css     # 全局样式
├── dist/             # Vite 构建输出
├── dist-electron/    # Electron 编译输出
├── index.html        # HTML 模板
├── package.json      # 项目配置
├── tsconfig.json     # TypeScript 配置（React）
├── tsconfig.electron.json  # TypeScript 配置（Electron）
└── vite.config.ts    # Vite 配置
```

## 使用说明

### 基本操作

1. 启动应用后，点击"选择文件夹"按钮
2. 选择包含视频文件的文件夹
3. 应用将自动扫描并显示所有支持的视频文件
4. 点击视频卡片可以选中/取消选中文件

### 分辨率过滤

- 使用顶部的分辨率过滤按钮，快速筛选特定分辨率的视频
- 支持横竖屏视频的智能识别

### 重复检测（找相同）

1. 扫描视频后，点击工具栏的"🔍 找相同"按钮
2. 应用将进行两阶段检测：快速预筛选 → 精确验证
3. 检测完成后显示重复文件组，包括：
   - 每组的重复文件列表
   - 总占用空间和浪费空间统计
   - 智能标记最早的文件为保留项
4. 选择要删除的重复文件，点击"删除选中"按钮批量删除

### 相似检测（找相似）

1. 扫描视频后，点击工具栏的"🎯 找相似"按钮
2. 应用将进行三级检测：元数据筛选 → 视频指纹提取 → 相似度计算
3. 检测完成后显示相似视频组，包括：
   - 相似文件组及平均相似度
   - 详细的相似度评分（综合/视觉/时长/分辨率/大小）
   - 两两配对的相似度详情
4. 根据需要手动处理相似视频

## 开发计划

- [x] 分辨率过滤功能（[设计文档](docs/video-resolution-filter-plan.md)）
- [x] 视频去重与相似检测功能（[设计文档](docs/duplicate-similarity-detection-plan.md)）
  - [x] 找相同：完全重复文件检测
  - [x] 找相似：内容相似度分析
  - [x] 批量删除操作
  - [x] 实时进度展示
- [ ] 视频预览功能
- [ ] 批量移动/复制文件
- [ ] 视频分类和标签
- [ ] 高级搜索和过滤
- [ ] 导出检测报告
- [ ] 结果缓存与增量检测

## 📚 文档

> 💡 **完整文档导航**: 查看 [docs/README.md](docs/README.md) 获取所有文档的详细导航和分类。

### 快速开始

- **[快速开始指南](docs/QUICKSTART.md)** - 从零开始运行应用
- **[安装指南](docs/INSTALL.md)** - 详细的安装步骤和环境配置
- **[用户指南](docs/USER_GUIDE.md)** - 完整的功能使用说明

### 开发文档

- **[项目概述](docs/PROJECT_SUMMARY.md)** - 项目架构和技术栈详解
- **[实现总结](docs/IMPLEMENTATION_SUMMARY.md)** - 功能实现细节和代码结构
- **[测试指南](docs/TESTING.md)** - 测试策略和测试用例

### 设计文档

- **[视频分辨率过滤设计](docs/video-resolution-filter-plan.md)** - 分辨率过滤功能的设计方案
- **[视频去重与相似检测设计](docs/duplicate-similarity-detection-plan.md)** - 重复和相似视频检测的完整设计

### 部署与运维

- **[部署指南](docs/DEPLOYMENT.md)** - 打包和发布应用的完整流程
- **[FFmpeg 打包方案](docs/FFMPEG-PACKAGING.md)** - FFmpeg 依赖的打包和跨平台处理

### 更新日志

- **[CHANGELOG](docs/CHANGELOG.md)** - 版本更新记录和功能变更历史

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 开发规范

- 遵循 TypeScript 类型安全
- 保持代码风格一致
- 编写清晰的提交信息
- 更新相关文档

## 常见问题

### Q: 为什么需要安装 ffmpeg？

A: ffmpeg 用于视频帧提取和视频指纹计算。开发环境需要安装系统级 ffmpeg,但打包后的应用会自动包含 ffmpeg,用户无需手动安装。详见 [FFmpeg 打包方案](docs/FFMPEG-PACKAGING.md)。

### Q: 如何验证 ffmpeg 配置是否正确？

A: 运行 `./verify-ffmpeg.sh` 脚本,它会检查所有 ffmpeg 相关配置。

### Q: 应用支持哪些视频格式？

A: 支持常见的视频格式:MP4, AVI, MKV, MOV, WMV, FLV, WebM, M4V 等。

### Q: 检测结果会保存吗？

A: 目前不会自动保存。未来计划添加结果缓存和导出功能。

## 许可证

MIT
