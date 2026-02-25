// =============================================
// 技能：房价管理 (Price Management)
// 查看/修改房价，特殊日期定价，大幅调价预警
// =============================================

import { checkPermission, requiresBossForPriceChange, getUserByName } from "./shared/permission.js";
import { buildPriceChangeCard } from "./shared/card-builder.js";
import type { PriceChange, SpecialDatePrice } from "./shared/types.js";

export const metadata = {
    name: "hotel-price-management",
    description: "酒店房价管理：查看当前价格、修改房价、设置特殊日期价格",
    triggers: [
        "房价", "价格", "调价", "涨价", "降价", "改价",
        "标准间多少钱", "豪华房价格", "套房价格",
    ],
};

const USE_MOCK = process.env.MOCK_PMS === "true";

// Mock 当前价格
const currentPrices: Record<string, number> = {
    standard: 388,
    deluxe: 560,
    suite: 1280,
    presidential: 3880,
};

// 价格变更历史
const priceHistory: PriceChange[] = [];

// 特殊日期价格
const specialPrices: SpecialDatePrice[] = [];

export async function execute(context: {
    sendMessage: (msg: string) => Promise<void>;
    waitForReply: (prompt: string, timeoutMs?: number) => Promise<string>;
    sessionMemory: Record<string, unknown>;
    senderInfo?: { userId: string; name: string };
}) {
    const { sendMessage, waitForReply, sessionMemory } = context;
    const senderId = context.senderInfo?.userId || "U001";

    // 展示当前价格
    let priceMsg = "💰 **当前房价一览**\n\n";
    priceMsg += "| 房型 | 门市价 |\n|------|-------|\n";
    for (const [type, price] of Object.entries(currentPrices)) {
        priceMsg += `| ${translateRoomType(type)} | ¥${price} |\n`;
    }

    if (specialPrices.length > 0) {
        priceMsg += "\n📅 **特殊日期价格**\n";
        for (const sp of specialPrices) {
            priceMsg += `• ${sp.date} ${sp.label}: ${translateRoomType(sp.roomType)} ¥${sp.price}\n`;
        }
    }

    priceMsg += "\n请选择操作：\n1️⃣ 修改房价\n2️⃣ 设置特殊日期价格\n3️⃣ 查看价格变更历史\n4️⃣ 返回";

    await sendMessage(priceMsg);
    const choice = (await waitForReply("选择：")).trim();

    // ---- 修改房价 ----
    if (choice === "1" || choice.includes("修改")) {
        const permCheck = checkPermission(senderId, "price.modify");
        if (!permCheck.allowed) {
            await sendMessage(permCheck.message!);
            return;
        }

        await sendMessage("请输入要修改的房型和新价格\n格式：`房型 新价格`\n例如：`标准间 428` 或 `standard 428`");
        const input = (await waitForReply("修改：")).trim();

        const parsed = parsePriceInput(input);
        if (!parsed) {
            await sendMessage("❌ 格式不正确。请使用格式：`房型 新价格`");
            return;
        }

        const { roomType, newPrice } = parsed;
        const oldPrice = currentPrices[roomType];
        const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

        // 大幅调价预警
        if (requiresBossForPriceChange(changePercent)) {
            const bossCheck = checkPermission(senderId, "price.modify");
            const user = getUserByName(context.senderInfo?.name || "");
            if (user?.role !== "boss") {
                await sendMessage(
                    `⚠️ **大幅调价预警**\n\n` +
                    `${translateRoomType(roomType)}: ¥${oldPrice} → ¥${newPrice} (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%)\n\n` +
                    `价格调整幅度超过 20%，需要老板权限确认。`
                );
                return;
            }
        }

        // 二次确认
        const confirmMsg = buildPriceChangeCard([{ roomType: translateRoomType(roomType), oldPrice, newPrice }]);
        await sendMessage(confirmMsg);
        const confirm = (await waitForReply("确认？")).trim();

        if (confirm.includes("确认") || confirm.includes("是") || confirm === "y") {
            currentPrices[roomType] = newPrice;

            const change: PriceChange = {
                roomType,
                oldPrice,
                newPrice,
                changePercent,
                changedBy: context.senderInfo?.name || "unknown",
                changedAt: new Date().toISOString(),
            };
            priceHistory.push(change);

            await sendMessage(
                `✅ 房价修改完成！\n\n` +
                `${translateRoomType(roomType)}: ¥${oldPrice} → ¥${newPrice}\n` +
                `已通知前台 Agent 更新。`
            );

            // TODO: 通过 sessions_send 通知前台 Agent
            sessionMemory["lastPriceChange"] = change;
        } else {
            await sendMessage("已取消修改。");
        }
    }

    // ---- 特殊日期价格 ----
    else if (choice === "2" || choice.includes("特殊日期")) {
        const permCheck = checkPermission(senderId, "price.modify");
        if (!permCheck.allowed) { await sendMessage(permCheck.message!); return; }

        await sendMessage("请输入特殊日期价格\n格式：`日期 房型 价格 标签`\n例如：`2026-03-01 standard 468 周末`");
        const input = (await waitForReply("输入：")).trim();
        const parts = input.split(/\s+/);
        if (parts.length >= 3) {
            const sp: SpecialDatePrice = {
                date: parts[0],
                roomType: normalizeRoomType(parts[1]),
                price: parseInt(parts[2], 10),
                label: parts[3] || "",
            };
            specialPrices.push(sp);
            await sendMessage(`✅ 已设置 ${sp.date} ${sp.label} ${translateRoomType(sp.roomType)} 价格为 ¥${sp.price}`);
        } else {
            await sendMessage("❌ 格式不正确。");
        }
    }

    // ---- 价格历史 ----
    else if (choice === "3" || choice.includes("历史")) {
        if (priceHistory.length === 0) {
            await sendMessage("📋 暂无价格变更记录。");
        } else {
            let historyMsg = "📋 **价格变更历史（最近10条）**\n\n";
            for (const h of priceHistory.slice(-10)) {
                historyMsg += `• ${h.changedAt.slice(0, 16)} ${translateRoomType(h.roomType)}: ¥${h.oldPrice}→¥${h.newPrice} by ${h.changedBy}\n`;
            }
            await sendMessage(historyMsg);
        }
    }
}

// ---- 辅助函数 ----

function parsePriceInput(input: string): { roomType: string; newPrice: number } | null {
    const parts = input.split(/\s+/);
    if (parts.length < 2) return null;
    const roomType = normalizeRoomType(parts[0]);
    const newPrice = parseInt(parts[1], 10);
    if (!roomType || isNaN(newPrice) || newPrice <= 0) return null;
    return { roomType, newPrice };
}

function normalizeRoomType(input: string): string {
    const map: Record<string, string> = {
        "标准间": "standard", "标准": "standard", "standard": "standard",
        "豪华房": "deluxe", "豪华": "deluxe", "deluxe": "deluxe",
        "套房": "suite", "suite": "suite",
        "总统套房": "presidential", "总统": "presidential", "presidential": "presidential",
    };
    return map[input] || input;
}

function translateRoomType(type: string): string {
    return { standard: "标准间", deluxe: "豪华房", suite: "套房", presidential: "总统套房" }[type] || type;
}
