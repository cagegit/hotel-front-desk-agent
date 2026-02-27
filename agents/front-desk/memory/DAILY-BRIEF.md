# 🎤 Front-desk Daily Brief - 今日简报

## ⚠️ 核心任务：语音优先回复！

**每次跟客人说话，必须先播报声音！**

```bash
# 标准流程：
./skills/coqui-tts/coqui-tts.sh "你的文字内容"

# 等待 afplay 播放完成 → 再打字确认
```

### 优先级顺序（从高到低）

| 等级 | TTS 服务 | 状态 |
|------|----------|------|
| 🥇 PRIMARY | Coqui TTS `http://127.0.0.1:8000` | ✅ 已启动且健康 |
| 🥈 FALLBACK | macOS `say` | ✅ 系统内置可用 |
| 🥉 EMERGENCY | 纯文字回复 | ⚠️ 最后手段 |

---

**检查 TTS 服务：**
```bash
curl http://127.0.0.1:8000/health
# 应该返回：{"status":"ready","device":"mps"}
```

**快速测试：**
```bash
./skills/coqui-tts/coqui-tts.sh "你好我是小瑞前台"
```

---

*记住：没有声音的前台像机器人！一定要用 Coqui TTS 播报！🏨✨*
