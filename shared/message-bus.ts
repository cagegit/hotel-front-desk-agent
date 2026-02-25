// =============================================
// Agent 间消息总线
// 基于 OpenClaw sessions_send / sessions_list 封装
// =============================================

import type { AgentMessage } from "../agents/front-desk/skills/shared/types.js";

/**
 * Agent 间消息总线
 *
 * OpenClaw 原生提供了 sessions_* 系列工具用于 Agent 间通信:
 * - sessions_list  — 发现活跃的 Agent 会话
 * - sessions_send  — 向指定 Agent 发送消息
 * - sessions_history — 获取 Agent 通信历史
 *
 * 本模块在其基础上提供:
 * 1. 标准化的消息格式
 * 2. 常用通知方法的快捷封装
 * 3. 消息日志记录
 */

let messageCounter = 0;

/**
 * 创建标准化的 Agent 消息
 */
export function createMessage(
    from: "front-desk" | "manager",
    to: "front-desk" | "manager",
    type: AgentMessage["type"],
    action: string,
    payload: Record<string, unknown>,
    replyTo?: string,
): AgentMessage {
    messageCounter++;
    return {
        id: `MSG-${Date.now()}-${messageCounter}`,
        from,
        to,
        type,
        action,
        payload,
        timestamp: new Date().toISOString(),
        replyTo,
    };
}

// ---- 前台 → 经理 快捷方法 ----

/** 上报客户投诉 */
export function createComplaintEscalation(payload: {
    roomNumber: string;
    guestName: string;
    description: string;
    severity: string;
}): AgentMessage {
    return createMessage("front-desk", "manager", "notification", "complaint_escalation", payload);
}

/** 上报服务工单 */
export function createServiceOrderNotification(payload: {
    orderId: string;
    roomNumber: string;
    serviceType: string;
    priority: string;
    description: string;
}): AgentMessage {
    return createMessage("front-desk", "manager", "notification", "service_order_created", payload);
}

/** 请求经理审批 */
export function createApprovalRequest(payload: {
    type: string;
    description: string;
    amount?: number;
}): AgentMessage {
    return createMessage("front-desk", "manager", "query", "approval_request", payload);
}

// ---- 经理 → 前台 快捷方法 ----

/** 价格更新通知 */
export function createPriceUpdate(payload: {
    changes: Array<{ roomType: string; newPrice: number }>;
}): AgentMessage {
    return createMessage("manager", "front-desk", "command", "price_updated", payload);
}

/** 活动变更通知 */
export function createPromotionUpdate(payload: {
    promotionId: string;
    action: "created" | "updated" | "paused" | "deleted";
    promotion?: Record<string, unknown>;
}): AgentMessage {
    return createMessage("manager", "front-desk", "command", "promotion_updated", payload);
}

/** 客人通知 (经理要求前台转告客人) */
export function createGuestNotification(payload: {
    roomNumber: string;
    message: string;
}): AgentMessage {
    return createMessage("manager", "front-desk", "command", "notify_guest", payload);
}

/** 问题处理进度更新 */
export function createIssueStatusUpdate(payload: {
    issueId: string;
    newStatus: string;
    resolution?: string;
}): AgentMessage {
    return createMessage("manager", "front-desk", "notification", "issue_status_updated", payload);
}

// ---- 消息日志 ----

const messageLog: AgentMessage[] = [];

/** 记录消息到日志 */
export function logMessage(msg: AgentMessage): void {
    messageLog.push(msg);
    // 保持最近 1000 条
    if (messageLog.length > 1000) messageLog.splice(0, messageLog.length - 1000);
}

/** 获取最近的消息日志 */
export function getRecentMessages(count = 20): AgentMessage[] {
    return messageLog.slice(-count);
}
