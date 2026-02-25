// =============================================
// 身份证扫描 & 人脸识别
// macOS 原生：Vision Framework + AVFoundation
// =============================================

import { execSync } from "node:child_process";
import type { IdScanResult, FaceVerifyResult } from "./types.js";

const USE_MOCK = process.env.MOCK_PMS === "true";

/**
 * 扫描身份证 (OCR 读卡器 / 摄像头 OCR)
 *
 * 实际部署时:
 * - USB 读卡器: 通过 HID 接口直接读取芯片数据
 * - 摄像头 OCR: 使用 macOS Vision Framework VNRecognizeTextRequest
 */
export async function scanIdCard(): Promise<IdScanResult> {
    if (USE_MOCK) {
        // 模拟延时
        await new Promise((r) => setTimeout(r, 1500));
        return {
            success: true,
            name: "张伟",
            idNumber: "110101199001011234",
            gender: "male",
            birthDate: "1990-01-01",
            address: "北京市东城区XX街道XX号",
            photoBase64: "MOCK_PHOTO_BASE64_DATA",
            expiryDate: "2030-12-31",
        };
    }

    try {
        // 调用身份证读卡器驱动 CLI（Linux: 通过 USB HID，macOS: 通过串口）
        // 如果使用摄像头 OCR，则调用 Vision Framework Swift 脚本
        const result = execSync(
            `swift ${__dirname}/../../scripts/scan-id-card.swift`,
            { timeout: 30000, encoding: "utf-8" },
        );
        return JSON.parse(result) as IdScanResult;
    } catch (error) {
        throw new Error(`身份证扫描失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
}

/**
 * 人脸识别比对
 *
 * 将摄像头实时画面与身份证照片进行比对
 * macOS 使用 Vision Framework VNDetectFaceLandmarksRequest
 */
export async function verifyFace(idPhotoBase64: string): Promise<FaceVerifyResult> {
    if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 2000));
        return {
            isMatch: true,
            matchScore: 96.5,
            liveDetection: true,
            capturedPhotoBase64: "MOCK_CAPTURED_FACE_BASE64",
        };
    }

    try {
        // 调用 macOS Vision Framework 进行人脸比对
        // 1. 从摄像头捕获当前人脸
        // 2. 与身份证照片进行特征点比对
        // 3. 活体检测（眨眼/转头）
        const result = execSync(
            `swift ${__dirname}/../../scripts/verify-face.swift --id-photo "${idPhotoBase64}"`,
            { timeout: 30000, encoding: "utf-8" },
        );
        return JSON.parse(result) as FaceVerifyResult;
    } catch (error) {
        throw new Error(`人脸识别失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
}

/**
 * 检测画面中的人脸数量
 * 用于视觉管道的初步检测
 */
export async function detectFaces(imageBase64: string): Promise<{
    faceCount: number;
    boundingBoxes: Array<{ x: number; y: number; width: number; height: number }>;
}> {
    if (USE_MOCK) {
        return {
            faceCount: 1,
            boundingBoxes: [{ x: 0.3, y: 0.2, width: 0.4, height: 0.5 }],
        };
    }

    try {
        const result = execSync(
            `swift ${__dirname}/../../scripts/detect-faces.swift --image "${imageBase64}"`,
            { timeout: 10000, encoding: "utf-8" },
        );
        return JSON.parse(result);
    } catch {
        return { faceCount: 0, boundingBoxes: [] };
    }
}
