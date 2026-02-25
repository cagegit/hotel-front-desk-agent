// =============================================
// 钉钉 API 客户端封装
// 用于发送消息、群操作等
// =============================================

const USE_MOCK = process.env.MOCK_PMS === "true";
const DINGTALK_APP_KEY = process.env.DINGTALK_APP_KEY || "";
const DINGTALK_APP_SECRET = process.env.DINGTALK_APP_SECRET || "";

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * 获取钉钉 Access Token
 */
async function getAccessToken(): Promise<string> {
    if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
        return cachedAccessToken.token;
    }

    if (USE_MOCK) {
        cachedAccessToken = { token: "mock-access-token", expiresAt: Date.now() + 7200000 };
        return cachedAccessToken.token;
    }

    const res = await fetch("https://oapi.dingtalk.com/gettoken", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const url = new URL("https://oapi.dingtalk.com/gettoken");
    url.searchParams.set("appkey", DINGTALK_APP_KEY);
    url.searchParams.set("appsecret", DINGTALK_APP_SECRET);

    const tokenRes = await fetch(url.toString());
    const data = await tokenRes.json() as { access_token: string; expires_in: number };

    cachedAccessToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    };

    return cachedAccessToken.token;
}

/**
 * 发送钉钉群消息
 */
export async function sendGroupMessage(
    chatId: string,
    content: string,
    msgType: "text" | "markdown" = "text",
): Promise<void> {
    if (USE_MOCK) {
        console.log(`[Mock DingTalk] Group(${chatId}): ${content}`);
        return;
    }

    const token = await getAccessToken();
    const body = msgType === "markdown"
        ? { chatid: chatId, msg: { msgtype: "markdown", markdown: { title: "酒店通知", text: content } } }
        : { chatid: chatId, msg: { msgtype: "text", text: { content } } };

    await fetch(`https://oapi.dingtalk.com/chat/send?access_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

/**
 * 发送钉钉一对一消息
 */
export async function sendDirectMessage(userId: string, content: string): Promise<void> {
    if (USE_MOCK) {
        console.log(`[Mock DingTalk] DM(${userId}): ${content}`);
        return;
    }

    const token = await getAccessToken();
    await fetch(`https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2?access_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            agent_id: process.env.DINGTALK_ROBOT_CODE,
            userid_list: userId,
            msg: { msgtype: "text", text: { content } },
        }),
    });
}

/**
 * 通知指定部门全员
 */
export async function notifyDepartment(
    department: string,
    userIds: string[],
    content: string,
): Promise<void> {
    if (USE_MOCK) {
        console.log(`[Mock DingTalk] Notify dept(${department}): ${content} → ${userIds.join(", ")}`);
        return;
    }

    for (const userId of userIds) {
        await sendDirectMessage(userId, content);
    }
}

/**
 * 发送钉钉互动卡片
 */
export async function sendInteractiveCard(
    chatId: string,
    card: {
        title: string;
        content: string;
        buttons?: Array<{ title: string; actionUrl: string }>;
    },
): Promise<void> {
    if (USE_MOCK) {
        console.log(`[Mock DingTalk] Card(${chatId}): ${card.title}`);
        return;
    }

    const token = await getAccessToken();
    const btnList = (card.buttons || []).map((b) => ({
        title: b.title,
        actionURL: b.actionUrl,
    }));

    await fetch(`https://oapi.dingtalk.com/chat/send?access_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chatid: chatId,
            msg: {
                msgtype: "action_card",
                action_card: {
                    title: card.title,
                    markdown: card.content,
                    btn_orientation: "0",
                    btn_json_list: btnList,
                },
            },
        }),
    });
}
