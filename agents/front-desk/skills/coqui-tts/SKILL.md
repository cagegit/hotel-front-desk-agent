---
name: coqui-tts-local
description: | 
  本地 Coqui TTS 语音服务 | 调用 ./coqui-tts.sh 将文字转为中文语音并播放（免费方案）
metadata: { "requires": ["bash", "curl", "afplay"] }
---

# 🎤 本地 Coqui TTS 语音服务

## 可执行脚本位置

`./skills/coqui-tts/coqui-tts.sh` - 可直接调用的 bash 脚本

## 配置要求

**Coqui TTS 服务必须已启动：**
```bash
python -m TTS.server --listen 127.0.0.1:8000
```

**验证服务状态：**
```bash
curl http://127.0.0.1:8000/health
```

**API 工作方式：**
- POST `/v1/speak`
- 返回 JSON: `{"status": "success"}`
- 实际音频生成在本地文件系统

## TTS 优先级链 ⭐ **完全免费**

### 1️⃣ PRIMARY: Coqui TTS Local
- URL: `http://127.0.0.1:8000/v1/speak`
- 模型：`zh-cn` (中文)
- 优点：自然流畅，免费，离线可用
- 触发：`./skills/coqui-tts/coqui-tts.sh "文字"`

### 2️⃣ FALLBACK: macOS `say`
- 命令：`say "文字"`
- 优点：系统内置，完全免费，无需联网
- 缺点：声音比较机械
- 场景：Coqui 服务挂了的时候应急用

## 使用方法

### Agent 自动调用（推荐）

在对话中让 agent 自然触发：
- "用声音回复我"
- "试试你的语音功能"
- Talk Mode 场景下的问候

Agent 会执行：
```bash
./skills/coqui-tts/coqui-tts.sh "你的文字"
```

流程：
1. 调用 Coqui TTS API → 得到 JSON 响应
2. 提取 `audio_url` 字段
3. 读取生成的 `.wav` 文件
4. `afplay` 自动播放
5. 等待播报完成

### 手动命令行测试

```bash
cd /Users/cage/work/hotel_bot_app/hotel-front-desk-agent/agents/front-desk/
./skills/coqui-tts/coqui-tts.sh "测试小瑞的声音"
```

预期输出：
```text
🎤 Generating speech with Coqui TTS...
✅ Audio file ready: /Users/cage/llm_tools/coqui_tts/output.wav
▶️ Playing audio...
✅ Done!
```

同时会听到中文播报声。

## 脚本参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `<text>` (必填) | 要播报的文字 | - |
| `--model MODEL_ID` | TTS 模型 ID | `tts_models/zh-CN/baker/tacotron2-DDC` |
| `--silent` | 仅生成文件不播放 | `false` |
| `--output FILE` | 自定义输出路径 | 临时文件 |

示例：
```bash
# 指定其他语言模型
./skills/coqui-tts/coqui-tts.sh --model tts_models/en_US/multi-dataset/jenny-docker "Hello world"

# 只生成不播放
./skills/coqui-tts/coqui-tts.sh --silent "test.wav"
```

## 故障排查

| 问题 | 诊断命令 |
|------|----------|
| JSON 不是音频 | `file output.wav` 确认类型 |
| 连接拒绝 | `curl http://127.0.0.1:8000/health` |
| 无声 | `afplay /path/to/file.wav` 测试系统音量 |
| 文件不存在 | 检查 Coqui TTS 配置的输出目录权限 |
