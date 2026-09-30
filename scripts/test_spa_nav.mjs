async function run() {
    const listRes = await fetch("http://127.0.0.1:9222/json");
    const list = await listRes.json();
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    ws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.method === "Runtime.consoleAPICalled") {
            const text = d.params.args?.map(a => a.value || a.description).join(" ");
            console.log("[CONSOLE]", d.params.type, text);
        }
        if (d.method === "Runtime.exceptionThrown") {
            console.log("[UNCAUGHT EXCEPTION]", d.params.exceptionDetails?.exception?.description || JSON.stringify(d.params.exceptionDetails));
        }
    };
    await new Promise(r => ws.onopen = r);
    ws.send(JSON.stringify({ id: 1, method: "Runtime.enable" }));
    ws.send(JSON.stringify({ id: 2, method: "Runtime.evaluate", params: {
        expression: `
            window.__lastError = null;
            window.addEventListener('error', e => { window.__lastError = e.message; });
            history.pushState({}, '', '/dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
        `
    }}));
    await new Promise(r => setTimeout(r, 4000));

    // Capture screenshot
    const shot = await new Promise((resolve) => {
        const curId = 99;
        const handler = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === curId) {
                ws.removeEventListener('message', handler);
                resolve(data.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    });

    if (shot?.data) {
        const fs = await import('fs');
        fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\83d0a166-be4e-4042-8b8d-140a6cfe8146\\evidence_qa_01_dashboard_active_card.png', Buffer.from(shot.data, 'base64'));
        console.log("Saved screenshot to evidence_qa_01_dashboard_active_card.png");
    }

    ws.close();
}
run().catch(console.error);
