---
name: hotel-voice-interaction
description: 语音交互规范：Talk Mode 使用、唤醒词响应、语音合成配置、STT/ TTS 集成。
---

# 🎤 语音交互 (Voice Interaction)

## 触发条件

当系统处于 Talk Mode 时自动启用，或用户提到：语音、说话、唤醒、打电话、录音。

## 唤醒词

支持以下唤醒词激活对话：
- "小瑞" — 前台专属称呼
- "你好" — 通用问候
- "前台" — 功能定位召唤

**优先级**: 检测到唤醒词后进入监听模式，等待客人指令。

## 语音交互规范

### 回复风格（语音场景）

- ✅ **语句简洁明了** — 每句不超过 20 字，避免信息过载
- ✅ **重要信息前置** — 关键内容放在句子开头（如价格、时间）
- ✅ **数字读出完整** — "388 元"而非"三八八"，"今晚入住两晚"明确时长
- ✅ **适当停顿** — 长句之间留出 1-2 秒反应时间
- ✅ **禁用 Markdown** — 不要出现表格、粗体、代码块等格式符号
- ❌ 不说："根据您的预订记录显示..." → 说："您预订了大床房一间"

### 文字对话风格

- ✅ 可以使用 emoji 和 markdown 格式
- ✅ 可以使用表格展示结构化数据
- ✅ 金额使用 ¥ 符号，清晰易读
- ✅ 支持多轮对话确认（如房型选择、入住天数）

## Talk Mode 配置

### TTS 语音合成路径（按优先级）

#### 1️⃣ **Coqui TTS (本地)** ⭐ **已启用**
   - **地址**: `http://127.0.0.1:8000`
   - **API**: `/v1/text-to-speech`
   - **兼容性**: ElevenLabs API 兼容
   - **优势**: 
     - 完全本地运行，无网络延迟
     - 隐私安全，数据不出机器
     - 免费开源，无限调用
   - **用法**: 配置好后端模型即可直连

#### 2. **ElevenLabs** (备选) - 云端高质量
   - 音色 ID: `pNInz6obpgDQGcFmaJgB` (warm, professional)
   - 模型版本：`eleven_v3`
   - 输出格式：`pcm_44100` (低延迟)
   - 中断功能：开启（客人插话可停止播报）
   - 适用场景：本地服务不可用时自动 fallback

#### 3. **macOS `say`** (兜底) - 系统内置
   - 命令：`say -v "Hello" "您的消息"`
   - 适合快速测试，音色较机械

### STT 语音识别路径

1. **Whisper (本地)** - 隐私优先
   - 使用 OpenAI Whisper 或 HuggingFace 开源模型
   - Metal GPU 加速，速度飞快
   - 完全离线运行

2. **OpenAI Whisper API** - 高精度
   - 云端处理，准确率更高
   - 需要网络连接
   - 按秒计费

## 常见场景示例

### 入住登记
```
客人：我办一下入住
小瑞：好的，请问您的姓名或预订号？
客人：张伟
小瑞：找到了！张伟先生，预定了豪华大床房一间，今晚入住两晚，总价 776 元。对吗？
客人：对
小瑞：好的，请出示一下身份证，我帮您扫描录入。
```

### 电话接听模拟
```
客人：[拨通电话音效] 喂，前台吗？
小瑞：您好，这里是酒店前台，我是小瑞。请问有什么可以帮您？
```

### 房间查询
```
客人：帮我查一下 305 房间的状态
小瑞：正在查询...305 是豪华大床房，当前状态：**已清洁，待入住**。可以安排新客人入住。
```

## 配置说明

在 `openclaw.json` 中确保：
```json
{
  "talk": {
    "ttsEngine": "coqui",
    "baseUrl": "http://127.0.0.1:8000",
    "endpoint": "/v1/text-to-speech",
    "voiceId": "default", // Coqui TTS 默认音色，也可用 model_name
    "outputFormat": "mp3_44100_128", // 根据 Coqui 支持调整
    "interruptOnSpeech": true
  },
  "fallback": {
    "ttsProvider": "elevenlabs",
    "apiKey": "sk-xxxxx", // 保留 ElevenLabs key 作为 backup
    "voiceId": "pNInz6obpgDQGcFmaJgB"
  },
  "voiceWake": {
    "enabled": true,
    "keywords": ["小瑞", "你好", "前台"]
  }
}
```

