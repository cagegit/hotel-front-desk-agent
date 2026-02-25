// =============================================
// 技能：经营报表查询 (Report Query)
// 实时经营数据、日报、周报、月报
// =============================================

import { checkPermission } from "./shared/permission.js";
import { buildReportCard } from "./shared/card-builder.js";
import type { DailyReport } from "./shared/types.js";

export const metadata = {
    name: "hotel-report-query",
    description: "查询酒店经营数据：今日实时、日报、周报、月报、房间状态",
    triggers: [
        "报表", "数据", "入住率", "收入", "营收", "经营",
        "今天怎么样", "今日数据", "本周", "本月",
        "ADR", "RevPAR", "空房",
    ],
};

// Mock 报表数据
function generateMockReport(date: string): DailyReport {
    const baseOccupancy = 70 + Math.random() * 25;
    const totalRooms = 200;
    const occupied = Math.round((baseOccupancy / 100) * totalRooms);
    const revenue = occupied * (400 + Math.random() * 200);

    return {
        date,
        totalRooms,
        occupiedRooms: occupied,
        occupancyRate: parseFloat(baseOccupancy.toFixed(1)),
        revenue: Math.round(revenue),
        adr: Math.round(revenue / occupied),
        revPar: Math.round(revenue / totalRooms),
        checkIns: Math.floor(Math.random() * 30) + 10,
        checkOuts: Math.floor(Math.random() * 25) + 8,
        newReservations: Math.floor(Math.random() * 20) + 5,
        cancellations: Math.floor(Math.random() * 5),
        roomBreakdown: {
            standard: { total: 100, occupied: Math.round(occupied * 0.45), revenue: Math.round(revenue * 0.3) },
            deluxe: { total: 60, occupied: Math.round(occupied * 0.3), revenue: Math.round(revenue * 0.35) },
            suite: { total: 30, occupied: Math.round(occupied * 0.2), revenue: Math.round(revenue * 0.25) },
            presidential: { total: 10, occupied: Math.round(occupied * 0.05), revenue: Math.round(revenue * 0.1) },
        },
    };
}

