// =============================================
// 技能：问题处理 (Issue Handling)
// 客户反馈查看/分配/解决/统计
// =============================================

import { checkPermission, getUserByName } from "./shared/permission.js";
import { buildIssueCard } from "./shared/card-builder.js";
import { sendDirectMessage } from "./shared/dingtalk-client.js";
import type { CustomerIssue, IssueSeverity, IssueStatus } from "./shared/types.js";

export const metadata = {
    name: "hotel-issue-handling",
    description: "管理客户投诉和反馈：查看、分配、解决、统计",
    triggers: [
        "投诉", "问题", "反馈", "客户反馈", "处理投诉",
        "待处理", "客户问题",
    ],
};

let issueCounter = 890;

// Mock 问题数据
const issues: CustomerIssue[] = [
    {
        issueId: "ISS-0891", roomNumber: "1203", guestName: "刘先生",
        category: "设施", description: "空调不制热，已维修但效果不好",
        severity: "high", status: "assigned", assignedTo: "U005", assignedToName: "刘工",
        createdAt: "2026-02-25T09:00:00Z", updatedAt: "2026-02-25T11:00:00Z",
    },
    {
        issueId: "ISS-0892", roomNumber: "1501", guestName: "陈女士",
        category: "噪音", description: "隔壁房间深夜噪音扰民",
        severity: "medium", status: "open",
        createdAt: "2026-02-25T08:30:00Z", updatedAt: "2026-02-25T08:30:00Z",
    },
];

