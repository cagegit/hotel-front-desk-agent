// =============================================
// macOS 音频设备封装
// 麦克风输入 + 扬声器输出 (Jabra Speak 等)
// =============================================

import { execSync } from "node:child_process";

const USE_MOCK = process.env.MOCK_PMS === "true";

export interface AudioDevice {
    id: string;
    name: string;
    type: "input" | "output";
    isDefault: boolean;
}

/**
 * 列出可用音频设备
 */
export function listAudioDevices(): AudioDevice[] {
    if (USE_MOCK) {
        return [
            { id: "input-1", name: "Jabra Speak2 75 Mic", type: "input", isDefault: true },
            { id: "output-1", name: "Jabra Speak2 75 Speaker", type: "output", isDefault: true },
            { id: "input-2", name: "MacBook Pro Microphone", type: "input", isDefault: false },
            { id: "output-2", name: "MacBook Pro Speakers", type: "output", isDefault: false },
        ];
    }

    try {
        const output = execSync(
            "system_profiler SPAudioDataType -json",
            { encoding: "utf-8", timeout: 5000 },
        );
        const data = JSON.parse(output);
        const devices: AudioDevice[] = [];
        const audioData = data.SPAudioDataType || [];
        for (const group of audioData) {
            const items = group._items || [];
            for (const item of items) {
                devices.push({
                    id: item._name || "unknown",
                    name: item._name || "Unknown Device",
                    type: item.coreaudio_output_source ? "output" : "input",
                    isDefault: false,
                });
            }
        }
        return devices;
    } catch {
        return [];
    }
}

/**
 * 使用 macOS say 命令进行 TTS（备用方案）
 * 当 ElevenLabs / Edge TTS 不可用时使用
 */
export async function speakWithMacTTS(text: string, voice = "Tingting"): Promise<void> {
    if (USE_MOCK) {
        console.log(`[Mock TTS] Speaking: ${text}`);
        return;
    }

    try {
        // macOS 内置中文语音：Tingting (zh_CN), Meijia (zh_TW)
        execSync(`say -v "${voice}" "${text.replace(/"/g, '\\"')}"`, { timeout: 30000 });
    } catch (error) {
        throw new Error(`TTS 播放失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
}

/**
 * 使用 Edge TTS 合成语音（免费中文语音）
 */
export async function speakWithEdgeTTS(
    text: string,
    voice = "zh-CN-XiaoxiaoNeural",
    outputPath = "/tmp/hotel-agent-tts.mp3",
): Promise<string> {
    if (USE_MOCK) {
        console.log(`[Mock Edge TTS] Synthesizing: ${text}`);
        return outputPath;
    }

    try {
        execSync(
            `edge-tts --voice "${voice}" --text "${text.replace(/"/g, '\\"')}" --write-media "${outputPath}"`,
            { timeout: 30000 },
        );
        // 播放生成的音频
        execSync(`afplay "${outputPath}"`, { timeout: 60000 });
        return outputPath;
    } catch (error) {
        throw new Error(`Edge TTS 失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
}

/**
 * 检测麦克风是否可用
 */
export function isMicrophoneAvailable(): boolean {
    if (USE_MOCK) return true;

    try {
        const devices = listAudioDevices();
        return devices.some((d) => d.type === "input");
    } catch {
        return false;
    }
}

/**
 * 检测扬声器是否可用
 */
export function isSpeakerAvailable(): boolean {
    if (USE_MOCK) return true;

    try {
        const devices = listAudioDevices();
        return devices.some((d) => d.type === "output");
    } catch {
        return false;
    }
}
