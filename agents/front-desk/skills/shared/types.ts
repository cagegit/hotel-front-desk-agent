// =============================================
// 酒店 AI Agent 系统 — 公共类型定义
// =============================================

// ---- 客人相关 ----

export interface Guest {
    id: string;
    name: string;
    phone: string;
    idNumber: string;         // 身份证号 (脱敏存储)
    email?: string;
    vipLevel?: "normal" | "silver" | "gold" | "platinum";
    registeredAt: string;     // ISO 8601
}

export interface Reservation {
    reservationId: string;
    guestId: string;
    guestName: string;
    roomType: RoomType;
    checkInDate: string;      // YYYY-MM-DD
    checkOutDate: string;
    status: ReservationStatus;
    totalPrice: number;
    source: "online" | "phone" | "walk-in" | "ota";
    specialRequests?: string;
    createdAt: string;
}

export type ReservationStatus =
    | "confirmed"
    | "checked_in"
    | "checked_out"
    | "cancelled"
    | "no_show";

// ---- 房间相关 ----

export type RoomType = "standard" | "deluxe" | "suite" | "presidential";

export type RoomStatus =
    | "available"
    | "occupied"
    | "cleaning"
    | "maintenance"
    | "reserved";

export interface Room {
    roomNumber: string;
    floor: number;
    type: RoomType;
    status: RoomStatus;
    price: number;
    features: string[];       // 如: ["city-view", "balcony", "bathtub"]
}

export interface RoomCard {
    cardId: string;
    roomNumber: string;
    guestId: string;
    issuedAt: string;
    expiresAt: string;
    isActive: boolean;
}

// ---- 入住/退房记录 ----

export interface CheckInRecord {
    reservationId: string;
    guestId: string;
    roomNumber: string;
    cardId: string;
    idVerified: boolean;
    faceVerified: boolean;
    checkInTime: string;
    operatedBy: string;       // "agent:hotel-front-desk" 或员工ID
}

export interface CheckOutRecord {
    reservationId: string;
    guestId: string;
    roomNumber: string;
    cardId: string;
    checkOutTime: string;
    totalCharges: number;
    paidAmount: number;
    refundAmount: number;
    operatedBy: string;
}

// ---- 消费记录 ----

export interface ChargeItem {
    id: string;
    roomNumber: string;
    category: "room" | "minibar" | "restaurant" | "laundry" | "spa" | "damage" | "other";
    description: string;
    amount: number;
    chargedAt: string;
}

// ---- 客房服务 ----

export type ServiceType = "cleaning" | "repair" | "dining" | "supplies" | "complaint" | "other";

export type ServicePriority = "low" | "normal" | "high" | "urgent";

export type ServiceOrderStatus =
    | "pending"
    | "assigned"
    | "in_progress"
    | "completed"
    | "cancelled";

export interface ServiceOrder {
    orderId: string;
    roomNumber: string;
    guestName: string;
    serviceType: ServiceType;
    priority: ServicePriority;
    description: string;
    status: ServiceOrderStatus;
    assignedTo?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

// ---- 身份验证 ----

export interface IdScanResult {
    success: boolean;
    name: string;
    idNumber: string;
    gender: "male" | "female";
    birthDate: string;
    address: string;
    photoBase64: string;
    expiryDate: string;
}

export interface FaceVerifyResult {
    isMatch: boolean;
    matchScore: number;       // 0-100
    liveDetection: boolean;   // 活体检测
    capturedPhotoBase64: string;
}

// ---- 视觉管道 ----

export interface DetectionResult {
    personDetected: boolean;
    faceDetected: boolean;
    faceCount: number;
    knownGuest?: Guest;       // 已注册客人
    timestamp: string;
    frameBase64?: string;
}

// ---- Agent 间通信 ----

export type AgentMessageType = "notification" | "command" | "query" | "response";

export interface AgentMessage {
    id: string;
    from: "front-desk" | "manager";
    to: "front-desk" | "manager";
    type: AgentMessageType;
    action: string;
    payload: Record<string, unknown>;
    timestamp: string;
    replyTo?: string;         // 回复的消息 ID
}
