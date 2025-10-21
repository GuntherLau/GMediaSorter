# FFmpeg 打包方案总结

## 问题

开发阶段需要安装 ffmpeg 才能正常使用视频去重和相似度检测功能,但如何确保打包后的应用能让普通用户正常使用?

## 解决方案

采用 `@ffmpeg-installer/ffmpeg` 包自动处理跨平台的 ffmpeg 二进制文件打包。

## 实施步骤

### 1. 安装依赖

```bash
npm install @ffmpeg-installer/ffmpeg
```

### 2. 修改代码

在 `electron/utils/video-fingerprint.ts` 中配置 ffmpeg 路径:

```typescript
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// 设置 ffmpeg 路径
let ffmpegPath = ffmpegInstaller.path;
if (process.env.NODE_ENV === 'production') {
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}
ffmpeg.setFfmpegPath(ffmpegPath);
```

### 3. 配置 electron-builder

在 `package.json` 中添加 `asarUnpack` 配置:

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

## 工作原理

### 开发环境

1. 开发者安装系统级 ffmpeg (`brew install ffmpeg`)
2. 代码可以使用系统 ffmpeg 或包内的 ffmpeg
3. 两者都能正常工作

### 生产环境 (打包后)

1. `@ffmpeg-installer/ffmpeg` 提供平台特定的 ffmpeg 二进制文件
2. `asarUnpack` 确保二进制文件不被压缩到 asar 包中
3. 代码自动处理 `app.asar.unpacked` 路径
4. 最终用户无需安装任何额外软件

## 跨平台支持

`@ffmpeg-installer/ffmpeg` 自动为不同平台提供正确的二进制文件:

| 平台 | 架构 | 二进制文件路径 |
|------|------|---------------|
| macOS | x64 | `@ffmpeg-installer/darwin-x64/ffmpeg` |
| macOS | arm64 | `@ffmpeg-installer/darwin-arm64/ffmpeg` |
| Windows | x64 | `@ffmpeg-installer/win32-x64/ffmpeg.exe` |
| Linux | x64 | `@ffmpeg-installer/linux-x64/ffmpeg` |
| Linux | arm64 | `@ffmpeg-installer/linux-arm64/ffmpeg` |

## 文件大小影响

包含 ffmpeg 后,应用大小变化:

- **未压缩**: +50-80 MB
- **压缩后 (DMG/NSIS)**: +25-40 MB
- **实际影响**: 可接受,换取了用户便利性

## 验证配置

运行验证脚本:

```bash
./verify-ffmpeg.sh
```

输出应显示:
- ✅ 系统 FFmpeg 已安装
- ✅ @ffmpeg-installer 包已安装
- ✅ 二进制文件存在
- ✅ electron-builder 配置正确

## 测试打包

### 本地测试

```bash
npm run electron:build
```

### 验证打包结果

1. 检查 `release/` 目录
2. 安装生成的应用
3. 运行应用并测试视频检测功能
4. 确认无需手动安装 ffmpeg

## 其他方案对比

### 方案 A: @ffmpeg-installer/ffmpeg (已采用)

**优点:**
- 自动处理跨平台
- 维护活跃,版本更新
- 包大小适中

**缺点:**
- 需要配置 asarUnpack
- ffmpeg 版本可能不是最新

### 方案 B: ffmpeg-static

**优点:**
- 静态编译,单一二进制文件
- 使用简单

**缺点:**
- 包更大 (~100MB)
- 更新较慢
- 跨平台支持有限

### 方案 C: 手动打包

**优点:**
- 完全控制 ffmpeg 版本
- 可以优化编译选项

**缺点:**
- 需要手动维护多平台二进制文件
- 增加维护负担
- 容易出错

## 故障排查

### 问题 1: 打包后找不到 ffmpeg

**原因**: asarUnpack 配置缺失或路径处理错误

**解决**:
1. 检查 `package.json` 中的 `asarUnpack` 配置
2. 验证生产环境路径替换逻辑
3. 查看应用安装目录中的 `app.asar.unpacked` 文件夹

### 问题 2: 开发环境找不到 ffmpeg

**原因**: 系统未安装 ffmpeg

**解决**:
```bash
# macOS
brew install ffmpeg

# Windows
choco install ffmpeg

# Linux
sudo apt-get install ffmpeg
```

### 问题 3: 权限问题 (Linux/macOS)

**原因**: ffmpeg 二进制文件没有执行权限

**解决**: electron-builder 通常会自动处理,如果仍有问题:
```bash
chmod +x path/to/ffmpeg
```

## 最佳实践

1. **开发环境**: 安装系统 ffmpeg,便于调试
2. **CI/CD**: 在构建服务器上也安装 ffmpeg
3. **测试**: 在多个平台上测试打包后的应用
4. **版本锁定**: 使用 package-lock.json 锁定依赖版本
5. **文档**: 保持 README 和 DEPLOYMENT 文档更新

## 相关文档

- [部署指南](DEPLOYMENT.md)
- [快速开始](QUICKSTART.md)
- [视频去重与相似检测设计](duplicate-similarity-detection-plan.md)

## 参考资源

- [@ffmpeg-installer/ffmpeg](https://www.npmjs.com/package/@ffmpeg-installer/ffmpeg)
- [electron-builder 文档](https://www.electron.build/)
- [Electron asar 打包](https://www.electronjs.org/docs/latest/tutorial/asar-archives)
- [fluent-ffmpeg 文档](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
