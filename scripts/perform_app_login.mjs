// scripts/perform_app_login.mjs
import WebSocket from 'ws';

async function main() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No webview target');

    const ws = new WebSocket(page.webSocketDebuggerUrl, {
        headers: { Host: 'localhost' }
    });

    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    let msgId = 1;
    function evalExpr(expression) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (data) => {
                const msg = JSON.parse(data);
                if (msg.id === id) {
                    ws.removeListener('message', handler);
                    if (msg.error) reject(msg.error);
                    else resolve(msg.result?.result?.value);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: { expression, returnByValue: true, awaitPromise: true }
            }));
        });
    }

    console.log('Filling login form...');
    const fillResult = await evalExpr(`(() => {
        const emailInput = document.querySelector('input[type="email"]');
        const pwInput = document.querySelector('input[type="password"]');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (!emailInput || !pwInput || !submitBtn) {
            return { error: 'Inputs not found' };
        }

        // React 16+ input value setter
        const setVal = (input, val) => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(input, val);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        setVal(emailInput, 'student.tester2026@gmail.com');
        setVal(pwInput, 'CollegeDate2026!VerifiedPass');
        submitBtn.click();
        return { success: true, email: emailInput.value };
    })()`);

    console.log('Fill result:', fillResult);

    console.log('Waiting for login to complete and navigate...');
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const path = await evalExpr('location.pathname');
        console.log(`Path [${i + 1}/15]:`, path);
        if (path && path !== '/login') {
            console.log('Logged in! Navigating to /profile/edit...');
            await evalExpr("window.location.href = '/profile/edit'");
            break;
        }
    }

    ws.close();
}

main().catch(console.error);
