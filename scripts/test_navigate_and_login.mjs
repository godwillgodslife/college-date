import WebSocket from 'ws';
import { execSync } from 'node:child_process';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function evalCDP(expr) {
    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
    if (!page) throw new Error('No page target');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === id) {
                ws.close();
                if (data.error) reject(data.error);
                else if (data.result?.exceptionDetails) reject(data.result.exceptionDetails);
                else resolve(data.result?.result?.value);
            }
        };
        ws.send(JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
    });
}

async function run() {
    console.log('--- Connecting to College Date WebView ---');
    // Ensure port 9222 is forwarded to the app PID
    const pid = execSync(`${ADB} shell pidof com.collegedate.app`).toString().trim();
    console.log(`App PID: ${pid}`);
    try { execSync(`${ADB} forward --remove tcp:9222`); } catch(_) {}
    execSync(`${ADB} forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

    const currentUrl = await evalCDP('window.location.href');
    console.log('Current URL:', currentUrl);

    // If on landing or welcome screen, click Already have an account
    const clickResult = await evalCDP(`(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        const loginLink = links.find(l => l.innerText.toLowerCase().includes('already have an account') || l.innerText.toLowerCase().includes('log in'));
        if (loginLink) {
            loginLink.click();
            return 'Clicked: ' + loginLink.innerText;
        }
        return 'Not found';
    })()`);
    console.log('Click result:', clickResult);

    await sleep(2000);

    const loginUrl = await evalCDP('window.location.href');
    console.log('URL after click:', loginUrl);

    // Fill credentials
    const fillResult = await evalCDP(`(() => {
        const emailInput = document.querySelector('input[type="email"]');
        if (!emailInput) return 'No email input found';

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(emailInput, 'student.tester2026@gmail.com');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));

        const pwInput = document.querySelector('input[type="password"]');
        if (!pwInput) return 'No password input found';
        nativeSetter.call(pwInput, 'CollegeDate2026!VerifiedPass');
        pwInput.dispatchEvent(new Event('input', { bubbles: true }));
        pwInput.dispatchEvent(new Event('change', { bubbles: true }));

        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In') || b.innerText.includes('Log In'));
        if (submitBtn) {
            submitBtn.click();
            return 'Submitted sign in';
        }
        return 'No submit button';
    })()`);
    console.log('Fill & submit result:', fillResult);

    await sleep(4000);

    const afterLoginUrl = await evalCDP('window.location.href');
    console.log('URL after auth:', afterLoginUrl);
}

run().catch(console.error);