export async function execute(context: {
    sendMessage: (msg: string) => Promise<void>;
    waitForReply: (prompt: string, timeoutMs?: number) => Promise<string>;
    sessionMemory: Record<string, unknown>;
    senderInfo?: { userId: string; name: string };
}) {
    const { sendMessage, waitForReply } = context;
    const senderId = context.senderInfo?.userId || "U001";

    const permCheck = checkPermission(senderId, "report.daily");
    if (!permCheck.allowed) { await sendMessage(permCheck.message!); return; }

    await sendMessage(
        "📊 **经营报表**\n\n" +
        "请选择查看范围：\n" +
        "1️⃣ 今日实时数据\n" +
        "2️⃣ 指定日期报表\n" +
        "3️⃣ 本周汇总\n" +
        "4️⃣ 本月汇总\n" +
        "5️⃣ 房间状态总览"
    );
    const choice = (await waitForReply("选择：")).trim();

    // ---- 今日实时 ----
    if (choice === "1" || choice.includes("今日") || choice.includes("实时")) {
        const today = new Date().toISOString().slice(0, 10);
        const report = generateMockReport(today);

        const card = buildReportCard(report);
        await sendMessage(card);

        // 房型明细
        let detailMsg = "\n📋 **房型明细**\n\n| 房型 | 在住/总数 | 收入 |\n|------|---------|------|\n";
        for (const [type, data] of Object.entries(report.roomBreakdown)) {
            detailMsg += `| ${translateRoomType(type)} | ${data.occupied}/${data.total} | ¥${data.revenue.toLocaleString()} |\n`;
        }
        await sendMessage(detailMsg);
    }

    // ---- 指定日期 ----
    else if (choice === "2" || choice.includes("指定")) {
        await sendMessage("请输入日期 (YYYY-MM-DD)：");
        const date = (await waitForReply("日期：")).trim();
        const report = generateMockReport(date);
        await sendMessage(buildReportCard(report));
    }

    // ---- 本周汇总 ----
    else if (choice === "3" || choice.includes("本周")) {
        const weekCheck = checkPermission(senderId, "report.weekly");
        if (!weekCheck.allowed) { await sendMessage(weekCheck.message!); return; }

        const reports: DailyReport[] = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            reports.push(generateMockReport(d.toISOString().slice(0, 10)));
        }

        const avgOccupancy = reports.reduce((s, r) => s + r.occupancyRate, 0) / reports.length;
        const totalRevenue = reports.reduce((s, r) => s + r.revenue, 0);
        const avgAdr = reports.reduce((s, r) => s + r.adr, 0) / reports.length;
        const totalCheckIns = reports.reduce((s, r) => s + r.checkIns, 0);

        let weekMsg = "📊 **本周经营汇总**\n\n";
        weekMsg += `📅 ${reports[0].date} ~ ${reports[reports.length - 1].date}\n\n`;
        weekMsg += `🏨 平均入住率: ${avgOccupancy.toFixed(1)}%\n`;
        weekMsg += `💰 总收入: ¥${totalRevenue.toLocaleString()}\n`;
        weekMsg += `📈 平均 ADR: ¥${avgAdr.toFixed(0)}\n`;
        weekMsg += `⬆️ 总入住: ${totalCheckIns} 间\n\n`;

        weekMsg += "**每日趋势**\n";
        for (const r of reports) {
            const bar = "█".repeat(Math.round(r.occupancyRate / 10)) + "░".repeat(10 - Math.round(r.occupancyRate / 10));
            weekMsg += `${r.date.slice(5)} ${bar} ${r.occupancyRate.toFixed(0)}% ¥${r.revenue.toLocaleString()}\n`;
        }

        await sendMessage(weekMsg);
    }

    // ---- 本月汇总 ----
    else if (choice === "4" || choice.includes("本月")) {
        const monthCheck = checkPermission(senderId, "report.monthly");
        if (!monthCheck.allowed) { await sendMessage(monthCheck.message!); return; }

        const now = new Date();
        const daysInMonth = now.getDate();
        let totalRevenue = 0, totalOccupancy = 0;

        for (let i = 0; i < daysInMonth; i++) {
            const report = generateMockReport(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
            totalRevenue += report.revenue;
            totalOccupancy += report.occupancyRate;
        }

        const avgOccupancy = totalOccupancy / daysInMonth;

        let monthMsg = "📊 **本月经营汇总**\n\n";
        monthMsg += `📅 ${now.getFullYear()}年${now.getMonth() + 1}月 (前${daysInMonth}天)\n\n`;
        monthMsg += `🏨 平均入住率: ${avgOccupancy.toFixed(1)}%\n`;
        monthMsg += `💰 累计收入: ¥${totalRevenue.toLocaleString()}\n`;
        monthMsg += `💰 日均收入: ¥${Math.round(totalRevenue / daysInMonth).toLocaleString()}\n`;

        await sendMessage(monthMsg);
    }

    // ---- 房间状态 ----
    else if (choice === "5" || choice.includes("房间") || choice.includes("状态")) {
        const report = generateMockReport(new Date().toISOString().slice(0, 10));

        let statusMsg = "🚪 **房间实时状态**\n\n";
        statusMsg += `总房间数: ${report.totalRooms}\n`;
        statusMsg += `✅ 空闲: ${report.totalRooms - report.occupiedRooms}\n`;
        statusMsg += `🔴 在住: ${report.occupiedRooms}\n`;
        statusMsg += `🧹 清洁中: ${Math.floor(Math.random() * 10)}\n`;
        statusMsg += `🔧 维修中: ${Math.floor(Math.random() * 3)}\n`;

        await sendMessage(statusMsg);
    }
}

function translateRoomType(type: string): string {
    return { standard: "标准间", deluxe: "豪华房", suite: "套房", presidential: "总统套房" }[type] || type;
}
