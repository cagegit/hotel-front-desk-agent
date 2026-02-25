// =============================================
// 经理 Agent — 类型定义
// =============================================

// ---- 权限相关 ----

export type UserRole = "boss" | "general_manager" | "operations_manager" | "department_head" | "staff";

export interface DingTalkUser {
    userId: string;
    name: string;
    role: UserRole;
    department: Department;
    phone: string;
}

export type Department = "front_office" | "housekeeping" | "engineering" | "food_beverage" | "security" | "management";

// ---- 房价管理 ----

export interface PriceChange {
    roomType: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    changedBy: string;
    changedAt: string;
    effectiveDate?: string;
    reason?: string;
}

export interface SpecialDatePrice {
    date: string;
    roomType: string;
    price: number;
    label: string;       // 如: "春节", "周末"
}

// ---- 促销活动 ----

export type PromotionType = "discount" | "reduction" | "stay_free" | "upgrade";
export type PromotionStatus = "active" | "paused" | "expired" | "deleted";

export interface Promotion {
    id: string;
    name: string;
    type: PromotionType;
    description: string;
    discount?: number;          // 折扣率 (如 0.85 = 8.5折)
    reduction?: number;         // 立减金额
    stayNights?: number;        // 连住N晚
    freeNights?: number;        // 免费N晚
    upgradeFrom?: string;       // 升级来源房型
    upgradeTo?: string;         // 升级目标房型
    startDate: string;
    endDate: string;
    status: PromotionStatus;
    applicableRoomTypes: string[];
    createdBy: string;
    createdAt: string;
}

// ---- 经营报表 ----

export interface DailyReport {
    date: string;
    totalRooms: number;
    occupiedRooms: number;
    occupancyRate: number;      // 入住率 (0-100)
    revenue: number;            // 营收
    adr: number;                // 平均每日房价 (Average Daily Rate)
    revPar: number;             // 每可用房收入 (Revenue Per Available Room)
    checkIns: number;
    checkOuts: number;
    newReservations: number;
    cancellations: number;
    roomBreakdown: Record<string, {
        total: number;
        occupied: number;
        revenue: number;
    }>;
}

// ---- 人员调度 ----

export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface StaffTask {
    taskId: string;
    title: string;
    description: string;
    department: Department;
    assignedTo?: string;
    assignedToName?: string;
    priority: TaskPriority;
    status: TaskStatus;
    relatedRoom?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

// ---- 问题处理 ----

export type IssueStatus = "open" | "assigned" | "in_progress" | "resolved" | "closed";
export type IssueSeverity = "low" | "medium" | "high" | "critical";

export interface CustomerIssue {
    issueId: string;
    roomNumber: string;
    guestName: string;
    category: string;
    description: string;
    severity: IssueSeverity;
    status: IssueStatus;
    assignedTo?: string;
    assignedToName?: string;
    resolution?: string;
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string;
}
