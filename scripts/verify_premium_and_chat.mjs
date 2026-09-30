import WebSocket from "ws";
import fs from "fs";

async function main() {
    const listRes = await fetch("http://127.0.0.1:9223/json");
    const targets = await listRes.json();
    const page = targets.find(t => t.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();

    ws.on("message", (raw) => {
        const msg = JSON.parse(raw);
        if (msg.id && callbacks.has(msg.id)) {
            const cb = callbacks.get(msg.id);
            callbacks.delete(msg.id);
            cb(msg);
        }
    });

    const send = (method, params = {}) => new Promise((resolve) => {
        const curId = id++;
        callbacks.set(curId, (res) => resolve(res));
        ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await new Promise(r => ws.on("open", r));
    await send("Runtime.enable");
    await send("Page.enable");

    // Click 'Get Premium' button
    console.log("Clicking Get Premium button on Profile...");
    await send("Runtime.evaluate", {
        expression: `
            const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes('Get Premium'));
            if (btn) btn.click();
        `
    });

    await new Promise(r => setTimeout(r, 2000));
    const url = (await send("Runtime.evaluate", { expression: "window.location.href", returnByValue: true })).result?.result?.value;
    console.log("Current URL:", url);
    const text = (await send("Runtime.evaluate", { expression: "document.body.innerText", returnByValue: true })).result?.result?.value;
    console.log("Has 20 free swipes copy:", text?.includes("20 free swipes per day"));
    console.log("Has (20/day) in comparison:", text?.includes("(20/day)"));
    console.log("Has old 10 swipes:", text?.includes("10 swipes per day") || text?.includes("(10/day)"));

    const res = await send("Page.captureScreenshot", { format: "png" });
    if (res?.result?.data) {
        fs.writeFileSync("remediation_verified_premium.png", Buffer.from(res.result.data, "base64"));
        console.log("Saved remediation_verified_premium.png");
    }

    // Now test Chat navigation
    console.log("Navigating to Chat via bottom nav...");
    await send("Runtime.evaluate", {
        expression: `
            const chatNav = document.querySelector('.bottom-nav-item[href="/chat"]');
            if (chatNav) chatNav.click();
        `
    });

    await new Promise(r => setTimeout(r, 2000));
    console.log("Chat URL:", (await send("Runtime.evaluate", { expression: "window.location.href", returnByValue: true })).result?.result?.value);
    const chatTitle = (await send("Runtime.evaluate", { expression: "document.querySelector('.chat-sidebar-header h1')?.innerText", returnByValue: true })).result?.result?.value;
    console.log("Chat Sidebar Title:", chatTitle);

    const resChat = await send("Page.captureScreenshot", { format: "png" });
    if (resChat?.result?.data) {
        fs.writeFileSync("remediation_verified_chat.png", Buffer.from(resChat.result.data, "base64"));
        console.log("Saved remediation_verified_chat.png");
    }

    ws.close();
}

main().catch(err => console.error(err));
