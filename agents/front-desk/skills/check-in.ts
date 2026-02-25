// =============================================
// 技能：入住登记 (Check-In)
// 流程：识别来宾 → 询问姓名 → 查询预订 → 身份证扫描 → 人脸识别 → 分配房间 → 发放房卡
// =============================================

import { queryReservationByName, createCheckInRecord, updateReservationStatus } from "./shared/guest-registry";
import { scanIdCard, verifyFace } from "./shared/id-scanner";
import { assignRoom, issueRoomCard, updateRoomStatus } from "./shared/room-manager";
import type { Reservation, Guest } from "./shared/types";

export const metadata = {
  name: "hotel-check-in",
  description: "酒店入住登记流程",
  triggers: ["入住", "办理入住", "check in", "我要住店", "我有预订", "开房"],
  requiredTools: ["guest-registry", "id-scanner", "room-manager"],
};

export async function execute(context: {
  sendMessage: (msg: string) => Promise<void>;
  waitForReply: (prompt: string, timeoutMs?: number) => Promise<string>;
  sessionMemory: Record<string, unknown>;
}) {
  const { sendMessage, waitForReply, sessionMemory } = context;

  // Step 1: 主动问候，询问姓名
  await sendMessage("🏨 您好，欢迎光临！我是前台接待小瑞。\n请问您贵姓？是否有提前预订？");
  const guestName = (await waitForReply("请告诉我您的姓名：")).trim();

  // Step 2: 查询登记系统
  await sendMessage(`正在为您查询预订信息，请稍候... 🔍`);

  let guest: Guest | null = null;
  let reservations: Reservation[] = [];

  try {
    const result = await queryReservationByName(guestName);
    guest = result.guest;
    reservations = result.reservations;
  } catch {
    await sendMessage("⚠️ 查询系统暂时不可用，我已通知技术人员。请您稍候片刻。");
    return;
  }

  if (!guest || reservations.length === 0) {
    await sendMessage(
      `抱歉，未查询到 **${guestName}** 的预订信息。\n\n` +
      "您可以：\n1️⃣ 确认预订姓名后重新查询\n2️⃣ 提供预订确认号\n3️⃣ 现场办理散客入住"
    );
    return;
  }

  // 多个预订时让客人选择
  let selectedReservation: Reservation;
  if (reservations.length === 1) {
    selectedReservation = reservations[0];
  } else {
    let listMsg = `查到您有 ${reservations.length} 条预订记录：\n\n`;
    reservations.forEach((r, i) => {
      listMsg += `${i + 1}️⃣ 预订号: ${r.reservationId} | 房型: ${translateRoomType(r.roomType)} | ${r.checkInDate} ~ ${r.checkOutDate}\n`;
    });
    listMsg += "\n请输入序号选择：";
    await sendMessage(listMsg);
    const idx = parseInt(await waitForReply("请选择："), 10) - 1;
    if (idx < 0 || idx >= reservations.length) { await sendMessage("选择无效。"); return; }
    selectedReservation = reservations[idx];
  }

  await sendMessage(
    `✅ 预订确认：\n📋 ${selectedReservation.reservationId}\n🛏️ ${translateRoomType(selectedReservation.roomType)}\n📅 ${selectedReservation.checkInDate} ~ ${selectedReservation.checkOutDate}\n\n接下来进行身份验证：`
  );

  // Step 3: 身份证扫描
  await sendMessage("📋 请将身份证放置在前台扫描区域。");
  let idScanResult;
  try {
    idScanResult = await scanIdCard();
  } catch {
    await sendMessage("❌ 身份证读取失败，请重新放置。");
    try { idScanResult = await scanIdCard(); } catch { await sendMessage("请联系工作人员协助。"); return; }
  }
  if (!idScanResult.success) { await sendMessage("身份证信息读取异常。"); return; }
  if (idScanResult.name !== guestName) {
    await sendMessage(`⚠️ 身份证姓名（${idScanResult.name}）与预订姓名不一致，已通知值班经理。`);
    return;
  }
  await sendMessage("✅ 身份证读取成功！");

  // Step 4: 人脸识别
  await sendMessage("📷 请面向摄像头，进行人脸识别。");
  let faceResult;
  try { faceResult = await verifyFace(idScanResult.photoBase64); } catch { await sendMessage("人脸识别服务异常。"); return; }
  if (!faceResult.isMatch || !faceResult.liveDetection) {
    await sendMessage(`❌ 人脸验证未通过（匹配度 ${faceResult.matchScore}%）。请摘下帽子/墨镜后重试。`);
    return;
  }
  await sendMessage(`✅ 人脸验证通过！匹配度 ${faceResult.matchScore}%`);

  // Step 5: 分配房间 & 发放房卡
  await sendMessage("🏠 正在分配房间...");
  let room;
  try { room = await assignRoom(selectedReservation.roomType); } catch { await sendMessage("该房型暂无可用房间。"); return; }

  const roomCard = await issueRoomCard(room.roomNumber, guest.id, selectedReservation.checkOutDate);
  await updateRoomStatus(room.roomNumber, "occupied");

  // Step 6: 记录入住
  await createCheckInRecord({
    reservationId: selectedReservation.reservationId,
    guestId: guest.id, roomNumber: room.roomNumber, cardId: roomCard.cardId,
    idVerified: true, faceVerified: true, checkInTime: new Date().toISOString(), operatedBy: "agent:hotel-front-desk",
  });
  await updateReservationStatus(selectedReservation.reservationId, "checked_in");

  sessionMemory["currentGuest"] = guest;
  sessionMemory["currentRoom"] = room;
  sessionMemory["currentReservation"] = selectedReservation;
  sessionMemory["roomCard"] = roomCard;

  await sendMessage(
    `🎉 入住完成！\n\n👤 ${guest.name}\n🚪 房间 **${room.roomNumber}**（${room.floor}楼）\n🛏️ ${translateRoomType(room.type)}\n🔑 房卡号 ${roomCard.cardId}\n📅 离店 ${selectedReservation.checkOutDate}\n\n祝您入住愉快！🌟`
  );
}

function translateRoomType(type: string): string {
  return { standard: "标准间", deluxe: "豪华房", suite: "套房", presidential: "总统套房" }[type] || type;
}