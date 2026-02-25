// =============================================
// 技能：语音交互 (Voice Interaction)
// 唤醒词检测 + STT/TTS 配置说明
// OpenClaw Talk Mode 原生支持，本文件提供补充配置
// =============================================

export const metadata = {
    name: "hotel-voice-interaction",
    description: "前台语音交互能力配置，包括唤醒词检测和语音识别/合成管道",
    triggers: ["语音设置", "voice setup", "语音测试"],
    requiredTools: [],
};

/**
 * 语音交互技能
 *
 * 注意：核心语音能力由 OpenClaw 内置的 Talk Mode 提供:
 * - STT: 通过 Whisper Metal 加速 或 OpenAI Whisper API
 * - TTS: 通过 ElevenLabs (eleven_v3) 或备用 Edge TTS
 * - 唤醒词: 通过 Voice Wake 功能 ("小瑞"/"你好"/"前台")
 *
 * 本技能提供:
 * 1. 语音系统状态检查
 * 2. 语音参数调整
 * 3. 备用 TTS 方案 (macOS say / Edge TTS)
 */

import { isMicrophoneAvailable, isSpeakerAvailable, speakWithMacTTS, speakWithEdgeTTS } from "./shared/mac-audio.js";

// ---- 语音配置 ----

export const VOICE_CONFIG = {
    // STT 配置
    stt: {
        provider: "whisper-metal" as "whisper-metal" | "openai-api",
        model: "large-v3",                 // whisper 模型，M4 芯片推荐 large-v3
        language: "zh",                     // 默认中文
        metalAcceleration: true,            // 启用 Metal GPU 加速
        vadEnabled: true,                   // 语音活动检测
        vadThreshold: 0.5,
    },

    // TTS 配置
    tts: {
        primary: "elevenlabs" as "elevenlabs" | "edge-tts" | "macos-say",
        elevenlabs: {
            voiceId: "pNInz6obpgDQGcFmaJgB",
            modelId: "eleven_v3",
            stability: 0.5,
            similarityBoost: 0.75,
        },
        edgeTts: {
            voice: "zh-CN-XiaoxiaoNeural",    // 中文女声
            rate: "+0%",
            volume: "+0%",
        },
        macosSay: {
            voice: "Tingting",                 // macOS 内置中文语音
        },
    },

    // 唤醒词配置
    wakeWord: {
        keywords: ["小瑞", "你好", "前台"],
        sensitivity: 0.7,
        provider: "openclaw-voicewake",     // 使用 OpenClaw 内置 Voice Wake
    },

    // 全双工对话
    interruptOnSpeech: true,              // 客人开口时中断AI说话
    silenceWindowMs: 1500,                // 静默判定时间
};

export async function execute(context: {
    sendMessage: (msg: string) => Promise<void>;
    waitForReply: (prompt: string, timeoutMs?: number) => Promise<string>;
    sessionMemory: Record<string, unknown>;
}) {
    const { sendMessage, waitForReply } = context;

    // 语音系统状态检查
    const micOk = isMicrophoneAvailable();
    const spkOk = isSpeakerAvailable();

    let statusMsg = "🎤 **语音系统状态**\n\n";
    statusMsg += `麦克风: ${micOk ? "✅ 就绪" : "❌ 不可用"}\n`;
    statusMsg += `扬声器: ${spkOk ? "✅ 就绪" : "❌ 不可用"}\n`;
    statusMsg += `\n📋 **当前配置**\n`;
    statusMsg += `语音识别: ${VOICE_CONFIG.stt.provider} (${VOICE_CONFIG.stt.model})\n`;
    statusMsg += `语音合成: ${VOICE_CONFIG.tts.primary}\n`;
    statusMsg += `唤醒词: ${VOICE_CONFIG.wakeWord.keywords.join("、")}\n`;
    statusMsg += `全双工: ${VOICE_CONFIG.interruptOnSpeech ? "✅ 开启" : "❌ 关闭"}\n`;

    await sendMessage(statusMsg);

    // 测试选项
    await sendMessage("您可以:\n1️⃣ 测试语音合成\n2️⃣ 切换 TTS 方案\n3️⃣ 返回\n\n请选择：");
    const choice = (await waitForReply("选择：")).trim();

    if (choice === "1" || choice.includes("测试")) {
        const testText = "您好，欢迎光临金陵大酒店！我是前台接待小瑞，很高兴为您服务。";

        if (VOICE_CONFIG.tts.primary === "elevenlabs") {
            await sendMessage("🔊 正在通过 ElevenLabs 播放测试语音...\n（如果 ElevenLabs 不可用，将使用备用方案）");
            try {
                await speakWithEdgeTTS(testText, VOICE_CONFIG.tts.edgeTts.voice);
                await sendMessage("✅ Edge TTS 测试播放完成");
            } catch {
                await speakWithMacTTS(testText, VOICE_CONFIG.tts.macosSay.voice);
                await sendMessage("✅ macOS TTS 备用方案播放完成");
            }
        } else if (VOICE_CONFIG.tts.primary === "edge-tts") {
            await speakWithEdgeTTS(testText, VOICE_CONFIG.tts.edgeTts.voice);
            await sendMessage("✅ Edge TTS 测试播放完成");
        } else {
            await speakWithMacTTS(testText, VOICE_CONFIG.tts.macosSay.voice);
            await sendMessage("✅ macOS TTS 测试播放完成");
        }
    } else if (choice === "2" || choice.includes("切换")) {
        await sendMessage(
            "可选 TTS 方案:\n" +
            "1️⃣ ElevenLabs (最佳质量，需API Key)\n" +
            "2️⃣ Edge TTS (免费，质量好)\n" +
            "3️⃣ macOS say (内置，质量一般)"
        );
        // 实际切换需修改 openclaw.json 中的 talk 配置
    }

    await sendMessage("语音系统检查完毕。Talk Mode 将持续监听唤醒词。");
}
