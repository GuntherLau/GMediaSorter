# 部署指南

## FFmpeg 依赖处理

### 开发环境

在开发环境中,需要安装系统级的 ffmpeg:

**macOS (使用 Homebrew):**
```bash
brew install ffmpeg
```

**Windows (使用 Chocolatey):**
```bash
choco install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install ffmpeg
```

### 生产环境 (打包应用)

应用已配置为自动包含 ffmpeg 二进制文件,无需用户手动安装。

#### 技术实现

1. **依赖包**: 使用 `@ffmpeg-installer/ffmpeg` 自动提供平台特定的 ffmpeg 二进制文件
2. **打包配置**: 在 `package.json` 中配置 `asarUnpack` 确保二进制文件不被压缩
3. **路径处理**: 在生产环境中自动处理 `app.asar.unpacked` 路径

#### electron-builder 配置

```json
{
  "build": {
    "asarUnpack": [
      "node_modules/@ffmpeg-installer/**/*",
      "node_modules/ffprobe-static/**/*"
    ]
  }
}
```

#### 代码实现

在 `electron/utils/video-fingerprint.ts` 中:

```typescript
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// 设置 ffmpeg 路径
let ffmpegPath = ffmpegInstaller.path;
if (process.env.NODE_ENV === 'production') {
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}
ffmpeg.setFfmpegPath(ffmpegPath);
```

### 验证打包

打包后验证 ffmpeg 是否正确包含:

1. 构建应用: `npm run electron:build`
2. 检查输出目录 `release/` 
3. 安装并运行应用
4. 测试视频去重和相似度检测功能

### 不同平台的二进制文件

`@ffmpeg-installer/ffmpeg` 会根据运行平台自动选择:
- **macOS**: darwin-x64, darwin-arm64
- **Windows**: win32-x64
- **Linux**: linux-x64, linux-arm64, linux-arm

### 文件大小

包含 ffmpeg 后,应用包大小会增加约 50-80 MB,具体取决于平台。

### 故障排查

**问题**: 打包后应用提示找不到 ffmpeg

**解决方案**:
1. 确认 `package.json` 中的 `asarUnpack` 配置正确
2. 检查 `video-fingerprint.ts` 中的路径替换逻辑
3. 查看应用安装目录中是否存在 `app.asar.unpacked/node_modules/@ffmpeg-installer/`

**问题**: 开发环境提示找不到 ffmpeg

**解决方案**:
- 开发环境需要安装系统级 ffmpeg (见上方开发环境部分)
- 或者确保 `@ffmpeg-installer/ffmpeg` 已正确安装: `npm install`

## 构建脚本

### 开发模式
```bash
npm run electron:dev
```

### 生产构建
```bash
npm run electron:build
```

### 仅构建前端
```bash
npm run build
```

## 发布清单

打包发布前检查:

- [ ] 所有依赖已安装 (`npm install`)
- [ ] TypeScript 编译无错误 (`tsc --noEmit`)
- [ ] 前端构建成功 (`npm run build`)
- [ ] Electron 构建成功 (`npm run build:electron`)
- [ ] 最终打包成功 (`electron-builder`)
- [ ] 在目标平台测试安装包
- [ ] 测试视频去重功能
- [ ] 测试视频相似度检测功能
- [ ] 检查应用大小合理性

## 平台特定注意事项

### macOS
- 需要代码签名才能分发 (可选,用于 Gatekeeper)
- DMG 文件适合分发,ZIP 适合更新

### Windows
- NSIS 安装程序会创建桌面快捷方式
- 建议启用代码签名避免 SmartScreen 警告

### Linux
- AppImage 无需安装,直接运行
- 首次运行需要添加执行权限: `chmod +x GMediaSorter-*.AppImage`

## 更新机制

目前应用不包含自动更新功能。建议未来集成:
- [electron-updater](https://www.electron.build/auto-update)
- 配置更新服务器
- 实现版本检查和下载逻辑
