# 🔧 前台 Agent 工具集

## 可用工具

### 1. 摄像头 (Camera) — 📷 Vision Pipeline

**设备调用方式：**

```bash
# 列出所有可用摄像头
nodes camera_list

# 拍照（默认前置）
nodes camera_snap --facing front --maxWidth 1920

# 用后置摄像头拍照
nodes camera_snap --facing back --quality 80

# 录制短视频
nodes camera_clip --facing front --durationMs 5000 --includeAudio true

# 系统内直接调用（在 agent 对话中）
/camera snap
/camera clip --duration 5
```

**使用场景：**
- 自动检测大厅是否有人
- 人脸比对识别熟客
- 监控异常情况（如长时间逗留）
- 模拟测试：文字描述画面让 Agent"想象"

**配置位置：** `openclaw.json` → `tools.camera`

---

### 2. 语音交互 (Talk Mode) — 🎤 Voice Interaction

**STT (语音转文字):**
- **Whisper (本地)** - 推荐，隐私友好，Metal GPU 加速
- **OpenAI Whisper API** - 高精度，需联网

**TTS (文字转语音):**
- **ElevenLabs** - 首选，自然流畅（需 API key）
  - Voice ID: `pNInz6obpgDQGcFmaJgB`
  - Model: `eleven_v3`
- **macOS `say`** - 备选，系统内置
  ```bash
  say -v "Hello" "您好，请问有什么可以帮您？"
  ```

**唤醒词配置：**
```json
{
  "voiceWake": {
    "enabled": true,
    "keywords": ["小瑞", "你好", "前台"]
  }
}
```

**激活指令：**
- `/talk on` — 开启语音模式
- `/talk off` — 关闭语音模式
- 说"小瑞"/"你好"/"前台" — 自动唤醒

---

### 3. PMS 酒店管理系统

**核心功能：**
- 查询预订信息（按姓名/确认号/手机号）
- 创建入住/退房记录
- 更新房间状态
- 查询房间可用性
- 查询/添加消费记录

**示例对话：**
```
客人：查一下张伟的预订
小瑞：找到了！张伟先生预订了豪华大床房一间，入住日期 2 月 27 日，离店 3 月 1 日。当前状态：待入住。✅
```

---

### 4. 身份验证设备

**硬件集成：**
- **身份证 OCR 读卡器** (USB) — 读取个人信息
- **人脸识别** (摄像头 + Vision Framework) — 活体检测 + 证件照比对
- **3D 活体检测** (RealSense，可选) — 防照片/视频欺骗

**安全等级：** L1 (基础) / L2 (活体) / L3 (生物特征+证件)

---

### 5. 房卡管理

**功能列表：**
- 发放电子房卡（写入房间号 + 有效期 + 权限）
- 回收/注销房卡
- 房卡状态查询（已激活/已过期/已注销）
- 临时房卡生成（限时有效）

**安全提示：** 房卡必须绑定住客身份信息，退房后自动失效。

---

### 6. Agent 间通信

**主从协作模式：**
- `sessions_send` — 向经理 Agent (小管) 发送消息
- `sessions_list` — 查看活跃 Agent 列表
- `subagents list/steer/kill` — 子代理管理

**典型流程：**
1. 前台受理投诉 → 上报给经理
2. 经理审批特殊请求 → 返回给前台执行
3. 复杂任务分发给 Creator Agent

---

### 7. 系统工具

**Shell 命令执行：**
```bash
# 运行本地脚本
bash /path/to/check-in-script.sh

# 读取配置文件
read config/hotel-rates.json

# 写入日志
echo "$(date) Check-in completed" >> logs/activity.log
```

**文件操作：**
- `read` / `write` — 读写任意路径文件
- 适合处理 JSON 数据、CSV 报表、日志归档

**定时任务：**
- `cron` — 设置定期检查（如每 5 分钟扫描大厅）
- 一次性提醒：`/remind 30min "检查大堂是否有滞留客人"`

---

## 配置清单

| 配置项 | 位置 | 说明 |
|--------|------|------|
| Camera | `openclaw.json` → `tools.camera` | 启用/分辨率/设备选择 |
| TTS | `openclaw.json` → `talk` | ElevenLabs 音色/API |
| STT | `tools.json` | Whisper 模型/API 密钥 |
| Wake Words | `openclaw.json` → `voiceWake` | 唤醒词自定义 |
| Skills Watch | `openclaw.json` → `skills.load` | 热重载延迟(ms) |

---

## 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 摄像头无法调用 | 权限未授权 | 系统设置 → 隐私 → 相机 |
| 听不到语音 | ElevenLabs key 缺失 | 检查 `~/.openclaw/openclaw.json` |
| 唤醒词失灵 | 麦克风权限 | 检查系统录音权限 |
| 技能不生效 | 配置未重载 | 重启 openclaw gateway |
