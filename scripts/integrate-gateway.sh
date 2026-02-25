#!/bin/bash
# =============================================
# 将酒店 Agent 集成到 OpenClaw Gateway
# 一键注册前台 Agent(小瑞) + 经理 Agent(小管)
# =============================================
set -e

echo "🏨 酒店 AI Agent — OpenClaw Gateway 集成"
echo "=========================================="
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPENCLAW_DIR="$HOME/.openclaw"
OPENCLAW_CONFIG="$OPENCLAW_DIR/openclaw.json"

# ---- 检查 OpenClaw ----
if ! command -v openclaw &>/dev/null; then
  echo "❌ OpenClaw 未安装。运行: npm install -g openclaw@latest"
  exit 1
fi
echo "✅ OpenClaw 已安装"

# ---- 检查 OpenClaw 目录 ----
if [[ ! -d "$OPENCLAW_DIR" ]]; then
  echo "⚠️  未发现 ~/.openclaw 目录，先运行 onboard..."
  openclaw onboard
fi

# ---- 方式一: 使用 openclaw agents add (推荐) ----
echo ""
echo "📋 方式一: 通过 CLI 注册 Agent (推荐)"
echo "--------------------------------------"
echo ""
echo "运行以下命令注册两个 Agent:"
echo ""
echo "  # 1. 添加前台 Agent"
echo "  openclaw agents add front-desk"
echo ""
echo "  # 2. 添加经理 Agent"
echo "  openclaw agents add manager"
echo ""
echo "  # 然后将 workspace 文件链接/复制到 Agent 目录:"
echo "  # 前台 Agent"
echo "  ln -sf $PROJECT_DIR/agents/front-desk/SOUL.md  $OPENCLAW_DIR/agents/front-desk/SOUL.md"
echo "  ln -sf $PROJECT_DIR/agents/front-desk/TOOLS.md $OPENCLAW_DIR/agents/front-desk/TOOLS.md"
echo "  ln -sf $PROJECT_DIR/agents/front-desk/skills    $OPENCLAW_DIR/agents/front-desk/skills"
echo "  ln -sf $PROJECT_DIR/agents/front-desk/knowledge $OPENCLAW_DIR/agents/front-desk/knowledge"
echo ""
echo "  # 经理 Agent"
echo "  ln -sf $PROJECT_DIR/agents/manager/SOUL.md $OPENCLAW_DIR/agents/manager/SOUL.md"
echo "  ln -sf $PROJECT_DIR/agents/manager/skills  $OPENCLAW_DIR/agents/manager/skills"
echo ""

# ---- 方式二: 直接指定 workspace 路径 ----
echo ""
echo "📋 方式二: 在 openclaw.json 中指定 workspace 路径"
echo "-------------------------------------------------"
echo ""
echo "将以下内容合并到 $OPENCLAW_CONFIG 中:"
echo ""
cat << 'HEREDOC'
{
  "agents": {
    "list": [
      {
        "id": "front-desk",
        "default": true,
HEREDOC
echo "        \"workspace\": \"$PROJECT_DIR/agents/front-desk\","
cat << 'HEREDOC'
        "groupChat": {
          "mentionPatterns": ["@小瑞", "小瑞", "前台"]
        }
      },
      {
        "id": "manager",
HEREDOC
echo "        \"workspace\": \"$PROJECT_DIR/agents/manager\","
cat << 'HEREDOC'
        "groupChat": {
          "mentionPatterns": ["@小管", "小管"]
        }
      }
    ]
  },
  "bindings": [
    { "agentId": "front-desk", "match": { "channel": "webchat" } },
    { "agentId": "manager",    "match": { "channel": "dingtalk" } }
  ]
}
HEREDOC

# ---- 询问是否执行自动配置 ----
echo ""
echo "=========================================="
echo ""
read -p "🔧 是否执行自动配置? (y/n): " AUTO_SETUP

if [[ "$AUTO_SETUP" == "y" || "$AUTO_SETUP" == "Y" ]]; then
  echo ""
  echo "🔧 执行自动配置..."

  # 使用 openclaw agents add 创建 agent
  echo "  [1/4] 注册 front-desk agent..."
  openclaw agents add front-desk 2>/dev/null || echo "  (可能已存在)"

  echo "  [2/4] 注册 manager agent..."
  openclaw agents add manager 2>/dev/null || echo "  (可能已存在)"

  # 创建符号链接
  FRONT_DESK_DIR="$OPENCLAW_DIR/agents/front-desk"
  MANAGER_DIR="$OPENCLAW_DIR/agents/manager"
  mkdir -p "$FRONT_DESK_DIR" "$MANAGER_DIR"

  echo "  [3/4] 链接前台 Agent workspace..."
  ln -sf "$PROJECT_DIR/agents/front-desk/SOUL.md"    "$FRONT_DESK_DIR/SOUL.md"
  ln -sf "$PROJECT_DIR/agents/front-desk/TOOLS.md"   "$FRONT_DESK_DIR/TOOLS.md"
  ln -sf "$PROJECT_DIR/agents/front-desk/skills"     "$FRONT_DESK_DIR/skills"
  ln -sf "$PROJECT_DIR/agents/front-desk/knowledge"  "$FRONT_DESK_DIR/knowledge"

  echo "  [4/4] 链接经理 Agent workspace..."
  ln -sf "$PROJECT_DIR/agents/manager/SOUL.md"   "$MANAGER_DIR/SOUL.md"
  ln -sf "$PROJECT_DIR/agents/manager/skills"    "$MANAGER_DIR/skills"

  # 配置 bindings (通过 openclaw config set)
  echo ""
  echo "  设置频道路由绑定..."
  openclaw config set bindings '[{"agentId":"front-desk","match":{"channel":"webchat"}},{"agentId":"manager","match":{"channel":"dingtalk"}}]' 2>/dev/null || echo "  (请手动编辑 openclaw.json)"

  echo ""
  echo "✅ 自动配置完成！"
  echo ""
  echo "  重启 Gateway 使配置生效:"
  echo "  openclaw gateway restart"
  echo ""
  echo "  验证 Agent 注册:"
  echo "  openclaw agents list --bindings"
  echo ""
  echo "  检查健康状态:"
  echo "  openclaw doctor"
else
  echo ""
  echo "请参照上面的步骤手动配置。"
fi

echo ""
echo "📖 更多信息: https://docs.openclaw.ai/concepts/multi-agent"
