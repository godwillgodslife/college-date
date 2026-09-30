import WebSocket from "ws";
import fs from "fs";

async function main() {
    const listRes = await fetch("http://127.0.0.1:9223/json");
    const targets = await listRes.json();
    const page = targets.find(t => t.type === "page");
    if (!page) {
        console.error("No page target found");
        process.exit(1);
    }

    console.log("Connecting to:", page.webSocketDebuggerUrl);
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

    async function evalCode(expression) {
        const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        return res?.result?.result?.value;
    }

    async function screenshot(filename) {
        const res = await send("Page.captureScreenshot", { format: "png" });
        if (res?.result?.data) {
            fs.writeFileSync(filename, Buffer.from(res.result.data, "base64"));
            console.log("Saved screenshot:", filename);
        }
    }

    console.log("Current URL:", await evalCode("window.location.href"));

    // 1. Dashboard Check
    console.log("Checking Dashboard...");
    const installPanelPresent = await evalCode("Boolean(document.querySelector('.dashboard-install-panel'))");
    console.log("Dashboard Install Panel Present:", installPanelPresent, "(Expected: false)");
    const statsErrorPresent = await evalCode("Boolean(document.querySelector('.stats-error-banner, .error-banner'))");
    console.log("Dashboard Stats Error Banner Present:", statsErrorPresent, "(Expected: false)");
    await screenshot("remediation_01_dashboard.png");

    // 2. Profile Page Check
    console.log("Navigating to /profile...");
    await evalCode("window.location.hash = ''; window.history.pushState({}, '', '/profile'); window.dispatchEvent(new PopStateEvent('popstate'));");
    await new Promise(r => setTimeout(r, 2000));
    console.log("Profile URL:", await evalCode("window.location.href"));
    
    const errorBoundary = await evalCode("document.body.innerText.includes('Something went wrong')");
    console.log("Profile Error Boundary Present:", errorBoundary, "(Expected: false)");
    const profileName = await evalCode("document.querySelector('.profile-name')?.innerText");
    console.log("Profile Name rendered:", profileName);
    const profileAvatar = await evalCode("Boolean(document.querySelector('.profile-avatar'))");
    console.log("Profile Avatar rendered:", profileAvatar);
    await screenshot("remediation_02_profile.png");

    // 3. Premium Page Check
    console.log("Navigating to /premium...");
    await evalCode("window.history.pushState({}, '', '/premium'); window.dispatchEvent(new PopStateEvent('popstate'));");
    await new Promise(r => setTimeout(r, 2000));
    console.log("Premium URL:", await evalCode("window.location.href"));
    const text20Swipes = await evalCode("document.body.innerText.includes('20 free swipes') || document.body.innerText.includes('20/day')");
    console.log("Contains 20 swipes text:", text20Swipes, "(Expected: true)");
    const text10Swipes = await evalCode("document.body.innerText.includes('10 swipes per day') || document.body.innerText.includes('(10/day)')");
    console.log("Contains old 10 swipes text:", text10Swipes, "(Expected: false)");
    await screenshot("remediation_03_premium.png");

    // 4. Wallet Page Check
    console.log("Navigating to /wallet...");
    await evalCode("window.history.pushState({}, '', '/wallet'); window.dispatchEvent(new PopStateEvent('popstate'));");
    await new Promise(r => setTimeout(r, 2000));
    console.log("Wallet URL:", await evalCode("window.location.href"));
    await screenshot("remediation_04_wallet.png");

    // 5. Chat Page Check
    console.log("Navigating to /chat...");
    await evalCode("window.history.pushState({}, '', '/chat'); window.dispatchEvent(new PopStateEvent('popstate'));");
    await new Promise(r => setTimeout(r, 2500));
    console.log("Chat URL:", await evalCode("window.location.href"));
    const chatTitle = await evalCode("document.querySelector('.chat-sidebar-header h1')?.innerText");
    console.log("Chat Inbox title:", chatTitle);
    await screenshot("remediation_05_chat_inbox.png");

    ws.close();
}

main().catch(err => {
    console.error("Verification failed:", err);
    process.exit(1);
});
