// =============================================
// 房间管理 & 房卡管理
// 支持 mock 模式用于本地开发
// =============================================

import type { Room, RoomCard, RoomStatus, RoomType } from "./types.js";

const USE_MOCK = process.env.MOCK_PMS === "true";
const PMS_API_URL = process.env.HOTEL_PMS_API_URL || "http://localhost:8080/api";
const PMS_API_KEY = process.env.HOTEL_PMS_API_KEY || "";

// ---- Mock 数据 ----

const mockRooms: Room[] = [
    // 标准间
    { roomNumber: "1201", floor: 12, type: "standard", status: "available", price: 388, features: ["city-view"] },
    { roomNumber: "1202", floor: 12, type: "standard", status: "available", price: 388, features: ["garden-view"] },
    { roomNumber: "1203", floor: 12, type: "standard", status: "occupied", price: 388, features: ["city-view"] },
    // 豪华房
    { roomNumber: "1205", floor: 12, type: "deluxe", status: "available", price: 560, features: ["city-view", "balcony"] },
    { roomNumber: "1208", floor: 12, type: "deluxe", status: "available", price: 560, features: ["lake-view", "bathtub"] },
    { roomNumber: "1210", floor: 12, type: "deluxe", status: "cleaning", price: 560, features: ["city-view", "balcony"] },
    // 套房
    { roomNumber: "1501", floor: 15, type: "suite", status: "available", price: 1280, features: ["lake-view", "living-room", "bathtub"] },
    { roomNumber: "1502", floor: 15, type: "suite", status: "occupied", price: 1280, features: ["city-view", "living-room"] },
    // 总统套房
    { roomNumber: "1801", floor: 18, type: "presidential", status: "available", price: 3880, features: ["panorama", "living-room", "study", "jacuzzi"] },
];

let cardCounter = 1000;

// ---- API 函数 ----

/**
 * 分配一间指定房型的可用房间
 */
export async function assignRoom(roomType: RoomType): Promise<Room> {
    if (USE_MOCK) {
        const room = mockRooms.find((r) => r.type === roomType && r.status === "available");
        if (!room) throw new Error(`No available ${roomType} room`);
        return room;
    }

    const res = await fetch(`${PMS_API_URL}/rooms/assign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${PMS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ roomType }),
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
    return res.json() as Promise<Room>;
}

/**
 * 更新房间状态
 */
export async function updateRoomStatus(roomNumber: string, status: RoomStatus): Promise<void> {
    if (USE_MOCK) {
        const room = mockRooms.find((r) => r.roomNumber === roomNumber);
        if (room) room.status = status;
        console.log(`[Mock PMS] Room ${roomNumber} → ${status}`);
        return;
    }

    const res = await fetch(`${PMS_API_URL}/rooms/${roomNumber}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${PMS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
}

/**
 * 发放房卡
 */
export async function issueRoomCard(
    roomNumber: string,
    guestId: string,
    expiresAt: string,
): Promise<RoomCard> {
    if (USE_MOCK) {
        cardCounter++;
        const card: RoomCard = {
            cardId: `CARD-${cardCounter}`,
            roomNumber,
            guestId,
            issuedAt: new Date().toISOString(),
            expiresAt,
            isActive: true,
        };
        console.log(`[Mock PMS] Room card issued: ${card.cardId} for room ${roomNumber}`);
        return card;
    }

    const res = await fetch(`${PMS_API_URL}/room-cards`, {
        method: "POST",
        headers: { Authorization: `Bearer ${PMS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ roomNumber, guestId, expiresAt }),
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
    return res.json() as Promise<RoomCard>;
}

/**
 * 注销房卡
 */
export async function revokeRoomCard(cardId: string): Promise<void> {
    if (USE_MOCK) {
        console.log(`[Mock PMS] Room card revoked: ${cardId}`);
        return;
    }

    const res = await fetch(`${PMS_API_URL}/room-cards/${cardId}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${PMS_API_KEY}` },
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
}

/**
 * 查询所有房间状态
 */
export async function getAllRooms(): Promise<Room[]> {
    if (USE_MOCK) return mockRooms;

    const res = await fetch(`${PMS_API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${PMS_API_KEY}` },
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
    return res.json() as Promise<Room[]>;
}

/**
 * 查询房间可用数 (按房型)
 */
export async function getAvailability(): Promise<Record<RoomType, { total: number; available: number }>> {
    const rooms = await getAllRooms();
    const result: Record<string, { total: number; available: number }> = {};

    for (const room of rooms) {
        if (!result[room.type]) result[room.type] = { total: 0, available: 0 };
        result[room.type].total++;
        if (room.status === "available") result[room.type].available++;
    }

    return result as Record<RoomType, { total: number; available: number }>;
}

/**
 * 按房型更新价格
 */
export async function updateRoomPrice(roomType: RoomType, newPrice: number): Promise<void> {
    if (USE_MOCK) {
        for (const room of mockRooms) {
            if (room.type === roomType) room.price = newPrice;
        }
        console.log(`[Mock PMS] ${roomType} price → ¥${newPrice}`);
        return;
    }

    const res = await fetch(`${PMS_API_URL}/rooms/price`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${PMS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ roomType, price: newPrice }),
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
}
