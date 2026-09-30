import fs from "fs";
const res = await fetch("http://localhost:9222/json/list");
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

const scenario = process.argv[2]; // 'empty_fields' | 'malformed_email' | 'invalid_password' | 'nonexistent_account' | 'valid_login'

ws.addEventListener("open", async () => {
    try {
        let codeToRun = "";
        let screenshotPath = "";

        if (scenario === 'empty_fields') {
            screenshotPath = "c:\\college-date\\public\\evidence_hardening\\forensic_74_auth_empty_fields.png";
            codeToRun = `
                (async () => {
                    const emailInput = document.querySelector('#email');
                    const passInput = document.querySelector('#password');
                    const btn = document.querySelector('form.auth-form button.btn-primary');
                    
                    // Set email, clear password
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(emailInput, 'student.tester2026@gmail.com');
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nativeInputValueSetter.call(passInput, '');
                    passInput.dispatchEvent(new Event('input', { bubbles: true }));

                    btn.click();
                    await new Promise(r => setTimeout(r, 400));
                    const toast = document.querySelector('.toast');
                    return { toastText: toast ? toast.innerText.trim() : null };
                })()
            `;
        } else if (scenario === 'malformed_email') {
            screenshotPath = "c:\\college-date\\public\\evidence_hardening\\forensic_75_auth_malformed_email.png";
            codeToRun = `
                (async () => {
                    const emailInput = document.querySelector('#email');
                    const passInput = document.querySelector('#password');
                    const btn = document.querySelector('form.auth-form button.btn-primary');
                    
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(emailInput, 'not-an-email');
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nativeInputValueSetter.call(passInput, 'SomePassword123!');
                    passInput.dispatchEvent(new Event('input', { bubbles: true }));

                    btn.click();
                    await new Promise(r => setTimeout(r, 400));
                    const toast = document.querySelector('.toast');
                    return { toastText: toast ? toast.innerText.trim() : null };
                })()
            `;
        } else if (scenario === 'nonexistent_account') {
            screenshotPath = "c:\\college-date\\public\\evidence_hardening\\forensic_76_auth_nonexistent_account.png";
            codeToRun = `
                (async () => {
                    const emailInput = document.querySelector('#email');
                    const passInput = document.querySelector('#password');
                    const btn = document.querySelector('form.auth-form button.btn-primary');
                    
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(emailInput, 'nonexistent.ghost.user999999@thecollegedate.com');
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nativeInputValueSetter.call(passInput, 'AnyPassword123!');
                    passInput.dispatchEvent(new Event('input', { bubbles: true }));

                    btn.click();
                    // Wait for Supabase HTTP roundtrip
                    await new Promise(r => setTimeout(r, 1800));
                    const toast = document.querySelector('.toast');
                    return { toastText: toast ? toast.innerText.trim() : null };
                })()
            `;
        } else if (scenario === 'invalid_password') {
            screenshotPath = "c:\\college-date\\public\\evidence_hardening\\forensic_77_auth_invalid_password.png";
            codeToRun = `
                (async () => {
                    const emailInput = document.querySelector('#email');
                    const passInput = document.querySelector('#password');
                    const btn = document.querySelector('form.auth-form button.btn-primary');
                    
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(emailInput, 'student.tester2026@gmail.com');
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nativeInputValueSetter.call(passInput, 'WrongPassword2026!');
                    passInput.dispatchEvent(new Event('input', { bubbles: true }));

                    btn.click();
                    // Wait for Supabase HTTP roundtrip
                    await new Promise(r => setTimeout(r, 1800));
                    const toast = document.querySelector('.toast');
                    return { toastText: toast ? toast.innerText.trim() : null };
                })()
            `;
        } else if (scenario === 'valid_login') {
            screenshotPath = "c:\\college-date\\public\\evidence_hardening\\forensic_78_auth_valid_login.png";
            codeToRun = `
                (async () => {
                    const emailInput = document.querySelector('#email');
                    const passInput = document.querySelector('#password');
                    const btn = document.querySelector('form.auth-form button.btn-primary');
                    
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(emailInput, 'student.tester2026@gmail.com');
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nativeInputValueSetter.call(passInput, 'CollegeDate2026!VerifiedPass');
                    passInput.dispatchEvent(new Event('input', { bubbles: true }));

                    btn.click();
                    // Wait for Supabase HTTP roundtrip and route transition
                    await new Promise(r => setTimeout(r, 3000));
                    const toast = document.querySelector('.toast');
                    return { 
                        path: window.location.pathname,
                        toastText: toast ? toast.innerText.trim() : null 
                    };
                })()
            `;
        }

        const evalRes = await sendCommand("Runtime.evaluate", {
            expression: codeToRun,
            returnByValue: true,
            awaitPromise: true
        });
        console.log("Scenario result:", JSON.stringify(evalRes.result?.value, null, 2));

        const snapRes = await sendCommand("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(screenshotPath, Buffer.from(snapRes.data, "base64"));
        console.log("Screenshot written to:", screenshotPath);
    } catch (err) {
        console.error("Execution error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
