// =============================================
// 权限控制 — 基于角色的权限矩阵
// =============================================

import type { UserRole, DingTalkUser } from "./types.js";

// ---- 权限矩阵 ----

type PermissionAction =
    | "price.view" | "price.modify"
    | "promotion.view" | "promotion.create" | "promotion.modify" | "promotion.delete"
    | "report.daily" | "report.weekly" | "report.monthly" | "report.department"
    | "staff.assign" | "staff.view_all" | "staff.view_own"
    | "issue.view" | "issue.assign" | "issue.resolve";

const PERMISSION_MATRIX: Record<UserRole, PermissionAction[]> = {
    boss: [
        "price.view", "price.modify",
        "promotion.view", "promotion.create", "promotion.modify", "promotion.delete",
        "report.daily", "report.weekly", "report.monthly", "report.department",
        "staff.assign", "staff.view_all",
        "issue.view", "issue.assign", "issue.resolve",
    ],
    general_manager: [
        "price.view", "price.modify",
        "promotion.view", "promotion.create", "promotion.modify", "promotion.delete",
        "report.daily", "report.weekly", "report.monthly", "report.department",
        "staff.assign", "staff.view_all",
        "issue.view", "issue.assign", "issue.resolve",
    ],
    operations_manager: [
        "price.view",
        "promotion.view", "promotion.create", "promotion.modify",
        "report.daily", "report.weekly",
        "staff.assign", "staff.view_all",
        "issue.view", "issue.assign",
    ],
    department_head: [
        "price.view",
        "promotion.view",
        "report.department",
        "staff.assign", "staff.view_all",
        "issue.view", "issue.resolve",
    ],
    staff: [
        "staff.view_own",
        "issue.resolve",
    ],
};

// ---- Mock 用户数据 ----

const mockUsers: DingTalkUser[] = [
    { userId: "U001", name: "张老板", role: "boss", department: "management", phone: "13800000001" },
    { userId: "U002", name: "王总", role: "general_manager", department: "management", phone: "13800000002" },
    { userId: "U003", name: "李经理", role: "operations_manager", department: "management", phone: "13800000003" },
    { userId: "U004", name: "赵主管", role: "department_head", department: "housekeeping", phone: "13800000004" },
    { userId: "U005", name: "刘工", role: "department_head", department: "engineering", phone: "13800000005" },
    { userId: "U006", name: "陈师傅", role: "staff", department: "engineering", phone: "13800000006" },
    { userId: "U007", name: "小张", role: "staff", department: "housekeeping", phone: "13800000007" },
    { userId: "U008", name: "小王", role: "staff", department: "food_beverage", phone: "13800000008" },
    { userId: "U009", name: "保安老孙", role: "staff", department: "security", phone: "13800000009" },
];

// ---- API 函数 ----

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(userId: string, action: PermissionAction): boolean {
    const user = getUserById(userId);
    if (!user) return false;
    return PERMISSION_MATRIX[user.role]?.includes(action) || false;
}

/**
 * 检查权限并返回用户友好的拒绝消息
 */
export function checkPermission(userId: string, action: PermissionAction): {
    allowed: boolean;
    message?: string;
} {
    const user = getUserById(userId);
    if (!user) {
        return { allowed: false, message: "⚠️ 未识别您的身份，请联系管理员。" };
    }

    if (hasPermission(userId, action)) {
        return { allowed: true };
    }

    const roleNames: Record<UserRole, string> = {
        boss: "老板", general_manager: "总经理", operations_manager: "运营经理",
        department_head: "部门主管", staff: "员工",
    };

    return {
        allowed: false,
        message: `🔒 抱歉，${roleNames[user.role]}角色暂无此操作权限。请联系上级管理人员。`,
    };
}

/**
 * 根据用户 ID 获取用户信息
 */
export function getUserById(userId: string): DingTalkUser | undefined {
    return mockUsers.find((u) => u.userId === userId);
}

/**
 * 根据用户名获取用户信息（用于从钉钉消息中匹配）
 */
export function getUserByName(name: string): DingTalkUser | undefined {
    return mockUsers.find((u) => u.name === name || u.name.includes(name));
}

/**
 * 获取指定部门的所有成员
 */
export function getStaffByDepartment(department: string): DingTalkUser[] {
    return mockUsers.filter((u) => u.department === department);
}

/**
 * 获取所有用户列表
 */
export function getAllUsers(): DingTalkUser[] {
    return mockUsers;
}

/**
 * 翻译角色名称
 */
export function translateRole(role: UserRole): string {
    return {
        boss: "👑 老板", general_manager: "🏢 总经理", operations_manager: "📊 运营经理",
        department_head: "👥 部门主管", staff: "👤 员工",
    }[role];
}

/**
 * 翻译部门名称
 */
export function translateDepartment(dept: string): string {
    return {
        front_office: "前厅部", housekeeping: "客房部", engineering: "工程部",
        food_beverage: "餐饮部", security: "安保部", management: "管理层",
    }[dept] || dept;
}

/**
 * 检查大幅调价是否需要老板权限
 */
export function requiresBossForPriceChange(changePercent: number): boolean {
    return Math.abs(changePercent) > 20;
}
