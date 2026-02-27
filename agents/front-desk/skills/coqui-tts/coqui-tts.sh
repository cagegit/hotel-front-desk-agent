#!/bin/bash
# Coqui TTS Local - Execute via CLI
# Usage: ./coqui-tts "text to speak" [--model model_id] [--silent] [--output file.wav]

set -e

TEXT="$1"
MODEL="zh-cn"
OUTPUT_SPECIFIED=false
OUTPUT="/tmp/coqui_tts_$(date +%s).wav"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --silent) SILENT=true; shift ;;
    --output) OUTPUT="$2"; OUTPUT_SPECIFIED=true; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    *) TEXT="$*"; shift ;;
  esac
done

echo "🎤 Generating speech with Coqui TTS..." >&2
echo "   Text: $TEXT" >&2
echo "   Model: $MODEL" >&2

# Call Coqui TTS API (returns JSON with audio_url)
RESPONSE=$(curl -s -X POST "http://127.0.0.1:8000/v1/speak" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$TEXT\",\"language\":\"$MODEL\"}")

echo "   Response: $RESPONSE" >&2

# Extract audio_url from JSON
# AUDIO_URL=$(echo "$RESPONSE" | grep -o '"audio_url":"[^"]*"' | cut -d'"' -f4)

# if [ -z "$AUDIO_URL" ]; then
#   echo "❌ Failed to parse audio_url from response" >&2
#   say "TTS 服务出错，请稍后再试"
#   exit 1
# fi

# echo "   Audio URL: $AUDIO_URL" >&2

# Check if the generated file exists and is valid
# if [ ! -f "$AUDIO_URL" ]; then
#   echo "❌ Generated file not found at: $AUDIO_URL" >&2
#   say "音频文件未生成"
#   exit 1
# fi

# # Copy to our output location if specified
# if [ "$OUTPUT_SPECIFIED" = false ]; then
#   # Just use the generated file directly for playback
#   FINAL_FILE="$AUDIO_URL"
# else
#   cp "$AUDIO_URL" "$OUTPUT"
#   FINAL_FILE="$OUTPUT"
# fi

# # Verify it's actually an audio file (not JSON error)
# FILE_TYPE=$(file "$FINAL_FILE" | grep -i "audio\|wav\|mp3" || true)

# if [ -z "$FILE_TYPE" ]; then
#   echo "❌ Generated file is not a valid audio file!" >&2
#   cat "$FINAL_FILE" | head -c 500 >&2
#   echo "" >&2
#   say "无法播放音频，请检查 Coqui TTS 配置"
#   exit 1
# fi

# echo "✅ Audio file ready: $FINAL_FILE" >&2

# # Play audio if not silent
# if [ "${SILENT:-false}" != "true" ]; then
#   echo "▶️ Playing audio..." >&2
  
#   # macOS afplay blocks until done
#   afplay "$FINAL_FILE"
  
#   echo "✅ Done!" >&2
# else
#   echo "✅ Audio saved to: $OUTPUT" >&2
# fi
