# GMediaSorter - 安装和使用指南

## 安装问题解决方案

如果在安装依赖时遇到 Electron 下载失败的问题，可以尝试以下方法：

### 方法 1: 使用国内镜像

```bash
# 设置 Electron 镜像
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

# 或者永久设置（添加到 ~/.zshrc）
echo 'export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"' >> ~/.zshrc
source ~/.zshrc

# 然后重新安装
npm install
```

### 方法 2: 手动设置 npm 配置

```bash
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm install
```

### 方法 3: 使用 yarn 或 pnpm

```bash
# 使用 yarn
yarn config set electron_mirror https://npmmirror.com/mirrors/electron/
yarn install

# 或使用 pnpm
pnpm config set electron_mirror https://npmmirror.com/mirrors/electron/
pnpm install
```

### 方法 4: 使用代理

如果您有代理服务器：

```bash
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
npm install
```

## 项目结构

```
GMediaSorter/
├── electron/          # Electron 主进程代码
│   ├── main.ts       # 主进程入口（处理窗口、文件系统操作）
│   └── preload.ts    # 预加载脚本（暴露安全的 API）
├── src/              # React 应用代码
│   ├── App.tsx       # 主应用组件
│   ├── App.css       # 应用样式
│   ├── main.tsx      # React 入口
│   ├── index.css     # 全局样式
│   └── types.ts      # TypeScript 类型定义
├── index.html        # HTML 模板
├── package.json      # 项目配置
├── tsconfig.json     # TypeScript 配置（React）
├── tsconfig.electron.json  # TypeScript 配置（Electron）
├── tsconfig.node.json      # TypeScript 配置（Node）
└── vite.config.ts    # Vite 配置
```

## 成功安装后的使用方法

### 开发模式

启动开发服务器和 Electron 应用：

```bash
npm run electron:dev
```

这个命令会：
1. 启动 Vite 开发服务器（端口 5173）
2. 编译 Electron 代码
3. 启动 Electron 应用
4. 支持热重载

### 手动启动（如果上面的命令有问题）

在两个终端中分别运行：

```bash
# 终端 1: 启动 Vite 开发服务器
npm run dev
```

```bash
# 终端 2: 编译并启动 Electron
npm run build:electron && npx electron .
```

### 构建生产版本

```bash
npm run electron:build
```

生成的应用将位于 `release` 目录。

## 功能说明

### 当前功能
- ✅ 选择本地文件夹
- ✅ 自动扫描视频文件
- ✅ 显示视频信息（文件名、大小、修改日期、格式）
- ✅ 多选视频文件
- ✅ 美观的现代界面

### 支持的视频格式
- MP4
- AVI
- MKV
- MOV
- WMV
- FLV
- WebM
- M4V

### 计划功能
- [ ] 视频预览
- [ ] 批量移动/复制文件
- [ ] 视频分类和标签
- [ ] 搜索和过滤
- [ ] 视频元数据读取
- [ ] 自定义主题
- [ ] 视频播放
- [ ] 缩略图生成

## 技术栈详解

### 前端（渲染进程）
- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Vite**: 快速的构建工具和开发服务器
- **CSS**: 原生 CSS 样式

### 后端（主进程）
- **Electron**: 跨平台桌面应用框架
- **Node.js**: 文件系统操作
- **TypeScript**: 类型安全

### 构建工具
- **Vite**: 前端构建
- **electron-builder**: 应用打包
- **TypeScript Compiler**: TypeScript 编译

## 调试技巧

### 开启开发者工具

在开发模式下，应用会自动打开开发者工具。也可以手动打开：
- macOS: `Cmd + Option + I`
- Windows/Linux: `Ctrl + Shift + I`

### 查看日志

主进程日志会显示在启动 Electron 的终端中。
渲染进程日志在开发者工具的 Console 面板中。

## 常见问题

### Q: 安装失败怎么办？
A: 参考上面的"安装问题解决方案"。

### Q: 应用启动后白屏？
A: 确保 Vite 开发服务器已启动（端口 5173）。

### Q: 修改代码后没有更新？
A: Vite 支持热重载，但 Electron 主进程代码修改后需要重启应用。

### Q: 如何打包为安装程序？
A: 运行 `npm run electron:build`，生成的文件在 `release` 目录。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
