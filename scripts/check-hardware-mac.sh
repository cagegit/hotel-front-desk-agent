#!/bin/bash
# =============================================
# 硬件检测脚本 — 检测摄像头、麦克风、扬声器
# =============================================

echo "🔍 酒店 AI Agent — 硬件检测"
echo "======================================"
echo ""

PASS=0
FAIL=0

# ---- 摄像头 ----
echo "📷 摄像头检测..."
CAMERAS=$(system_profiler SPCameraDataType 2>/dev/null | grep "Model ID" | wc -l | tr -d ' ')
if [[ "$CAMERAS" -gt 0 ]]; then
  echo "  ✅ 检测到 $CAMERAS 个摄像头"
  system_profiler SPCameraDataType 2>/dev/null | grep -E "Camera|Model" | head -6 | sed 's/^/    /'
  PASS=$((PASS + 1))
else
  echo "  ❌ 未检测到摄像头"
  echo "  💡 请连接 USB 摄像头 (推荐: OBSBOT Tiny 2 / Logitech MX Brio)"
  FAIL=$((FAIL + 1))
fi

# ---- 麦克风 ----
echo ""
echo "🎤 麦克风检测..."
MIC_COUNT=$(system_profiler SPAudioDataType 2>/dev/null | grep -c "Input Source" || echo "0")
if [[ "$MIC_COUNT" -gt 0 ]]; then
  echo "  ✅ 检测到音频输入设备"
  PASS=$((PASS + 1))
else
  echo "  ❌ 未检测到麦克风"
  echo "  💡 请连接 USB 麦克风 (推荐: Jabra Speak2 75)"
  FAIL=$((FAIL + 1))
fi

# ---- 扬声器 ----
echo ""
echo "🔊 扬声器检测..."
SPK_COUNT=$(system_profiler SPAudioDataType 2>/dev/null | grep -c "Output Source" || echo "0")
if [[ "$SPK_COUNT" -gt 0 ]]; then
  echo "  ✅ 检测到音频输出设备"
  PASS=$((PASS + 1))
else
  echo "  ❌ 未检测到扬声器"
  FAIL=$((FAIL + 1))
fi

# ---- ffmpeg ----
echo ""
echo "🎬 ffmpeg 检测..."
if command -v ffmpeg &>/dev/null; then
  echo "  ✅ ffmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')"
  PASS=$((PASS + 1))
else
  echo "  ❌ ffmpeg 未安装"
  echo "  💡 运行: brew install ffmpeg"
  FAIL=$((FAIL + 1))
fi

# ---- whisper-cpp ----
echo ""
echo "🗣️ whisper-cpp 检测..."
if command -v whisper-cpp &>/dev/null; then
  echo "  ✅ whisper-cpp 已安装"
  PASS=$((PASS + 1))
else
  echo "  ⚠️ whisper-cpp 未安装 (可选，用于本地语音识别)"
  echo "  💡 运行: brew install whisper-cpp"
fi

# ---- Edge TTS ----
echo ""
echo "🔈 Edge TTS 检测..."
if command -v edge-tts &>/dev/null; then
  echo "  ✅ edge-tts 已安装"
  PASS=$((PASS + 1))
else
  echo "  ⚠️ edge-tts 未安装 (可选，免费中文语音)"
  echo "  💡 运行: pip3 install edge-tts"
fi

# ---- OpenClaw ----
echo ""
echo "🦞 OpenClaw 检测..."
if command -v openclaw &>/dev/null; then
  echo "  ✅ openclaw 已安装"
  PASS=$((PASS + 1))
else
  echo "  ❌ openclaw 未安装"
  echo "  💡 运行: npm install -g openclaw@latest"
  FAIL=$((FAIL + 1))
fi

# ---- Node.js ----
echo ""
echo "📦 Node.js 检测..."
if command -v node &>/dev/null; then
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$NODE_VER" -ge 22 ]]; then
    echo "  ✅ Node.js $(node -v)"
    PASS=$((PASS + 1))
  else
    echo "  ⚠️ Node.js $(node -v) (需要 ≥22)"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  ❌ Node.js 未安装"
  FAIL=$((FAIL + 1))
fi

# ---- 总结 ----
echo ""
echo "======================================"
echo "📊 检测结果: ✅ $PASS 通过  ❌ $FAIL 失败"
if [[ "$FAIL" -eq 0 ]]; then
  echo "🎉 所有检测通过！可以启动 Agent 系统。"
else
  echo "⚠️ 请处理以上失败项后重新检测。"
fi
