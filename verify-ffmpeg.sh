#!/bin/bash

# 验证 FFmpeg 配置脚本

echo "🔍 检查 FFmpeg 配置..."
echo ""

# 检查系统 ffmpeg
echo "1. 系统 FFmpeg:"
if command -v ffmpeg &> /dev/null; then
    echo "   ✅ 已安装: $(which ffmpeg)"
    ffmpeg -version | head -n 1
else
    echo "   ⚠️  未安装系统级 ffmpeg"
    echo "   开发环境需要安装: brew install ffmpeg (macOS)"
fi
echo ""

# 检查 @ffmpeg-installer
echo "2. @ffmpeg-installer 包:"
if [ -d "node_modules/@ffmpeg-installer" ]; then
    echo "   ✅ 已安装"
    node -e "const ffmpeg = require('@ffmpeg-installer/ffmpeg'); console.log('   路径:', ffmpeg.path);"
    
    # 检查二进制文件是否存在
    FFMPEG_PATH=$(node -e "console.log(require('@ffmpeg-installer/ffmpeg').path);")
    if [ -f "$FFMPEG_PATH" ]; then
        echo "   ✅ 二进制文件存在"
        "$FFMPEG_PATH" -version | head -n 1
    else
        echo "   ❌ 二进制文件不存在: $FFMPEG_PATH"
    fi
else
    echo "   ❌ 未安装，运行: npm install @ffmpeg-installer/ffmpeg"
fi
echo ""

# 检查 ffprobe-static
echo "3. ffprobe-static 包:"
if [ -d "node_modules/ffprobe-static" ]; then
    echo "   ✅ 已安装"
    node -e "const ffprobe = require('ffprobe-static'); console.log('   路径:', ffprobe.path);"
else
    echo "   ❌ 未安装"
fi
echo ""

# 检查 package.json 配置
echo "4. electron-builder 配置:"
if grep -q "asarUnpack" package.json; then
    echo "   ✅ asarUnpack 已配置"
    grep -A 3 '"asarUnpack"' package.json
else
    echo "   ❌ 缺少 asarUnpack 配置"
fi
echo ""

echo "📋 总结:"
echo ""

# 检查所有条件
all_ok=true

if ! command -v ffmpeg &> /dev/null; then
    echo "   ⚠️  开发环境: 需要安装系统 ffmpeg"
    all_ok=false
fi

if [ ! -d "node_modules/@ffmpeg-installer" ]; then
    echo "   ❌ 缺少 @ffmpeg-installer 包"
    all_ok=false
fi

if ! grep -q "asarUnpack" package.json; then
    echo "   ❌ 缺少 electron-builder 配置"
    all_ok=false
fi

if [ "$all_ok" = true ]; then
    echo "   ✅ 所有配置正确!"
    echo "   可以运行: npm run electron:dev"
    echo ""
    echo "   打包应用: npm run electron:build"
    echo "   打包后的应用将自动包含 ffmpeg,用户无需手动安装。"
else
    echo "   ⚠️  存在配置问题,请修复后重试"
fi

echo ""
