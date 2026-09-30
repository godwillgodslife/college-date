import fs from "fs";
const res = await fetch("http://localhost:9223/json/list");
const targets = await res.json();
const target = targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);

function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (e) => {
            const d = JSON.parse(e.data);
            if (d.id === id) {
                ws.removeEventListener("message", handler);
                if (d.error) reject(d.error);
                else resolve(d.result);
            }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.addEventListener("message", (e) => {
    const d = JSON.parse(e.data);
    if (d.method === "Runtime.consoleAPICalled") {
        const args = (d.params.args || []).map(a => a.value || JSON.stringify(a)).join(" ");
        console.log(`[CONSOLE ${d.params.type}]`, args);
    }
    if (d.method === "Network.responseReceived") {
        const r = d.params.response;
        console.log(`[NET ${r.status}] ${r.statusText} -> ${r.url}`);
    }
});

ws.addEventListener("open", async () => {
    try {
        await send("Runtime.enable");
        await send("Network.enable");

        console.log("Dispatching file upload...");
        const uploadResult = await send("Runtime.evaluate", {
            expression: `(async () => {
                const b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
                const res = await fetch(b64);
                const blob = await res.blob();
                const file = new File([blob], "test_photo.png", { type: "image/png" });
                const input = document.querySelector('input[type="file"]');
                if (!input) return { error: 'No file input found' };

                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));

                return { success: true };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });

        console.log("Upload triggered:", uploadResult.result?.value);
        // Wait 5s for upload to complete
        await new Promise(r => setTimeout(r, 5000));

        const photoState = await send("Runtime.evaluate", {
            expression: `({
                storageOnboardingData: window.localStorage.getItem('onboarding_data'),
                btnDisabled: document.querySelector('.quiz-next-btn')?.disabled,
                btnText: document.querySelector('.quiz-next-btn')?.innerText,
                hasVerifyBox: !!document.querySelector('.onboarding-verify-box'),
                verifyBoxText: document.querySelector('.onboarding-verify-box')?.innerText,
                toasts: Array.from(document.querySelectorAll('.toast')).map(t => t.innerText)
            })`,
            returnByValue: true
        });

        console.log("Photo state after upload:", photoState.result?.value);

        await send("Page.enable");
        const s4Snap = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync("C:\\Users\\DELL\\.gemini\\antigravity\\brain\\a3d414a0-3923-40a1-bbc5-86db2aad6abf\\verify_05_onboarding_step4_face_verify.png", Buffer.from(s4Snap.data, "base64"));
        console.log("Saved verify_05_onboarding_step4_face_verify.png");

        // Click Scan Face & Verify Now
        console.log("Opening Face Verification modal from Onboarding Step 4...");
        await send("Runtime.evaluate", {
            expression: `document.querySelector('.onboarding-verify-btn')?.click()`,
            awaitPromise: true
        });
        await new Promise(r => setTimeout(r, 1200));

        const modalSnap = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync("C:\\Users\\DELL\\.gemini\\antigravity\\brain\\a3d414a0-3923-40a1-bbc5-86db2aad6abf\\verify_06_onboarding_face_verify_modal.png", Buffer.from(modalSnap.data, "base64"));
        console.log("Saved verify_06_onboarding_face_verify_modal.png");

    } catch(e) {
        console.error(e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
