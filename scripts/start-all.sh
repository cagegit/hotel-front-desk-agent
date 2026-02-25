#!/bin/bash
# =============================================
# 一键启动双 Agent
# 前台 Agent (:3000) + 经理 Agent (:3001)
# =============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🏨 酒店 AI Agent 系统 — 启动"
echo "=============================="
echo ""

# 加载环境变量
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
  echo "✅ 已加载 .env 配置"
else
  echo "⚠️ .env 文件不存在，使用默认配置"
  echo "   运行 cp .env.example .env 并编辑"
fi
echo ""

# 检查 OpenClaw
if ! command -v openclaw &>/dev/null; then
  echo "❌ OpenClaw 未安装。运行: npm install -g openclaw@latest"
  exit 1
fi

# 清理旧进程
echo "🧹 清理旧进程..."
pkill -f "openclaw.*--port 3000" 2>/dev/null || true
pkill -f "openclaw.*--port 3001" 2>/dev/null || true
sleep 1

# 启动前台 Agent
echo "🏨 启动前台 Agent (小瑞) → :3000"
cd "$PROJECT_DIR/agents/front-desk"
openclaw --workspace . --port 3000 &
FRONT_PID=$!
echo "   PID: $FRONT_PID"

sleep 2

# 启动经理 Agent
echo "👔 启动经理 Agent (小管) → :3001"
cd "$PROJECT_DIR/agents/manager"
openclaw --workspace . --port 3001 &
MANAGER_PID=$!
echo "   PID: $MANAGER_PID"

sleep 2

echo ""
echo "=============================="
echo "✅ 双 Agent 已启动"
echo ""
echo "  🏨 前台 Agent (小瑞): http://localhost:3000"
echo "  👔 经理 Agent (小管): http://localhost:3001"
echo ""
echo "  前台 PID: $FRONT_PID"
echo "  经理 PID: $MANAGER_PID"
echo ""
echo "📋 日志:"
echo "  前台: tail -f ~/.openclaw/logs/front-desk.log"
echo "  经理: tail -f ~/.openclaw/logs/manager.log"
echo ""
echo "🛑 停止: kill $FRONT_PID $MANAGER_PID"
echo "   或: pkill -f openclaw"
echo ""

# 等待子进程
wait
