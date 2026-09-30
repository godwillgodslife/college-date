import WebSocket from "ws";
import fs from "fs";

async function main() {
    const listRes = await fetch("http://127.0.0.1:9223/json");
    const targets = await listRes.json();
    const page = targets.find(t => t.type === "page");
    if (!page) throw new Error("No page target");

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

    // Dismiss tour modal if present
    console.log("Checking tour modal...");
    await evalCode(`
        localStorage.setItem('tcd_tour_completed', 'true');
        const closeBtn = document.querySelector('.tour-close-btn, .btn-close, button[aria-label="Close"], .tour-skip-btn');
        if (closeBtn) closeBtn.click();
    `);
    await new Promise(r => setTimeout(r, 600));

    // Also close any overlay by clicking backdrop or next
    await evalCode(`
        const overlay = document.querySelector('.tour-overlay, .tour-modal');
        if (overlay) overlay.remove();
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    `);
    await new Promise(r => setTimeout(r, 600));

    console.log("Taking clean dashboard screenshot...");
    await screenshot("remediation_10_dashboard_clean.png");

    // Click Profile tab in bottom nav
    console.log("Clicking Profile tab in bottom nav...");
    await evalCode(`
        const profileLink = Array.from(document.querySelectorAll('a.bottom-nav-item, button.bottom-nav-item')).find(el => el.getAttribute('href') === '/profile' || el.innerText.includes('Profile') || el.innerHTML.includes('M20 21v-2a4') || el.innerHTML.includes('circle cx="12" cy="7"'));
        if (profileLink) {
            profileLink.click();
        } else {
            // Click last nav item
            const items = document.querySelectorAll('.bottom-nav-item');
            if (items.length > 0) items[items.length - 1].click();
        }
    `);
    await new Promise(r => setTimeout(r, 2000));
    console.log("Profile URL:", await evalCode("window.location.href"));
    console.log("Profile page error boundary:", await evalCode("document.body.innerText.includes('Something went wrong')"));
    console.log("Profile header content:", await evalCode("document.querySelector('.profile-header')?.innerText"));
    await screenshot("remediation_11_profile_clean.png");

    // Check Chat tab
    console.log("Clicking Chat tab in bottom nav...");
    await evalCode(`
        const chatLink = Array.from(document.querySelectorAll('.bottom-nav-item')).find(el => el.getAttribute('href') === '/chat' || el.innerHTML.includes('path d="M21 15a2'));
        if (chatLink) chatLink.click();
        else {
            const items = document.querySelectorAll('.bottom-nav-item');
            if (items.length >= 3) items[2].click();
        }
    `);
    await new Promise(r => setTimeout(r, 2000));
    console.log("Chat URL:", await evalCode("window.location.href"));
    console.log("Chat inbox header:", await evalCode("document.querySelector('.chat-sidebar-header')?.innerText"));
    await screenshot("remediation_12_chat_inbox_clean.png");

    // Navigate to Premium
    console.log("Navigating to /premium via button/link or React history...");
    await evalCode(`
        const link = document.createElement('a');
        link.href = '/premium';
        link.onclick = (e) => {
            e.preventDefault();
            // Use React internal router if available or location change
            window.location.href = '/premium';
        };
        document.body.appendChild(link);
        link.click();
    `);
    await new Promise(r => setTimeout(r, 2500));
    console.log("Premium URL:", await evalCode("window.location.href"));
    const bodyText = await evalCode("document.body.innerText");
    console.log("Has '20 free swipes' or '20/day':", bodyText?.includes("20 free swipes") || bodyText?.includes("20/day"));
    console.log("Has old '10 swipes':", bodyText?.includes("10 swipes per day") || bodyText?.includes("(10/day)"));
    await screenshot("remediation_13_premium_clean.png");

    ws.close();
}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
