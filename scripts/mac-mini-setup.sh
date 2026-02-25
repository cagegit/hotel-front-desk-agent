#!/bin/bash
# =============================================
# Mac mini 环境一键初始化
# =============================================
set -e

echo "🏨 酒店 AI Agent 系统 — 环境初始化"
echo "======================================"
echo ""

# 检查 macOS
if [[ "$(uname)" != "Darwin" ]]; then
  echo "❌ 此脚本仅支持 macOS"
  exit 1
fi

echo "📋 系统信息:"
echo "  macOS $(sw_vers -productVersion)"
echo "  芯片: $(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo 'Apple Silicon')"
echo ""

# ---- Homebrew ----
echo "📦 检查 Homebrew..."
if ! command -v brew &>/dev/null; then
  echo "  安装 Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "  ✅ Homebrew $(brew --version | head -1 | awk '{print $2}')"
fi

# ---- Node.js ----
echo ""
echo "📦 检查 Node.js..."
if ! command -v node &>/dev/null || [[ $(node -v | sed 's/v//' | cut -d. -f1) -lt 22 ]]; then
  echo "  安装 Node.js 22..."
  brew install node@22
  echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
else
  echo "  ✅ Node.js $(node -v)"
fi

# ---- 核心依赖 ----
echo ""
echo "📦 安装核心依赖..."
brew install ffmpeg portaudio sox jq 2>/dev/null || true

# ---- Whisper ----
echo ""
echo "📦 检查 whisper-cpp..."
if ! command -v whisper-cpp &>/dev/null; then
  echo "  安装 whisper-cpp (Metal 加速)..."
  brew install whisper-cpp
else
  echo "  ✅ whisper-cpp 已安装"
fi

# ---- Python 工具 ----
echo ""
echo "📦 安装 Python 工具..."
pip3 install --quiet edge-tts 2>/dev/null || true

# ---- OpenClaw ----
echo ""
echo "📦 检查 OpenClaw..."
if ! command -v openclaw &>/dev/null; then
  echo "  安装 OpenClaw..."
  npm install -g openclaw@latest
else
  echo "  ✅ OpenClaw $(openclaw --version 2>/dev/null || echo 'installed')"
fi

# ---- 项目依赖 ----
echo ""
echo "📦 安装项目依赖..."
cd "$(dirname "$0")/.."
npm install

# ---- 环境变量 ----
if [[ ! -f .env ]]; then
  echo ""
  echo "📋 创建 .env 配置文件..."
  cp .env.example .env
  echo "  ⚠️ 请编辑 .env 文件填入实际的 API Key 和配置"
fi

# ---- macOS 权限提示 ----
echo ""
echo "======================================"
echo "✅ 环境初始化完成！"
echo ""
echo "⚠️ 请手动完成以下设置："
echo ""
echo "  1. 系统设置 → 隐私与安全性 → 摄像头 → 允许 Terminal"
echo "  2. 系统设置 → 隐私与安全性 → 麦克风 → 允许 Terminal"
echo "  3. 编辑 .env 文件填入 API Key"
echo "  4. 运行 ./scripts/check-hardware-mac.sh 检测硬件"
echo ""
echo "🚀 启动: ./scripts/start-all.sh"
