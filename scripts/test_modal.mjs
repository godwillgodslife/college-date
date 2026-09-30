async function run() {
    const listRes = await fetch("http://127.0.0.1:9222/json");
    const list = await listRes.json();
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    const send = (method, params = {}) => new Promise((resolve) => {
        const curId = Math.floor(Math.random() * 100000);
        const handler = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === curId) {
                ws.removeEventListener('message', handler);
                resolve(data.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await send("Page.enable");
    await send("Runtime.enable");

    console.log("Clicking College Date Active card...");
    await send("Runtime.evaluate", {
        expression: `
            const card = document.querySelector('.dashboard-active-program-card');
            if (card) card.click();
        `
    });

    await new Promise(r => setTimeout(r, 2000));

    // Capture screenshot
    const shot = await send("Page.captureScreenshot", { format: "png" });
    if (shot?.data) {
        const fs = await import('fs');
        const buf = Buffer.from(shot.data, 'base64');
        fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\83d0a166-be4e-4042-8b8d-140a6cfe8146\\evidence_qa_02_active_program_modal.png', buf);
        fs.writeFileSync('c:\\college-date\\docs\\evidence_qa_02_active_program_modal.png', buf);
        console.log("Saved screenshot to evidence_qa_02_active_program_modal.png");
    }

    ws.close();
}
run().catch(console.error);
