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

    // Wait up to 6 seconds for Chat screen to finish loading
    for (let i = 0; i < 6; i++) {
        const loaded = (await send("Runtime.evaluate", {
            expression: "Boolean(document.querySelector('.chat-sidebar-header, .empty-conversations, .messages-container'))",
            returnByValue: true
        })).result?.result?.value;
        if (loaded) break;
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("Chat DOM loaded. Text:", (await send("Runtime.evaluate", { expression: "document.body.innerText", returnByValue: true })).result?.result?.value?.slice(0, 300));
    const resChat = await send("Page.captureScreenshot", { format: "png" });
    if (resChat?.result?.data) {
        fs.writeFileSync("remediation_verified_chat_loaded.png", Buffer.from(resChat.result.data, "base64"));
        console.log("Saved remediation_verified_chat_loaded.png");
    }

    // Now navigate to /premium by clicking an explicit anchor or via history
    console.log("Navigating to /premium...");
    await send("Runtime.evaluate", {
        expression: `
            window.location.href = '/premium';
        `
    });

    for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const loaded = (await send("Runtime.evaluate", {
            expression: "Boolean(document.querySelector('.premium-header, .premium-comparison-box'))",
            returnByValue: true
        })).result?.result?.value;
        if (loaded) break;
    }

    const premText = (await send("Runtime.evaluate", { expression: "document.body.innerText", returnByValue: true })).result?.result?.value;
    console.log("Premium text snippet:", premText?.slice(0, 400));
    console.log("Contains '20 free swipes':", premText?.includes("20 free swipes"));
    console.log("Contains '(20/day)':", premText?.includes("(20/day)"));

    const resPrem = await send("Page.captureScreenshot", { format: "png" });
    if (resPrem?.result?.data) {
        fs.writeFileSync("remediation_verified_premium_loaded.png", Buffer.from(resPrem.result.data, "base64"));
        console.log("Saved remediation_verified_premium_loaded.png");
    }

    ws.close();
}

main().catch(err => console.error(err));
