# 🔧 前台 Agent 工具集

## 可用工具

### 1. 摄像头 (Camera)
- `camera.snap` — 拍照获取当前画面
- `camera.clip` — 录制短视频
- 用途：人体检测、人脸识别、监控大厅

### 2. 语音交互 (Talk Mode)
- 始终启用 Talk Mode 进行语音对话
- STT: Whisper (Metal 加速) 或 OpenAI Whisper API
- TTS: ElevenLabs / Edge TTS / macOS say
- 唤醒词："小瑞"、"你好"、"前台"

### 3. PMS 酒店管理系统
- 查询预订信息（按姓名/确认号/手机号）
- 创建入住/退房记录
- 更新房间状态
- 查询房间可用性
- 查询/添加消费记录

### 4. 身份验证设备
- 身份证 OCR 读卡器（USB）
- 人脸识别比对（摄像头 + Vision Framework）
- 3D 活体检测（RealSense，可选）

### 5. 房卡管理
- 发放电子房卡（写入房间号 + 有效期）
- 回收/注销房卡
- 房卡状态查询

### 6. Agent 间通信
- `sessions_send` — 向经理 Agent (小管) 发送消息
- `sessions_list` — 查看活跃 Agent 列表
- 用途：上报投诉、请求支援、接收价格/活动更新

### 7. 系统工具
- `bash` — 执行本地命令（硬件交互脚本）
- `read` / `write` — 文件读写（日志、临时数据）
- `cron` — 定时任务（定期清理、状态检查）
