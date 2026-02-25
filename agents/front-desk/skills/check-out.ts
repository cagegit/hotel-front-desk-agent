// =============================================
// 技能：退房办理 (Check-Out)
// 流程：验证房卡 → 核查账单 → 处理结算 → 回收房卡 → 更新系统 → 送别
// =============================================

import { getChargesByRoom, getGuestByRoom, createCheckOutRecord, updateReservationStatus } from "./shared/guest-registry.js";
import { revokeRoomCard, updateRoomStatus } from "./shared/room-manager.js";
import type { ChargeItem } from "./shared/types.js";

export const metadata = {
    name: "hotel-check-out",
    description: "酒店退房办理流程",
    triggers: ["退房", "办理退房", "check out", "我要退房", "结账"],
    requiredTools: ["guest-registry", "room-manager"],
};

export async function execute(context: {
    sendMessage: (msg: string) => Promise<void>;
    waitForReply: (prompt: string, timeoutMs?: number) => Promise<string>;
    sessionMemory: Record<string, unknown>;
}) {
    const { sendMessage, waitForReply, sessionMemory } = context;

    // Step 1: 确认退房信息
    await sendMessage("🏨 好的，为您办理退房。\n请问您的房间号是多少？");
    const roomNumber = (await waitForReply("请输入房间号：")).trim();

    // Step 2: 查询入住信息
    await sendMessage(`正在查询 ${roomNumber} 房间信息... 🔍`);

    let guestInfo;
    try {
        guestInfo = await getGuestByRoom(roomNumber);
    } catch {
        await sendMessage("⚠️ 系统查询暂时不可用，请稍候。");
        return;
    }

    if (!guestInfo) {
        await sendMessage(`❌ 未查询到 ${roomNumber} 房间的入住记录。请确认房间号是否正确。`);
        return;
    }

    const { guest, reservation, roomCard } = guestInfo;

    await sendMessage(
        `✅ 查询到入住信息：\n` +
        `👤 ${guest.name}\n` +
        `🚪 房间 ${roomNumber}\n` +
        `📅 入住 ${reservation.checkInDate} ~ ${reservation.checkOutDate}\n\n` +
        `请将房卡放在前台，我来为您核查账单。`
    );

    // Step 3: 核查消费账单
    let charges: ChargeItem[] = [];
    try {
        charges = await getChargesByRoom(roomNumber);
    } catch {
        await sendMessage("⚠️ 账单查询异常，已通知工作人员协助。");
        return;
    }

    const roomCharge = reservation.totalPrice;
    const extraCharges = charges.reduce((sum, c) => sum + c.amount, 0);
    const totalAmount = roomCharge + extraCharges;

    let billMessage = `📋 **退房账单**\n\n`;
    billMessage += `🛏️ 房费: ¥${roomCharge.toFixed(2)}\n`;

    if (charges.length > 0) {
        billMessage += `\n📦 额外消费:\n`;
        for (const charge of charges) {
            billMessage += `  • ${translateCategory(charge.category)}: ${charge.description} — ¥${charge.amount.toFixed(2)}\n`;
        }
    }

    billMessage += `\n━━━━━━━━━━━━━━━━\n`;
    billMessage += `💰 **合计: ¥${totalAmount.toFixed(2)}**\n\n`;
    billMessage += `请确认账单是否正确？(确认/有异议)`;

    await sendMessage(billMessage);
    const confirmation = (await waitForReply("请确认：")).trim();

    if (confirmation.includes("异议") || confirmation.includes("不对") || confirmation.includes("错")) {
        await sendMessage("好的，我已通知值班经理为您核查。请稍候片刻，马上会有工作人员来协助您。🙏");
        // TODO: 通过 sessions_send 通知经理 Agent
        return;
    }

    // Step 4: 处理结算
    const paidAmount = reservation.totalPrice; // 预付房费
    const remainingAmount = totalAmount - paidAmount;

    if (remainingAmount > 0) {
        await sendMessage(`💳 额外消费 ¥${remainingAmount.toFixed(2)} 需要补缴。\n请选择支付方式（微信/支付宝/现金/银行卡）：`);
        const payMethod = (await waitForReply("支付方式：")).trim();
        await sendMessage(`✅ 已通过${payMethod}收取 ¥${remainingAmount.toFixed(2)}。`);
    } else if (remainingAmount < 0) {
        await sendMessage(`💰 需退还 ¥${Math.abs(remainingAmount).toFixed(2)}，将原路退回。`);
    }

    // Step 5: 回收房卡 & 更新系统
    try {
        await revokeRoomCard(roomCard.cardId);
        await updateRoomStatus(roomNumber, "cleaning");
        await createCheckOutRecord({
            reservationId: reservation.reservationId,
            guestId: guest.id,
            roomNumber,
            cardId: roomCard.cardId,
            checkOutTime: new Date().toISOString(),
            totalCharges: totalAmount,
            paidAmount: totalAmount,
            refundAmount: remainingAmount < 0 ? Math.abs(remainingAmount) : 0,
            operatedBy: "agent:hotel-front-desk",
        });
        await updateReservationStatus(reservation.reservationId, "checked_out");
    } catch {
        await sendMessage("⚠️ 系统更新异常，我已记录，请放心不会影响您的退房。");
    }

    // 清除 session 数据
    delete sessionMemory["currentGuest"];
    delete sessionMemory["currentRoom"];
    delete sessionMemory["currentReservation"];
    delete sessionMemory["roomCard"];

    // Step 6: 送别
    await sendMessage(
        `🎉 退房完成！\n\n` +
        `👤 ${guest.name}\n` +
        `🚪 房间 ${roomNumber} 已释放\n` +
        `🔑 房卡已注销\n` +
        `💰 总计 ¥${totalAmount.toFixed(2)}\n\n` +
        `感谢您的入住！期待下次再见！🌟\n` +
        `祝您旅途愉快！🚗✨`
    );
}

function translateCategory(category: string): string {
    const map: Record<string, string> = {
        room: "房费", minibar: "迷你吧", restaurant: "餐饮",
        laundry: "洗衣", spa: "水疗", damage: "损坏赔偿", other: "其他",
    };
    return map[category] || category;
}
