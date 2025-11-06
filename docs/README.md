# 文档导航

本文档提供 GMediaSorter 项目所有文档的概览和导航。

> 📊 **文档关系图**: 查看 [DOCS_STRUCTURE.md](DOCS_STRUCTURE.md) 了解文档之间的依赖关系和推荐阅读路径。

## 📖 文档结构

```
docs/
├── 🚀 入门指南
│   ├── QUICKSTART.md          快速开始 - 5分钟上手指南
│   ├── INSTALL.md             安装指南 - 详细的环境配置
│   └── USER_GUIDE.md          用户指南 - 完整功能使用说明
│
├── 👨‍💻 开发文档
│   ├── PROJECT_SUMMARY.md     项目概述 - 架构和技术栈
│   ├── IMPLEMENTATION_SUMMARY.md  实现总结 - 代码结构详解
│   └── TESTING.md             测试指南 - 测试策略和用例
│
├── 📐 设计文档
│   ├── video-resolution-filter-plan.md       分辨率过滤设计
│   ├── duplicate-similarity-detection-plan.md 去重与相似检测设计
│   └── container-format-conversion-plan.md   容器格式转换方案
│
├── 🚢 部署文档
│   ├── DEPLOYMENT.md          部署指南 - 打包和发布流程
│   └── FFMPEG-PACKAGING.md    FFmpeg打包 - 跨平台依赖处理
│
└── 📝 其他
    └── CHANGELOG.md           更新日志 - 版本历史
```

## 📚 按角色分类

### 新用户

如果您是第一次使用 GMediaSorter:

1. 📖 [快速开始指南](QUICKSTART.md) - 了解如何快速运行应用
2. 📖 [用户指南](USER_GUIDE.md) - 学习所有功能的使用方法
3. 📖 [常见问题](../README.md#常见问题) - 查看 FAQ

### 开发者

如果您想参与开发或了解实现细节:

1. 📖 [项目概述](PROJECT_SUMMARY.md) - 理解项目架构
2. 📖 [安装指南](INSTALL.md) - 配置开发环境
3. 📖 [实现总结](IMPLEMENTATION_SUMMARY.md) - 了解代码结构
4. 📖 [测试指南](TESTING.md) - 学习测试方法
5. 📖 [设计文档](#设计文档) - 查看功能设计

### 维护者

如果您需要部署或发布应用:

1. 📖 [部署指南](DEPLOYMENT.md) - 打包和发布流程
2. 📖 [FFmpeg 打包方案](FFMPEG-PACKAGING.md) - 处理 FFmpeg 依赖
3. 📖 [更新日志](CHANGELOG.md) - 记录版本变更

## 📋 按主题分类

### 功能实现

- [视频分辨率过滤](video-resolution-filter-plan.md) - 分辨率筛选功能的设计和实现
- [视频时长过滤与多条件过滤器](video-duration-filter-plan.md) - 时长过滤及可扩展的多维度过滤器架构
- [视频去重与相似检测](duplicate-similarity-detection-plan.md) - 重复和相似视频检测的完整方案
- [容器格式转换](container-format-conversion-plan.md) - 批量容器封装转换的设计与任务拆解

### 技术栈

- [项目概述](PROJECT_SUMMARY.md) - 技术选型和架构说明
- [实现总结](IMPLEMENTATION_SUMMARY.md) - 各技术的具体使用

### 环境配置

- [安装指南](INSTALL.md) - 开发环境配置
- [FFmpeg 打包方案](FFMPEG-PACKAGING.md) - FFmpeg 依赖处理

### 测试与质量

- [测试指南](TESTING.md) - 测试策略、工具和用例

### 部署发布

- [部署指南](DEPLOYMENT.md) - 构建、打包和发布流程
- [FFmpeg 打包方案](FFMPEG-PACKAGING.md) - 跨平台二进制文件处理

## 🔍 快速查找

### 我想...

| 需求 | 推荐文档 |
|------|---------|
| 快速运行应用 | [快速开始](QUICKSTART.md) |
| 详细安装步骤 | [安装指南](INSTALL.md) |
| 学习如何使用 | [用户指南](USER_GUIDE.md) |
| 了解项目架构 | [项目概述](PROJECT_SUMMARY.md) |
| 查看代码结构 | [实现总结](IMPLEMENTATION_SUMMARY.md) |
| 了解功能设计 | [设计文档](#设计文档) |
| 运行测试 | [测试指南](TESTING.md) |
| 打包应用 | [部署指南](DEPLOYMENT.md) |
| 处理 FFmpeg | [FFmpeg打包](FFMPEG-PACKAGING.md) |
| 查看历史变更 | [更新日志](CHANGELOG.md) |

### 常见问题

| 问题 | 相关文档 |
|------|---------|
| 如何安装 ffmpeg? | [安装指南](INSTALL.md), [FFmpeg打包](FFMPEG-PACKAGING.md) |
| 如何开始开发? | [快速开始](QUICKSTART.md), [安装指南](INSTALL.md) |
| 如何使用去重功能? | [用户指南](USER_GUIDE.md), [去重设计](duplicate-similarity-detection-plan.md) |
| 如何打包应用? | [部署指南](DEPLOYMENT.md) |
| 如何运行测试? | [测试指南](TESTING.md) |
| 支持哪些视频格式? | [用户指南](USER_GUIDE.md) |

## 📊 文档状态

| 文档 | 状态 | 最后更新 |
|------|------|---------|
| QUICKSTART.md | ✅ 完成 | 2025-10-21 |
| INSTALL.md | ✅ 完成 | 2025-10-21 |
| USER_GUIDE.md | ✅ 完成 | 2025-11-06 |
| PROJECT_SUMMARY.md | ✅ 完成 | 2025-10-21 |
| IMPLEMENTATION_SUMMARY.md | ✅ 完成 | 2025-10-21 |
| TESTING.md | ✅ 完成 | 2025-11-06 |
| DEPLOYMENT.md | ✅ 完成 | 2025-10-21 |
| FFMPEG-PACKAGING.md | ✅ 完成 | 2025-10-21 |
| video-resolution-filter-plan.md | ✅ 完成 | 2025-10-21 |
| duplicate-similarity-detection-plan.md | ✅ 完成 | 2025-10-21 |
| container-format-conversion-plan.md | ✅ 完成 | 2025-11-06 |
| CHANGELOG.md | ✅ 完成 | 2025-11-06 |

## 🤝 贡献文档

如果您发现文档有误或需要改进:

1. 创建 Issue 报告问题
2. 或者直接提交 Pull Request 修改文档
3. 遵循 [Markdown 风格指南](https://www.markdownguide.org/basic-syntax/)

## 📞 获取帮助

- 💬 查看 [常见问题](../README.md#常见问题)
- 🐛 报告问题: [GitHub Issues](https://github.com/GuntherLau/GMediaSorter/issues)
- 📧 联系维护者: 通过 Issue 或 Pull Request

## 🔗 相关链接

- [项目主页](../README.md)
- [贡献指南](../README.md#贡献指南)
- [许可证](../README.md#许可证)

---

📝 **提示**: 建议按照推荐的阅读顺序逐步了解项目,从"快速开始"到"深入开发"。
