# GMediaSorter - 快速开始 🚀

恭喜！您的 GMediaSorter 视频管理应用已经创建完成。

## ✅ 已完成的设置

- ✅ 项目结构已创建
- ✅ 所有依赖已安装
- ✅ TypeScript 配置完成
- ✅ Electron + React + Vite 集成完成
- ✅ 基础 UI 和功能实现完成

## 🚀 开始使用

### 方式 1: 使用 concurrently（推荐）

```bash
npm run electron:dev
```

这将同时启动 Vite 开发服务器和 Electron 应用。

### 方式 2: 使用启动脚本

```bash
./dev.sh
```

### 方式 3: 手动启动

在两个终端中分别运行：

**终端 1 - 启动 Vite:**
```bash
npm run dev
```

**终端 2 - 启动 Electron:**
```bash
npm run build:electron && npx electron .
```

## 📦 构建应用

生成可分发的应用程序：

```bash
npm run electron:build
```

生成的文件将在 `release` 目录中。

## 🎯 主要功能

### 已实现功能
- 📁 选择本地文件夹
- 🎬 自动扫描视频文件（支持 MP4, AVI, MKV, MOV, WMV, FLV, WebM, M4V）
- 📊 显示视频详细信息（文件名、大小、修改时间、格式）
- ✅ 多选视频文件
- 🎨 现代化的渐变界面

### API 功能（已集成但未在 UI 中使用）
- 📋 复制文件
- 🔀 移动文件

## 📂 项目结构

```
GMediaSorter/
├── electron/                 # Electron 主进程
│   ├── main.ts              # 主进程（窗口管理、IPC 通信）
│   └── preload.ts           # 预加载脚本（安全桥接）
├── src/                     # React 应用
│   ├── App.tsx              # 主应用组件
│   ├── App.css              # 应用样式
│   ├── main.tsx             # React 入口
│   ├── index.css            # 全局样式
│   └── types.ts             # TypeScript 类型
├── dist/                    # Vite 构建输出（自动生成）
├── dist-electron/           # Electron 编译输出（自动生成）
├── release/                 # 打包应用输出（自动生成）
├── node_modules/            # 依赖包
├── index.html               # HTML 模板
├── package.json             # 项目配置
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TS 配置（React）
├── tsconfig.electron.json   # TS 配置（Electron）
├── tsconfig.node.json       # TS 配置（Node）
├── .npmrc                   # npm 配置（Electron 镜像）
├── .gitignore               # Git 忽略文件
├── README.md                # 项目说明
├── INSTALL.md               # 安装指南
├── QUICKSTART.md            # 本文件
└── dev.sh                   # 开发启动脚本
```

## 🔧 开发提示

### 热重载
- React 代码修改会自动热重载
- Electron 主进程代码修改需要重启应用

### 调试
- 开发模式下自动打开 DevTools
- 主进程日志在终端显示
- 渲染进程日志在 DevTools Console 中

### 常用命令

```bash
# 开发
npm run dev                  # 只启动 Vite
npm run build:electron       # 只编译 Electron
npm run electron:dev         # 完整开发环境

# 构建
npm run build                # 构建 React
npm run electron:build       # 构建并打包应用

# 预览
npm run preview              # 预览构建后的 React 应用
```

## 🎨 自定义开发

### 修改主题颜色

编辑 `src/App.css`，修改渐变色：

```css
.app-header {
  background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%);
}
```

### 添加新功能

1. 在 `electron/main.ts` 中添加 IPC handler
2. 在 `electron/preload.ts` 中暴露 API
3. 在 `src/types.ts` 中定义类型
4. 在 `src/App.tsx` 中使用 API

### 支持更多文件格式

编辑 `electron/main.ts`，修改 `videoExtensions` 数组：

```typescript
const videoExtensions = ['.mp4', '.avi', /* 添加更多格式 */];
```

## 📚 技术栈

- **Electron 28**: 桌面应用框架
- **React 18**: UI 框架
- **Vite 5**: 构建工具
- **TypeScript 5**: 类型系统
- **Node.js**: 运行时环境

## 🐛 问题排查

### 应用启动白屏
- 检查 Vite 是否在 5173 端口运行
- 查看终端错误日志
- 检查浏览器控制台

### 编译错误
- 运行 `npm install` 重新安装依赖
- 检查 TypeScript 版本
- 清除缓存: `rm -rf node_modules dist dist-electron && npm install`

### Electron 下载失败
- 已配置国内镜像（.npmrc）
- 如仍失败，查看 INSTALL.md 中的其他方法

## 🚀 下一步

1. **启动应用**: `npm run electron:dev`
2. **选择文件夹**: 点击"选择文件夹"按钮
3. **查看视频**: 浏览扫描到的视频文件
4. **开始开发**: 根据需求添加新功能

## 📝 待开发功能建议

- [ ] 视频预览和播放
- [ ] 缩略图生成
- [ ] 批量操作（移动、复制、删除）
- [ ] 视频分类和标签系统
- [ ] 搜索和过滤功能
- [ ] 视频元数据读取
- [ ] 播放列表功能
- [ ] 导出视频列表
- [ ] 设置页面（主题、快捷键等）
- [ ] 多语言支持

## 🤝 需要帮助？

- 查看 README.md 了解项目概况
- 查看 INSTALL.md 了解安装问题解决
- 在 GitHub 上提交 Issue

---

**祝您开发愉快！** 🎉
