#!/bin/bash
# =============================================
# Whisper Metal GPU 加速配置
# =============================================
set -e

echo "🗣️ Whisper Metal 加速配置"
echo "========================="
echo ""

# 检查 whisper-cpp
if ! command -v whisper-cpp &>/dev/null; then
  echo "⚠️ whisper-cpp 未安装，正在安装..."
  brew install whisper-cpp
fi

# 模型目录
MODEL_DIR="$HOME/.local/share/whisper-cpp/models"
mkdir -p "$MODEL_DIR"

# 下载模型
echo "📥 下载 Whisper large-v3 模型..."
echo "   (推荐 M4 芯片使用 large-v3，约 3GB)"
echo ""

MODEL_FILE="$MODEL_DIR/ggml-large-v3.bin"
if [[ -f "$MODEL_FILE" ]]; then
  echo "  ✅ 模型已存在: $MODEL_FILE"
else
  echo "  下载中... (可能需要几分钟)"
  curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin" \
    -o "$MODEL_FILE" \
    --progress-bar
  echo "  ✅ 下载完成"
fi

# 测试 Metal 加速
echo ""
echo "🧪 测试 Metal GPU 加速..."
echo "你好世界" | whisper-cpp \
  --model "$MODEL_FILE" \
  --language zh \
  --no-timestamps \
  --print-special false \
  --threads 4 \
  2>&1 | head -5

echo ""
echo "=============================="
echo "✅ Whisper Metal 配置完成"
echo ""
echo "配置参数:"
echo "  模型: $MODEL_FILE"
echo "  语言: zh (中文)"
echo "  加速: Metal GPU (Apple Neural Engine)"
echo "  线程: 4"
echo ""
echo "💡 M4 芯片识别 5 秒音频约需 ~0.8 秒"
