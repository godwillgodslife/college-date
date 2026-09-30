import fs from "fs";
const port = process.argv[3] || process.env.CDP_PORT || "9223";
const res = await fetch(`http://localhost:${port}/json/list`);
const targets = await res.json();
const target = targets[0];
if (!target) {
    console.error("No DevTools target found");
    process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 1;

function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
        const cmdId = id++;
        const handler = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === cmdId) {
                ws.removeEventListener("message", handler);
                if (data.error) reject(data.error);
                else resolve(data.result);
            }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: cmdId, method, params }));
    });
}

ws.addEventListener("open", async () => {
    try {
        const outputPath = process.argv[2] || "c:\\college-date\\public\\evidence_hardening\\cdp_screen.png";
        await sendCommand("Page.enable");
        const result = await sendCommand("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(outputPath, Buffer.from(result.data, "base64"));
        console.log("Screenshot written to:", outputPath);
    } catch (err) {
        console.error("Screenshot error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
