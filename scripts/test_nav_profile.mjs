import WebSocket from "ws";

async function main() {
    const listRes = await fetch("http://127.0.0.1:9223/json");
    const targets = await listRes.json();
    const page = targets.find(t => t.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();

    ws.on("message", (raw) => {
        const msg = JSON.parse(raw);
        if (msg.method === "Runtime.exceptionThrown") {
            console.error("[EXCEPTION THROWN]", JSON.stringify(msg.params.exceptionDetails, null, 2));
        }
        if (msg.method === "Runtime.consoleAPICalled") {
            console.log("[CONSOLE]", msg.params.type, msg.params.args?.map(a => a.value || a.description).join(" "));
        }
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

    // Close the tour modal by clicking the X
    await send("Runtime.evaluate", {
        expression: `
            const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === '✕' || b.classList.contains('tour-close-btn'));
            if (closeBtn) closeBtn.click();
        `
    });
    await new Promise(r => setTimeout(r, 800));

    // Find the profile bottom nav link and click it
    console.log("Locating bottom nav links...");
    const navItems = await send("Runtime.evaluate", {
        expression: `
            Array.from(document.querySelectorAll('.bottom-nav-item')).map(el => ({
                href: el.getAttribute('href'),
                text: el.innerText.trim(),
                html: el.outerHTML
            }))
        `,
        returnByValue: true
    });
    console.log("Nav items:", JSON.stringify(navItems?.result?.result?.value, null, 2));

    // Click the profile link (href === '/profile')
    console.log("Clicking /profile nav item...");
    await send("Runtime.evaluate", {
        expression: `
            const link = document.querySelector('.bottom-nav-item[href="/profile"]');
            if (link) link.click();
        `
    });

    await new Promise(r => setTimeout(r, 2000));
    console.log("Current URL after click:", (await send("Runtime.evaluate", { expression: "window.location.href", returnByValue: true })).result?.result?.value);
    console.log("DOM text:", (await send("Runtime.evaluate", { expression: "document.body.innerText", returnByValue: true })).result?.result?.value?.slice(0, 400));

    ws.close();
}

main().catch(err => console.error(err));
