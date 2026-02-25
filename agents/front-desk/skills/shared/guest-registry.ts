// =============================================
// 酒店登记系统 API (Hotel PMS 客户端)
// 支持 mock 模式用于本地开发
// =============================================

import type { Guest, Reservation, ReservationStatus, CheckInRecord, CheckOutRecord, ChargeItem } from "./types.js";

const PMS_API_URL = process.env.HOTEL_PMS_API_URL || "http://localhost:8080/api";
const PMS_API_KEY = process.env.HOTEL_PMS_API_KEY || "";
const USE_MOCK = process.env.MOCK_PMS === "true";

// ---- Mock 数据 ----

const mockGuests: Guest[] = [
    {
        id: "G001", name: "张伟", phone: "13800138001", idNumber: "110***1234",
        vipLevel: "gold", registeredAt: "2025-06-15T10:00:00Z",
    },
    {
        id: "G002", name: "李娟", phone: "13900139002", idNumber: "310***5678",
        vipLevel: "normal", registeredAt: "2025-11-20T14:00:00Z",
    },
    {
        id: "G003", name: "王磊", phone: "13700137003", idNumber: "440***9012",
        vipLevel: "silver", registeredAt: "2026-01-10T08:00:00Z",
    },
];

const mockReservations: Reservation[] = [
    {
        reservationId: "RSV-20260225-001", guestId: "G001", guestName: "张伟",
        roomType: "deluxe", checkInDate: "2026-02-25", checkOutDate: "2026-02-28",
        status: "confirmed", totalPrice: 1680, source: "online",
        specialRequests: "高层，远离电梯", createdAt: "2026-02-20T12:00:00Z",
    },
    {
        reservationId: "RSV-20260225-002", guestId: "G002", guestName: "李娟",
        roomType: "standard", checkInDate: "2026-02-25", checkOutDate: "2026-02-26",
        status: "confirmed", totalPrice: 388, source: "ota",
        createdAt: "2026-02-24T18:00:00Z",
    },
    {
        reservationId: "RSV-20260226-001", guestId: "G003", guestName: "王磊",
        roomType: "suite", checkInDate: "2026-02-26", checkOutDate: "2026-03-01",
        status: "confirmed", totalPrice: 4760, source: "phone",
        specialRequests: "需要婴儿床", createdAt: "2026-02-22T09:00:00Z",
    },
];

const mockCharges: ChargeItem[] = [];

// ---- API 函数 ----

export async function queryReservationByName(name: string): Promise<{
    guest: Guest | null;
    reservations: Reservation[];
}> {
    if (USE_MOCK) {
        const guest = mockGuests.find((g) => g.name === name) || null;
        const reservations = guest
            ? mockReservations.filter((r) => r.guestId === guest.id && r.status === "confirmed")
            : [];
        return { guest, reservations };
    }

    const res = await fetch(`${PMS_API_URL}/reservations?guestName=${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${PMS_API_KEY}` },
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
    return res.json() as Promise<{ guest: Guest | null; reservations: Reservation[] }>;
}

export async function queryReservationById(reservationId: string): Promise<Reservation | null> {
    if (USE_MOCK) {
        return mockReservations.find((r) => r.reservationId === reservationId) || null;
    }

    const res = await fetch(`${PMS_API_URL}/reservations/${reservationId}`, {
        headers: { Authorization: `Bearer ${PMS_API_KEY}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
    return res.json() as Promise<Reservation>;
}

export async function createCheckInRecord(record: CheckInRecord): Promise<void> {
    if (USE_MOCK) {
        console.log(`[Mock PMS] Check-in recorded: Room ${record.roomNumber}, Guest ${record.guestId}`);
        return;
    }

    const res = await fetch(`${PMS_API_URL}/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${PMS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
}

export async function createCheckOutRecord(record: CheckOutRecord): Promise<void> {
    if (USE_MOCK) {
        console.log(`[Mock PMS] Check-out recorded: Room ${record.roomNumber}, Guest ${record.guestId}`);
        return;
    }

    const res = await fetch(`${PMS_API_URL}/check-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${PMS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
}

export async function updateReservationStatus(
    reservationId: string,
    status: ReservationStatus,
): Promise<void> {
    if (USE_MOCK) {
        const rsv = mockReservations.find((r) => r.reservationId === reservationId);
        if (rsv) rsv.status = status;
        console.log(`[Mock PMS] Reservation ${reservationId} → ${status}`);
        return;
    }

    const res = await fetch(`${PMS_API_URL}/reservations/${reservationId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${PMS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
}

export async function getChargesByRoom(roomNumber: string): Promise<ChargeItem[]> {
    if (USE_MOCK) {
        return mockCharges.filter((c) => c.roomNumber === roomNumber);
    }

    const res = await fetch(`${PMS_API_URL}/charges?room=${roomNumber}`, {
        headers: { Authorization: `Bearer ${PMS_API_KEY}` },
    });
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
    return res.json() as Promise<ChargeItem[]>;
}

export async function getGuestByRoom(roomNumber: string): Promise<{
    guest: Guest;
    reservation: Reservation;
    roomCard: { cardId: string };
} | null> {
    if (USE_MOCK) {
        const rsv = mockReservations.find(
            (r) => r.status === "checked_in",
        );
        if (!rsv) return null;
        const guest = mockGuests.find((g) => g.id === rsv.guestId);
        if (!guest) return null;
        return { guest, reservation: rsv, roomCard: { cardId: `CARD-${roomNumber}` } };
    }

    const res = await fetch(`${PMS_API_URL}/rooms/${roomNumber}/guest`, {
        headers: { Authorization: `Bearer ${PMS_API_KEY}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`PMS API error: ${res.status}`);
    return res.json() as Promise<{ guest: Guest; reservation: Reservation; roomCard: { cardId: string } }>;
}