export async function execute(context: {
    sendMessage: (msg: string) => Promise<void>;
    waitForReply: (prompt: string, timeoutMs?: number) => Promise<string>;
    sessionMemory: Record<string, unknown>;
    senderInfo?: { userId: string; name: string };
}) {
    const { sendMessage, waitForReply } = context;
    const senderId = context.senderInfo?.userId || "U003";

    const permCheck = checkPermission(senderId, "issue.view");
    if (!permCheck.allowed) { await sendMessage(permCheck.message!); return; }

    // 统计总览
    const open = issues.filter((i) => i.status === "open").length;
    const assigned = issues.filter((i) => i.status === "assigned" || i.status === "in_progress").length;
    const resolved = issues.filter((i) => i.status === "resolved" || i.status === "closed").length;

    await sendMessage(
        `🔔 **客户问题管理**\n\n` +
        `🔴 待处理: ${open} | 🔄 处理中: ${assigned} | ✅ 已解决: ${resolved}\n\n` +
        "1️⃣ 查看待处理问题\n" +
        "2️⃣ 分配问题给处理人\n" +
        "3️⃣ 标记问题已解决\n" +
        "4️⃣ 问题统计总览\n" +
        "5️⃣ 返回"
    );
    const choice = (await waitForReply("选择：")).trim();

    // ---- 查看待处理 ----
    if (choice === "1" || choice.includes("查看") || choice.includes("待处理")) {
        const openIssues = issues.filter((i) => i.status === "open" || i.status === "assigned" || i.status === "in_progress");

        if (openIssues.length === 0) {
            await sendMessage("🎉 所有问题已处理完毕！");
            return;
        }

        let msg = `📋 **待处理问题 (${openIssues.length})**\n\n`;
        for (const issue of openIssues) {
            msg += buildIssueCard(issue) + "\n\n---\n\n";
        }
        await sendMessage(msg);
    }

    // ---- 分配问题 ----
    else if (choice === "2" || choice.includes("分配")) {
        const assignCheck = checkPermission(senderId, "issue.assign");
        if (!assignCheck.allowed) { await sendMessage(assignCheck.message!); return; }

        const unassigned = issues.filter((i) => i.status === "open");
        if (unassigned.length === 0) { await sendMessage("当前没有待分配的问题。"); return; }

        let listMsg = "待分配问题：\n\n";
        for (const i of unassigned) {
            listMsg += `🔹 ${i.issueId}: 房${i.roomNumber} - ${i.description.slice(0, 30)}\n`;
        }
        listMsg += "\n请输入：`问题ID 负责人姓名`";
        await sendMessage(listMsg);

        const input = (await waitForReply("分配：")).trim().split(/\s+/);
        const issueId = input[0];
        const staffName = input[1];

        const issue = issues.find((i) => i.issueId === issueId);
        const staff = getUserByName(staffName || "");

        if (!issue) { await sendMessage("❌ 未找到该问题。"); return; }
        if (!staff) { await sendMessage("❌ 未找到该员工。"); return; }

        issue.assignedTo = staff.userId;
        issue.assignedToName = staff.name;
        issue.status = "assigned";
        issue.updatedAt = new Date().toISOString();

        await sendDirectMessage(staff.userId,
            `🔔 问题分配\n\n${issue.issueId}: 房${issue.roomNumber}\n${issue.description}\n严重程度: ${translateSeverity(issue.severity)}`
        );

        await sendMessage(`✅ 问题 ${issue.issueId} 已分配给 ${staff.name}，钉钉通知已发送。`);
    }

    // ---- 标记解决 ----
    else if (choice === "3" || choice.includes("解决") || choice.includes("标记")) {
        const resolveCheck = checkPermission(senderId, "issue.resolve");
        if (!resolveCheck.allowed) { await sendMessage(resolveCheck.message!); return; }

        const activeIssues = issues.filter((i) => ["open", "assigned", "in_progress"].includes(i.status));
        if (activeIssues.length === 0) { await sendMessage("没有待解决的问题。"); return; }

        let listMsg = "进行中的问题：\n\n";
        for (const i of activeIssues) {
            listMsg += `🔹 ${i.issueId}: 房${i.roomNumber} - ${i.description.slice(0, 30)}\n`;
        }
        listMsg += "\n请输入问题 ID：";
        await sendMessage(listMsg);

        const issueId = (await waitForReply("问题ID：")).trim();
        const issue = issues.find((i) => i.issueId === issueId);

        if (!issue) { await sendMessage("❌ 未找到该问题。"); return; }

        await sendMessage("请描述解决方案：");
        const resolution = (await waitForReply("解决方案：")).trim();

        issue.status = "resolved";
        issue.resolution = resolution;
        issue.resolvedAt = new Date().toISOString();
        issue.updatedAt = new Date().toISOString();

        await sendMessage(
            `✅ 问题 ${issue.issueId} 已标记解决\n\n` +
            `🚪 房间: ${issue.roomNumber}\n` +
            `👤 客人: ${issue.guestName}\n` +
            `📝 解决方案: ${resolution}\n\n` +
            `已通知前台 Agent 跟进客人满意度。`
        );
    }

    // ---- 统计总览 ----
    else if (choice === "4" || choice.includes("统计")) {
        const total = issues.length;
        const bySeverity = {
            critical: issues.filter((i) => i.severity === "critical").length,
            high: issues.filter((i) => i.severity === "high").length,
            medium: issues.filter((i) => i.severity === "medium").length,
            low: issues.filter((i) => i.severity === "low").length,
        };

        const byCategory: Record<string, number> = {};
        for (const i of issues) {
            byCategory[i.category] = (byCategory[i.category] || 0) + 1;
        }

        let statMsg = `📊 **问题统计**\n\n`;
        statMsg += `总问题数: ${total}\n\n`;
        statMsg += "**按严重程度**\n";
        statMsg += `🔴 紧急: ${bySeverity.critical} | 🟠 高: ${bySeverity.high} | 🟡 中: ${bySeverity.medium} | 🔵 低: ${bySeverity.low}\n\n`;
        statMsg += "**按类别**\n";
        for (const [cat, count] of Object.entries(byCategory)) {
            statMsg += `• ${cat}: ${count}\n`;
        }
        statMsg += `\n✅ 解决率: ${total > 0 ? ((resolved / total) * 100).toFixed(0) : 0}%`;

        await sendMessage(statMsg);
    }
}

function translateSeverity(severity: IssueSeverity): string {
    return { low: "🔵 低", medium: "🟡 中", high: "🟠 高", critical: "🔴 紧急" }[severity];
}
