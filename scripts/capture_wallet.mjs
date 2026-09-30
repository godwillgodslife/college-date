import WebSocket from "ws";
import fs from "fs";
import path from "path";

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

    const evalJs = async (expr) => {
        const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
        return r.result?.result?.value;
    };

    const capture = async (filename) => {
        const res = await send("Page.captureScreenshot", { format: "png" });
        if (res?.result?.data) {
            fs.writeFileSync(path.join("docs", filename), Buffer.from(res.result.data, "base64"));
            console.log("📸 Recaptured:", filename);
        }
    };

    console.log("Navigating to Profile -> Wallet...");
    await evalJs(`(() => {
        const link = Array.from(document.querySelectorAll('a')).find(a => a.getAttribute('href') === '/profile');
        if (link) link.click();
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    await evalJs(`(() => {
        const el = Array.from(document.querySelectorAll('button, a, .menu-item')).find(el => el.innerText.includes('Earnings'));
        if (el) el.click();
    })()`);

    console.log("Waiting for wallet data to finish loading...");
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));
        const ready = await evalJs(`Boolean(document.querySelector('.balance-amount') && !document.querySelector('.loading-spinner'))`);
        if (ready) {
            console.log(`Wallet ready after ${(i + 1) * 500}ms`);
            break;
        }
    }
    await new Promise(r => setTimeout(r, 500));
    await capture("evidence_10_wallet_page.png");

    console.log("Navigating to Profile -> Settings -> Blocked Accounts...");
    await evalJs(`(() => {
        const link = Array.from(document.querySelectorAll('a')).find(a => a.getAttribute('href') === '/profile');
        if (link) link.click();
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    await evalJs(`(() => {
        const el = Array.from(document.querySelectorAll('button, a, .menu-item')).find(el => el.innerText.includes('Settings'));
        if (el) el.click();
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    await evalJs(`(() => {
        const items = Array.from(document.querySelectorAll('.settings-item.feature-link, .settings-item'));
        const blockedRow = items.find(el => el.innerText.includes('Blocked Accounts'));
        if (blockedRow) blockedRow.click();
    })()`);

    console.log("Waiting for Blocked Accounts modal to finish loading...");
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));
        const ready = await evalJs(`Boolean(document.querySelector('.blocked-accounts-modal') && !document.querySelector('.blocked-loading'))`);
        if (ready) {
            console.log(`Blocked modal ready after ${(i + 1) * 500}ms`);
            break;
        }
    }
    await new Promise(r => setTimeout(r, 500));
    await capture("evidence_11_settings_blocked_accounts.png");

    ws.close();
    console.log("Done!");
}

main().catch(err => console.error(err));
