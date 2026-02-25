// =============================================
// 钉钉卡片消息构建器
// =============================================

/**
 * 构建经营数据卡片
 */
export function buildReportCard(data: {
    date: string;
    occupancyRate: number;
    totalRooms: number;
    occupiedRooms: number;
    revenue: number;
    adr: number;
    revPar: number;
    checkIns: number;
    checkOuts: number;
}): string {
    const bar = buildProgressBar(data.occupancyRate);

    return [
        `📊 **${data.date} 经营数据**`,
        "",
        `🏨 入住率: ${bar} ${data.occupancyRate.toFixed(1)}%`,
        `🚪 房间: ${data.occupiedRooms} / ${data.totalRooms} (空房 ${data.totalRooms - data.occupiedRooms})`,
        `💰 今日收入: ¥${data.revenue.toLocaleString()}`,
        `📈 ADR: ¥${data.adr.toFixed(0)}`,
        `📊 RevPAR: ¥${data.revPar.toFixed(0)}`,
        "",
        `⬆️ 今日入住: ${data.checkIns} 间`,
        `⬇️ 今日退房: ${data.checkOuts} 间`,
    ].join("\n");
}

/**
 * 构建房价变更确认卡片
 */
export function buildPriceChangeCard(changes: Array<{
    roomType: string;
    oldPrice: number;
    newPrice: number;
}>): string {
    let msg = "🔔 **房价调整确认**\n\n";

    for (const c of changes) {
        const diff = c.newPrice - c.oldPrice;
        const arrow = diff > 0 ? "📈" : "📉";
        const sign = diff > 0 ? "+" : "";
        msg += `${arrow} ${translateRoomType(c.roomType)}: ¥${c.oldPrice} → ¥${c.newPrice} (${sign}${diff})\n`;
    }

    msg += "\n确认执行？";
    return msg;
}

/**
 * 构建活动列表卡片
 */
export function buildPromotionListCard(promotions: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    status: string;
    startDate: string;
    endDate: string;
}>): string {
    if (promotions.length === 0) return "📋 当前没有进行中的促销活动。";

    let msg = "🎉 **当前促销活动**\n\n";
    for (const p of promotions) {
        const statusIcon = p.status === "active" ? "🟢" : p.status === "paused" ? "🟡" : "🔴";
        msg += `${statusIcon} **${p.name}**\n`;
        msg += `   ${p.description}\n`;
        msg += `   📅 ${p.startDate} ~ ${p.endDate}\n\n`;
    }

    return msg;
}

/**
 * 构建工单/任务卡片
 */
export function buildTaskCard(task: {
    taskId: string;
    title: string;
    department: string;
    priority: string;
    assignedToName?: string;
    status: string;
    relatedRoom?: string;
}): string {
    const priorityIcon = { low: "🔵", normal: "🟢", high: "🟠", urgent: "🔴" }[task.priority] || "⚪";

    return [
        `${priorityIcon} **工单 ${task.taskId}**`,
        "",
        `📋 ${task.title}`,
        `🏢 部门: ${translateDepartment(task.department)}`,
        task.assignedToName ? `👤 负责人: ${task.assignedToName}` : "👤 待分配",
        task.relatedRoom ? `🚪 房间: ${task.relatedRoom}` : "",
        `📌 状态: ${translateStatus(task.status)}`,
    ].filter(Boolean).join("\n");
}

/**
 * 构建问题/投诉卡片
 */
export function buildIssueCard(issue: {
    issueId: string;
    roomNumber: string;
    guestName: string;
    category: string;
    description: string;
    severity: string;
    status: string;
}): string {
    const severityIcon = { low: "🔵", medium: "🟡", high: "🟠", critical: "🔴" }[issue.severity] || "⚪";

    return [
        `${severityIcon} **投诉 ${issue.issueId}**`,
        "",
        `🚪 房间: ${issue.roomNumber}`,
        `👤 客人: ${issue.guestName}`,
        `🏷️ 类别: ${issue.category}`,
        `📝 ${issue.description}`,
        `📌 状态: ${translateStatus(issue.status)}`,
    ].join("\n");
}

// ---- 辅助函数 ----

function buildProgressBar(percent: number, length = 10): string {
    const filled = Math.round((percent / 100) * length);
    return "█".repeat(filled) + "░".repeat(length - filled);
}

function translateRoomType(type: string): string {
    return { standard: "标准间", deluxe: "豪华房", suite: "套房", presidential: "总统套房" }[type] || type;
}

function translateDepartment(dept: string): string {
    return {
        front_office: "前厅部", housekeeping: "客房部", engineering: "工程部",
        food_beverage: "餐饮部", security: "安保部", management: "管理层",
    }[dept] || dept;
}

function translateStatus(status: string): string {
    return {
        pending: "⏳ 待处理", assigned: "👤 已分配", in_progress: "🔄 处理中",
        completed: "✅ 已完成", cancelled: "❌ 已取消",
        open: "🔴 待处理", resolved: "✅ 已解决", closed: "📁 已关闭",
    }[status] || status;
}
