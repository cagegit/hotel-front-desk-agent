// =============================================
// 技能：视觉管道 (Vision Pipeline)
// 通过摄像头持续监测大厅，检测来宾并主动问候
// =============================================

import { captureFrame, isCameraAvailable } from "./shared/mac-camera.js";
import { detectFaces } from "./shared/id-scanner.js";
import type { DetectionResult } from "./shared/types.js";

export const metadata = {
    name: "hotel-vision-pipeline",
    description: "摄像头持续监测前台区域，检测来宾并触发主动问候",
    triggers: ["开始监测", "视觉监测", "启动摄像头", "start monitoring"],
    requiredTools: ["camera"],
};

// 已问候的人脸记录，防止重复问候
const greetedFaces = new Map<string, number>(); // faceHash → timestamp
const GREETING_COOLDOWN_MS = 30 * 60 * 1000;    // 30 分钟冷却期
const DETECTION_INTERVAL_MS = 3000;               // 3 秒检测一次
const MAX_CONTINUOUS_RUNS = 600;                   // 最多 30 分钟 (600 × 3s)

export async function execute(context: {
    sendMessage: (msg: string) => Promise<void>;
    waitForReply: (prompt: string, timeoutMs?: number) => Promise<string>;
    sessionMemory: Record<string, unknown>;
}) {
    const { sendMessage, sessionMemory } = context;

    // 检查摄像头
    if (!isCameraAvailable()) {
        await sendMessage("⚠️ 摄像头不可用，视觉监测无法启动。请检查摄像头连接。");
        return;
    }

    await sendMessage(
        "📷 视觉监测已启动\n\n" +
        "• 摄像头: ✅ 就绪\n" +
        "• 检测间隔: 3 秒\n" +
        "• 冷却期: 30 分钟\n\n" +
        "正在监测前台区域..."
    );

    let runCount = 0;
    let lastDetection: DetectionResult | null = null;

    while (runCount < MAX_CONTINUOUS_RUNS) {
        runCount++;

        try {
            const detection = await detectPerson();
            lastDetection = detection;

            if (detection.personDetected && detection.faceDetected) {
                const faceHash = generateFaceHash(detection);

                // 检查是否在冷却期内
                const lastGreeted = greetedFaces.get(faceHash);
                const now = Date.now();

                if (!lastGreeted || now - lastGreeted > GREETING_COOLDOWN_MS) {
                    // 新来宾或冷却期已过，触发问候
                    greetedFaces.set(faceHash, now);

                    if (detection.knownGuest) {
                        // 已注册客人 — 个性化问候
                        await sendMessage(
                            `👋 ${detection.knownGuest.name}${detection.knownGuest.vipLevel !== "normal" ? " (VIP)" : ""}，欢迎回来！\n` +
                            `请问有什么可以帮您？`
                        );
                    } else {
                        // 新客人 — 通用问候，引导入住流程
                        await sendMessage(
                            `👋 您好，欢迎光临！我是前台接待小瑞。\n` +
                            `请问您是来办理入住，还是有其他需要？`
                        );
                    }

                    // 存储检测结果供其他技能使用
                    sessionMemory["lastDetection"] = detection;
                }
            }
        } catch (error) {
            console.error(`[Vision] Detection error: ${error}`);
        }

        // 等待下一次检测
        await new Promise((r) => setTimeout(r, DETECTION_INTERVAL_MS));
    }

    await sendMessage("📷 视觉监测已运行 30 分钟，自动暂停。输入「开始监测」可重新启动。");
    sessionMemory["lastDetection"] = lastDetection;
}

// ---- 辅助函数 ----

async function detectPerson(): Promise<DetectionResult> {
    const frameBase64 = await captureFrame();
    const faceResult = await detectFaces(frameBase64);

    return {
        personDetected: faceResult.faceCount > 0,
        faceDetected: faceResult.faceCount > 0,
        faceCount: faceResult.faceCount,
        timestamp: new Date().toISOString(),
        frameBase64,
    };
}

function generateFaceHash(detection: DetectionResult): string {
    // 简单的人脸哈希：实际部署时应使用人脸特征向量
    // 这里用时间戳的分钟级精度 + 人脸数作为简易标识
    if (detection.knownGuest) return `known-${detection.knownGuest.id}`;
    const ts = new Date(detection.timestamp);
    return `unknown-${ts.getHours()}-${ts.getMinutes()}-${detection.faceCount}`;
}

/**
 * 清理过期的问候记录
 */
export function cleanupGreetedFaces(): void {
    const now = Date.now();
    for (const [hash, timestamp] of greetedFaces.entries()) {
        if (now - timestamp > GREETING_COOLDOWN_MS * 2) {
            greetedFaces.delete(hash);
        }
    }
}
