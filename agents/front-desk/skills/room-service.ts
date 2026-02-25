// =============================================
// 技能：客房服务 (Room Service)
// 流程：接收请求 → 识别类型 → 创建工单 → 通知经理Agent → 跟踪进度
// =============================================

import type { ServiceOrder, ServiceType, ServicePriority } from "./shared/types.js";

export const metadata = {
    name: "hotel-room-service",
    description: "响应客户客房呼叫，创建服务工单并通知相关人员",
    triggers: [
        "客房服务", "room service", "打扫", "清洁", "维修",
        "送餐", "需要毛巾", "空调", "热水", "噪音", "投诉",
    ],
    requiredTools: ["guest-registry", "sessions_send"],
};

const USE_MOCK = process.env.MOCK_PMS === "true";
const PMS_API_URL = process.env.HOTEL_PMS_API_URL || "http://localhost:8080/api";
const PMS_API_KEY = process.env.HOTEL_PMS_API_KEY || "";

let orderCounter = 800;

export async function execute(context: {
    sendMessage: (msg: string) => Promise<void>;
    waitForReply: (prompt: string, timeoutMs?: number) => Promise<string>;
    sessionMemory: Record<string, unknown>;
    tools?: {
        sessions_send?: (params: {
            sessionKey: string;
            message: string;
        }) => Promise<unknown>;
    };
}) {
    const { sendMessage, waitForReply, sessionMemory } = context;

    // Step 1: 确认房间号
    const currentRoom = sessionMemory["currentRoom"] as { roomNumber: string } | undefined;
    let roomNumber: string;

    if (currentRoom) {
        roomNumber = currentRoom.roomNumber;
        await sendMessage(`🏨 ${roomNumber} 房间的客人您好！请问需要什么服务？`);
    } else {
        await sendMessage("🏨 您好！请问您的房间号是多少？");
        roomNumber = (await waitForReply("房间号：")).trim();
    }

    // Step 2: 了解服务需求
    await sendMessage(
        "请问您需要以下哪种服务？\n\n" +
        "1️⃣ 🧹 客房清洁\n" +
        "2️⃣ 🔧 设施维修（空调/热水/电视等）\n" +
        "3️⃣ 🍽️ 送餐服务\n" +
        "4️⃣ 🧴 补充用品（毛巾/洗漱用品/拖鞋等）\n" +
        "5️⃣ 💬 其他需求\n\n" +
        "请输入序号或直接描述您的需求："
    );

    const request = (await waitForReply("您的需求：")).trim();
    const { serviceType, priority } = classifyService(request);

    // Step 3: 获取详细描述
    let description = request;
    if (request.length <= 2) {
        await sendMessage("请详细描述一下您的需求，以便我们更好地为您服务：");
        description = (await waitForReply("详细描述：")).trim();
    }

    // Step 4: 创建工单
    const guestName = (sessionMemory["currentGuest"] as { name: string } | undefined)?.name || "住客";

    const order = await createServiceOrder({
        roomNumber,
        guestName,
        serviceType,
        priority,
        description,
    });

    await sendMessage(
        `✅ 已为您创建服务工单\n\n` +
        `📋 工单号: ${order.orderId}\n` +
        `🏷️ 类型: ${translateServiceType(serviceType)}\n` +
        `⚡ 优先级: ${translatePriority(priority)}\n` +
        `📝 描述: ${description}\n\n` +
        `我已通知相关部门，${getEstimatedTime(serviceType, priority)}内会有工作人员处理。\n` +
        `如有其他需要，请随时呼叫！🙏`
    );

    // Step 5: 通知经理 Agent
    try {
        if (context.tools?.sessions_send) {
            await context.tools.sessions_send({
                sessionKey: "manager",
                message: JSON.stringify({
                    type: "notification",
                    action: "service_order_created",
                    payload: {
                        orderId: order.orderId,
                        roomNumber,
                        guestName,
                        serviceType,
                        priority,
                        description,
                    },
                }),
            });
        }
    } catch {
        console.error("[Room Service] Failed to notify manager agent");
    }

    // 保存到 session
    sessionMemory["lastServiceOrder"] = order;
}

// ---- 辅助函数 ----

function classifyService(input: string): { serviceType: ServiceType; priority: ServicePriority } {
    const text = input.toLowerCase();

    if (/[1]|清洁|打扫|卫生/.test(text)) return { serviceType: "cleaning", priority: "normal" };
    if (/[2]|维修|坏|不工作|空调|热水|马桶|漏/.test(text)) return { serviceType: "repair", priority: "high" };
    if (/[3]|送餐|吃|喝|餐/.test(text)) return { serviceType: "dining", priority: "normal" };
    if (/[4]|毛巾|洗漱|拖鞋|用品|纸巾/.test(text)) return { serviceType: "supplies", priority: "low" };
    if (/投诉|噪音|吵|臭|脏|不满/.test(text)) return { serviceType: "complaint", priority: "urgent" };

    return { serviceType: "other", priority: "normal" };
}

async function createServiceOrder(params: {
    roomNumber: string;
    guestName: string;
    serviceType: ServiceType;
    priority: ServicePriority;
    description: string;
}): Promise<ServiceOrder> {
    orderCounter++;
    const order: ServiceOrder = {
        orderId: `SVC-${String(orderCounter).padStart(4, "0")}`,
        roomNumber: params.roomNumber,
        guestName: params.guestName,
        serviceType: params.serviceType,
        priority: params.priority,
        description: params.description,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    if (!USE_MOCK) {
        try {
            await fetch(`${PMS_API_URL}/service-orders`, {
                method: "POST",
                headers: { Authorization: `Bearer ${PMS_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify(order),
            });
        } catch {
            console.error("[Room Service] Failed to save order to PMS");
        }
    } else {
        console.log(`[Mock PMS] Service order created: ${order.orderId}`);
    }

    return order;
}

function translateServiceType(type: ServiceType): string {
    return {
        cleaning: "🧹 客房清洁", repair: "🔧 设施维修", dining: "🍽️ 送餐服务",
        supplies: "🧴 补充用品", complaint: "💬 投诉反馈", other: "📋 其他需求",
    }[type];
}

function translatePriority(priority: ServicePriority): string {
    return {
        low: "低", normal: "普通", high: "⚡ 高", urgent: "🔴 紧急",
    }[priority];
}

function getEstimatedTime(type: ServiceType, priority: ServicePriority): string {
    if (priority === "urgent") return "10分钟";
    if (priority === "high") return "15分钟";
    if (type === "dining") return "30分钟";
    if (type === "cleaning") return "20分钟";
    return "15分钟";
}
