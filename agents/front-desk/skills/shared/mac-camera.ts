// =============================================
// macOS 摄像头封装
// 通过 AVFoundation (Swift 桥接) 访问 USB 外接摄像头
// =============================================

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const USE_MOCK = process.env.MOCK_PMS === "true";

export interface CameraDevice {
    id: string;
    name: string;
    isDefault: boolean;
}

/**
 * 列出可用摄像头设备
 */
export function listCameras(): CameraDevice[] {
    if (USE_MOCK) {
        return [
            { id: "0x00001", name: "OBSBOT Tiny 2 4K", isDefault: true },
            { id: "0x00002", name: "FaceTime HD Camera", isDefault: false },
        ];
    }

    try {
        // 使用 system_profiler 列出摄像头
        const output = execSync(
            "system_profiler SPCameraDataType -json",
            { encoding: "utf-8", timeout: 5000 },
        );
        const data = JSON.parse(output);
        const cameras = data.SPCameraDataType || [];
        return cameras.map((cam: Record<string, string>, idx: number) => ({
            id: cam._name || `cam-${idx}`,
            name: cam._name || `Camera ${idx}`,
            isDefault: idx === 0,
        }));
    } catch {
        return [];
    }
}

/**
 * 拍摄一帧画面（快照）
 * 返回 base64 编码的 JPEG 图像
 */
export async function captureFrame(): Promise<string> {
    if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 500));
        return "MOCK_FRAME_BASE64_JPEG_DATA";
    }

    try {
        // 使用 ffmpeg 从摄像头捕获单帧
        const tmpPath = "/tmp/hotel-agent-frame.jpg";
        execSync(
            `ffmpeg -y -f avfoundation -framerate 30 -i "0" -frames:v 1 -q:v 2 ${tmpPath} 2>/dev/null`,
            { timeout: 10000 },
        );

        if (!existsSync(tmpPath)) throw new Error("Frame capture failed");

        const { readFileSync } = await import("node:fs");
        const buffer = readFileSync(tmpPath);
        return buffer.toString("base64");
    } catch (error) {
        throw new Error(`摄像头捕获失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
}

/**
 * 检测摄像头是否可用
 */
export function isCameraAvailable(): boolean {
    if (USE_MOCK) return true;

    try {
        const cameras = listCameras();
        return cameras.length > 0;
    } catch {
        return false;
    }
}
