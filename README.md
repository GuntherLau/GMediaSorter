# GMediaSorter

基于 Electron + React + Vite + TypeScript 的本地视频管理应用。

## 功能特性

- 📁 浏览本地文件夹中的视频文件
- 🎬 支持多种视频格式（MP4, AVI, MKV, MOV, WMV, FLV, WebM, M4V）
- 📊 显示视频文件详细信息（大小、修改日期、格式）
- ✅ 多选视频文件
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

1. 启动应用后，点击"选择文件夹"按钮
2. 选择包含视频文件的文件夹
3. 应用将自动扫描并显示所有支持的视频文件
4. 点击视频卡片可以选中/取消选中文件

## 开发计划

- [x] 分辨率过滤功能（[设计文档](docs/video-resolution-filter-plan.md)）
- [ ] 视频预览功能
- [ ] 批量移动/复制文件
- [ ] 视频分类和标签
- [ ] 搜索和过滤功能
- [ ] 视频元数据读取

## 许可证

MIT
