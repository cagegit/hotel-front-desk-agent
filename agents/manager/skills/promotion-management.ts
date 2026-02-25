// =============================================
// 技能：折扣活动管理 (Promotion Management)
// 创建/暂停/删除促销活动
// =============================================

import { checkPermission } from "./shared/permission.js";
import { buildPromotionListCard } from "./shared/card-builder.js";
import type { Promotion, PromotionType, PromotionStatus } from "./shared/types.js";

export const metadata = {
    name: "hotel-promotion-management",
    description: "管理酒店促销活动：创建、查看、暂停、删除活动",
    triggers: [
        "活动", "促销", "折扣", "打折", "优惠", "立减", "连住",
        "创建活动", "查看活动", "暂停活动",
    ],
};

let promoCounter = 100;

// Mock 活动数据
const promotions: Promotion[] = [
    {
        id: "PROMO-101", name: "春季特惠", type: "discount", description: "全房型 8.5 折",
        discount: 0.85, startDate: "2026-02-20", endDate: "2026-03-31",
        status: "active", applicableRoomTypes: ["standard", "deluxe", "suite"],
        createdBy: "李经理", createdAt: "2026-02-18T10:00:00Z",
    },
    {
        id: "PROMO-102", name: "连住优惠", type: "stay_free", description: "连住3晚免1晚",
        stayNights: 3, freeNights: 1, startDate: "2026-01-01", endDate: "2026-06-30",
        status: "active", applicableRoomTypes: ["standard", "deluxe"],
        createdBy: "张老板", createdAt: "2025-12-28T14:00:00Z",
    },
];

export async function execute(context: {
    sendMessage: (msg: string) => Promise<void>;
    waitForReply: (prompt: string, timeoutMs?: number) => Promise<string>;
    sessionMemory: Record<string, unknown>;
    senderInfo?: { userId: string; name: string };
}) {
    const { sendMessage, waitForReply } = context;
    const senderId = context.senderInfo?.userId || "U001";

    // 展示当前活动
    const activePromos = promotions.filter((p) => p.status !== "deleted");
    const listMsg = buildPromotionListCard(activePromos);

    await sendMessage(listMsg + "\n\n请选择操作：\n1️⃣ 创建新活动\n2️⃣ 暂停/启用活动\n3️⃣ 删除活动\n4️⃣ 返回");
    const choice = (await waitForReply("选择：")).trim();

    // ---- 创建活动 ----
    if (choice === "1" || choice.includes("创建")) {
        const permCheck = checkPermission(senderId, "promotion.create");
        if (!permCheck.allowed) { await sendMessage(permCheck.message!); return; }

        await sendMessage(
            "请选择活动类型：\n" +
            "1️⃣ 打折 (如: 全场 8.5 折)\n" +
            "2️⃣ 立减 (如: 每晚立减 50 元)\n" +
            "3️⃣ 连住免费 (如: 住3免1)\n" +
            "4️⃣ 免费升级 (如: 标准间升豪华房)"
        );
        const typeChoice = (await waitForReply("类型：")).trim();

        await sendMessage("请输入活动名称：");
        const name = (await waitForReply("名称：")).trim();

        await sendMessage("请输入活动描述：");
        const description = (await waitForReply("描述：")).trim();

        await sendMessage("请输入活动日期范围\n格式：`开始日期 结束日期`\n例如：`2026-03-01 2026-03-31`");
        const dateInput = (await waitForReply("日期：")).trim().split(/\s+/);

        promoCounter++;
        const promo: Promotion = {
            id: `PROMO-${promoCounter}`,
            name,
            type: (["discount", "reduction", "stay_free", "upgrade"] as PromotionType[])[parseInt(typeChoice, 10) - 1] || "discount",
            description,
            startDate: dateInput[0] || "2026-03-01",
            endDate: dateInput[1] || "2026-03-31",
            status: "active",
            applicableRoomTypes: ["standard", "deluxe", "suite"],
            createdBy: context.senderInfo?.name || "unknown",
            createdAt: new Date().toISOString(),
        };

        promotions.push(promo);
        await sendMessage(
            `✅ 活动创建成功！\n\n🎉 **${promo.name}**\n📝 ${promo.description}\n📅 ${promo.startDate} ~ ${promo.endDate}\n🆔 ${promo.id}\n\n已通知前台 Agent 同步。`
        );
    }

    // ---- 暂停/启用 ----
    else if (choice === "2" || choice.includes("暂停") || choice.includes("启用")) {
        const permCheck = checkPermission(senderId, "promotion.modify");
        if (!permCheck.allowed) { await sendMessage(permCheck.message!); return; }

        await sendMessage("请输入活动 ID（如 PROMO-101）：");
        const promoId = (await waitForReply("活动ID：")).trim();
        const promo = promotions.find((p) => p.id === promoId);

        if (!promo) { await sendMessage("❌ 未找到该活动。"); return; }

        promo.status = promo.status === "active" ? "paused" : "active";
        const action = promo.status === "active" ? "启用" : "暂停";
        await sendMessage(`✅ 活动 **${promo.name}** 已${action}。`);
    }

    // ---- 删除 ----
    else if (choice === "3" || choice.includes("删除")) {
        const permCheck = checkPermission(senderId, "promotion.delete");
        if (!permCheck.allowed) { await sendMessage(permCheck.message!); return; }

        await sendMessage("请输入要删除的活动 ID：");
        const promoId = (await waitForReply("活动ID：")).trim();
        const promo = promotions.find((p) => p.id === promoId);

        if (!promo) { await sendMessage("❌ 未找到该活动。"); return; }

        await sendMessage(`⚠️ 确认删除活动 **${promo.name}**？此操作不可恢复。(确认/取消)`);
        const confirm = (await waitForReply("确认？")).trim();

        if (confirm.includes("确认")) {
            promo.status = "deleted" as PromotionStatus;
            await sendMessage(`✅ 活动 **${promo.name}** 已删除。`);
        } else {
            await sendMessage("已取消。");
        }
    }
}