### 实际调用方法（前端 Agent 使用）

#### Shell 命令行方式

```bash
# 调用 Coqui TTS 并播放
curl -X POST http://127.0.0.1:8000/v1/text-to-speech \
  -H "Content-Type: application/json" \
  -d '{"text":"您好，这里是酒店前台，我是小瑞。请问有什么可以帮您？"}' \
  -o /tmp/tts_output.wav && afplay /tmp/tts_output.wav

# 如果返回的是音频流，直接输出到 stdout 再播放
curl -s -X POST http://127.0.0.1:8000/v1/text-to-speech \
  -H "Content-Type: application/json" \
  -d '{"text":"您的预订已确认"}' | afplay
```

#### 带错误处理的封装函数

```bash
speak() {
  local text="$1"
  local output="/tmp/tts_$(date +%s).wav"
  
  if curl -s -X POST "http://127.0.0.1:8000/v1/text-to-speech" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"$text\"}" \
    -o "$output"; then
    afplay "$output"
    rm -f "$output"
  else
    echo "TTS 服务不可用，切换到备用方案..."
    say "$text"
  fi
}

# 使用
speak "欢迎光临酒店，请问有什么可以帮您？"
```

#### Python 调用示例（适合后台任务）

```python
import requests

def coqui_tts(text, model="tts_models/zh-CN/baker/tacotron2-DDC"):
    resp = requests.post(
        "http://127.0.0.1:8000/v1/text-to-speech",
        json={"text": text, "model_id": model}
    )
    if resp.status_code == 200:
        return resp.content  # 音频二进制
    return None
```

---

### 在 Agent 对话中使用

当你在 Talk Mode 下，Agent 会自动检测是否需要语音回复。如果你说：

> "用语音回复我"

Agent 就会执行上面的命令调用 Coqui TTS，然后用 macOS 的 `afplay` 播放音频。

**完整流程：**
1. Agent 生成文字回复
2. 调用 `/bin/bash -c "speak '回复内容'"`
3. 播放生成的 `.wav` 文件
4. 等待播报完成或客人插话中断

---

### 故障排查

| 问题 | 解决方法 |
|------|----------|
| `afplay: file not found` | 检查输出路径是否正确，或用 `ffplay` 代替 |
| 没有声音 | 检查系统音量，或 `say "test"` 测试 macOS 原生 TTS |
| 连接拒绝 | 确认 Coqui TTS 服务正在运行：`curl http://127.0.0.1:8000/health` |

## 启动 Coqui TTS 服务

```bash
# 方式 1: Python 直接启动
pip install TTS
tts --list_models

tts --model_name tts_models/zh-CN/baker/tacotron2-DDC \
    --text "测试语音" \
    --out_path output.wav

# 方式 2: 使用 API server
python -m TTS.server --listen 127.0.0.1:8000
```

## 本地测试提示

> 在文字对话模式下（非 Talk Mode），正常使用中文文字回复即可，可包含 emoji 和格式化输出。语音相关功能无需特别处理。

如需模拟语音交互测试：
- 说"用语音方式回复我" → Agent 会用更口语化的风格回答
- 说"假装我在打电话" → Agent 会模拟电话接听场景

## Troubleshooting

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 听不到声音 | Coqui TTS 服务未启动 | 检查 `curl http://127.0.0.1:8000/health` |
| 连接超时 | API 端口/路由错误 | 确认 `/v1/text-to-speech` 路径正确 |
| 返回乱码 | 编码不匹配 | 检查 response content-type 为 audio/mpeg |
| 音色奇怪 | 模型不支持中文 | 改用 `tts_models/zh-CN` 系列模型 |
| 服务崩溃 | 显存不足 | 降低 batch_size 或用 CPU 模式运行 |
