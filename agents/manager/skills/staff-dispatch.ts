// =============================================
// 技能：人员调度 (Staff Dispatch)
// 按部门/人员派单、任务状态查询、钉钉推送
// =============================================

import { checkPermission, getStaffByDepartment, getUserByName, translateDepartment, translateRole } from "./shared/permission.js";
import { buildTaskCard } from "./shared/card-builder.js";
import { sendDirectMessage, notifyDepartment } from "./shared/dingtalk-client.js";
import type { StaffTask, TaskPriority, Department } from "./shared/types.js";

export const metadata = {
    name: "hotel-staff-dispatch",
    description: "人员调度：快速派单、分配任务、查看状态、部门通知",
    triggers: [
        "派单", "分配", "调度", "通知", "任务",
        "派人去", "安排", "谁去处理", "工单",
    ],
};

let taskCounter = 500;

// Mock 任务数据
const tasks: StaffTask[] = [
    {
        taskId: "TASK-501", title: "1203房间空调检修", description: "客人反映空调不制热",
        department: "engineering", assignedTo: "U006", assignedToName: "陈师傅",
        priority: "high", status: "in_progress", relatedRoom: "1203",
        createdBy: "李经理", createdAt: "2026-02-25T10:00:00Z", updatedAt: "2026-02-25T10:30:00Z",
    },
    {
        taskId: "TASK-502", title: "15楼走廊灯维修", description: "3盏走廊灯不亮",
        department: "engineering", priority: "normal", status: "pending",
        createdBy: "赵主管", createdAt: "2026-02-25T14:00:00Z", updatedAt: "2026-02-25T14:00:00Z",
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

    await sendMessage(
        "📋 **人员调度**\n\n" +
        "1️⃣ 🆕 创建新工单 / 快速派单\n" +
        "2️⃣ 👤 指定人员分配任务\n" +
        "3️⃣ 📊 查看任务状态\n" +
        "4️⃣ 📢 部门群发通知\n" +
        "5️⃣ 返回"
    );
    const choice = (await waitForReply("选择：")).trim();

    // ---- 创建工单 ----
    if (choice === "1" || choice.includes("创建") || choice.includes("派单")) {
        const permCheck = checkPermission(senderId, "staff.assign");
        if (!permCheck.allowed) { await sendMessage(permCheck.message!); return; }

        await sendMessage(
            "请选择派单部门：\n" +
            "1️⃣ 🧹 客房部\n2️⃣ 🔧 工程部\n3️⃣ 🍽️ 餐饮部\n4️⃣ 🏨 前厅部\n5️⃣ 🛡️ 安保部"
        );
        const deptChoice = (await waitForReply("部门：")).trim();
        const deptMap: Record<string, Department> = {
            "1": "housekeeping", "2": "engineering", "3": "food_beverage",
            "4": "front_office", "5": "security",
            "客房": "housekeeping", "工程": "engineering", "餐饮": "food_beverage",
            "前厅": "front_office", "安保": "security",
        };
        const department = deptMap[deptChoice] || "housekeeping";

        await sendMessage("请输入任务标题：");
        const title = (await waitForReply("标题：")).trim();

        await sendMessage("请输入任务描述：");
        const description = (await waitForReply("描述：")).trim();

        await sendMessage("优先级？(低/普通/高/紧急)");
        const priorityInput = (await waitForReply("优先级：")).trim();
        const priorityMap: Record<string, TaskPriority> = {
            "低": "low", "普通": "normal", "高": "high", "紧急": "urgent",
        };
        const priority = priorityMap[priorityInput] || "normal";

        await sendMessage("关联房间号？(无则跳过)");
        const room = (await waitForReply("房间：")).trim();

        taskCounter++;
        const task: StaffTask = {
            taskId: `TASK-${taskCounter}`,
            title, description, department, priority,
            status: "pending",
            relatedRoom: room && room !== "无" && room !== "跳过" ? room : undefined,
            createdBy: context.senderInfo?.name || "unknown",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        tasks.push(task);

        const card = buildTaskCard(task);
        await sendMessage(`✅ 工单已创建\n\n${card}`);

        // 通知部门
        const deptStaff = getStaffByDepartment(department);
        if (deptStaff.length > 0) {
            const staffIds = deptStaff.map((s) => s.userId);
            const notifyMsg = `📋 新工单 ${task.taskId}\n${title}\n优先级: ${priorityInput}\n${room ? `房间: ${room}` : ""}`;
            await notifyDepartment(department, staffIds, notifyMsg);
            await sendMessage(`📢 已通知${translateDepartment(department)} ${deptStaff.length} 名员工。`);
        }
    }

    // ---- 指定人员 ----
    else if (choice === "2" || choice.includes("指定") || choice.includes("分配")) {
        const permCheck = checkPermission(senderId, "staff.assign");
        if (!permCheck.allowed) { await sendMessage(permCheck.message!); return; }

        const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "assigned");
        if (pendingTasks.length === 0) { await sendMessage("📋 暂无待分配任务。"); return; }

        let listMsg = "待分配任务：\n\n";
        for (const t of pendingTasks) {
            listMsg += `🔹 ${t.taskId}: ${t.title} (${translateDepartment(t.department)})\n`;
        }
        listMsg += "\n请输入工单号和负责人\n格式：`工单号 负责人姓名`";
        await sendMessage(listMsg);

        const input = (await waitForReply("分配：")).trim().split(/\s+/);
        const taskId = input[0];
        const staffName = input[1];

        const task = tasks.find((t) => t.taskId === taskId);
        const staff = getUserByName(staffName || "");

        if (!task) { await sendMessage("❌ 未找到该工单。"); return; }
        if (!staff) { await sendMessage("❌ 未找到该员工。"); return; }

        task.assignedTo = staff.userId;
        task.assignedToName = staff.name;
        task.status = "assigned";
        task.updatedAt = new Date().toISOString();

        await sendDirectMessage(staff.userId, `📋 新任务: ${task.title}\n工单号: ${task.taskId}\n${task.description}`);
        await sendMessage(`✅ 已将 ${task.taskId} 分配给 ${staff.name}，钉钉通知已发送。`);
    }

    // ---- 查看状态 ----
    else if (choice === "3" || choice.includes("状态") || choice.includes("查看")) {
        let statusMsg = "📊 **任务状态总览**\n\n";
        const pending = tasks.filter((t) => t.status === "pending").length;
        const assigned = tasks.filter((t) => t.status === "assigned").length;
        const inProgress = tasks.filter((t) => t.status === "in_progress").length;
        const completed = tasks.filter((t) => t.status === "completed").length;

        statusMsg += `⏳ 待处理: ${pending}\n👤 已分配: ${assigned}\n🔄 处理中: ${inProgress}\n✅ 已完成: ${completed}\n\n`;

        const activeTasks = tasks.filter((t) => !["completed", "cancelled"].includes(t.status));
        for (const t of activeTasks.slice(-5)) {
            statusMsg += buildTaskCard(t) + "\n\n";
        }

        await sendMessage(statusMsg);
    }

    // ---- 群发通知 ----
    else if (choice === "4" || choice.includes("群发") || choice.includes("通知")) {
        const permCheck = checkPermission(senderId, "staff.assign");
        if (!permCheck.allowed) { await sendMessage(permCheck.message!); return; }

        await sendMessage("请选择要通知的部门：\n1️⃣ 客房部\n2️⃣ 工程部\n3️⃣ 餐饮部\n4️⃣ 安保部\n5️⃣ 全员");
        const dept = (await waitForReply("部门：")).trim();

        await sendMessage("请输入通知内容：");
        const content = (await waitForReply("内容：")).trim();

        const deptMap: Record<string, string> = {
            "1": "housekeeping", "2": "engineering", "3": "food_beverage", "4": "security",
        };

        if (dept === "5" || dept.includes("全员")) {
            const allStaff = ["housekeeping", "engineering", "food_beverage", "security"]
                .flatMap((d) => getStaffByDepartment(d));
            await notifyDepartment("all", allStaff.map((s) => s.userId), `📢 全员通知\n\n${content}`);
            await sendMessage(`✅ 已通知全员 ${allStaff.length} 人。`);
        } else {
            const department = deptMap[dept] || "housekeeping";
            const staff = getStaffByDepartment(department);
            await notifyDepartment(department, staff.map((s) => s.userId), `📢 部门通知\n\n${content}`);
            await sendMessage(`✅ 已通知${translateDepartment(department)} ${staff.length} 人。`);
        }
    }
}
