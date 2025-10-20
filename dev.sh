#!/bin/bash

# GMediaSorter 开发环境启动脚本

echo "🎬 启动 GMediaSorter 开发环境..."
echo ""

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
  echo "❌ 未找到 node_modules，请先运行 npm install"
  exit 1
fi

# 启动 Vite 开发服务器（后台）
echo "📦 启动 Vite 开发服务器..."
npm run dev &
VITE_PID=$!

# 等待 Vite 启动
echo "⏳ 等待 Vite 启动 (5秒)..."
sleep 5

# 编译 Electron 代码
echo "🔨 编译 Electron 代码..."
npm run build:electron

if [ $? -eq 0 ]; then
  # 启动 Electron
  echo "🚀 启动 Electron 应用..."
  npx electron .
  
  # Electron 退出后清理 Vite 进程
  echo ""
  echo "🧹 清理进程..."
  kill $VITE_PID
else
  echo "❌ Electron 编译失败"
  kill $VITE_PID
  exit 1
fi

echo "✅ 应用已关闭"
