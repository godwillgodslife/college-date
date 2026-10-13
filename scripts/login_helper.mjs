import { execSync } from 'node:child_process';
import path from 'node:path';

async function login() {
    const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
    try { execSync(`"${adbPath}" connect 127.0.0.1:5555`); } catch (_) {}
    await new Promise(r => setTimeout(r, 1000));

    const devicesOutput = execSync(`"${adbPath}" devices`).toString();
    const activeDevice = devicesOutput.includes('127.0.0.1:5555\tdevice')
        ? '127.0.0.1:5555'
        : (devicesOutput.includes('emulator-5554\tdevice') ? 'emulator-5554' : '127.0.0.1:5555');

    const unixSockets = execSync(`"${adbPath}" -s ${activeDevice} shell "cat /proc/net/unix"`).toString();
    const match = unixSockets.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket found');
    const socketName = match[1];

    try { execSync(`"${adbPath}" -s ${activeDevice} forward --remove tcp:9222`); } catch (_) {}
    execSync(`"${adbPath}" -s ${activeDevice} forward tcp:9222 localabstract:${socketName}`);

    const jsonStr = execSync('curl.exe -s http://127.0.0.1:9222/json').toString();
    const pages = JSON.parse(jsonStr);
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => { ws.onopen = res; });

    function evaluate(expr) {
        return new Promise((resolve) => {
            const id = Math.floor(Math.random() * 100000);
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    resolve(data.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: { expression: expr, returnByValue: true, awaitPromise: true }
            }));
        });
    }

    const script = `(() => {
        const emailInput = document.querySelector('input[type="email"]');
        const pwInput = document.querySelector('input[type="password"]');
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Sign In'));

        if (!emailInput || !pwInput || !submitBtn) return { error: 'Inputs not found' };

        const setVal = (input, val) => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, val);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        setVal(emailInput, 'student.tester2026@gmail.com');
        setVal(pwInput, 'CollegeDate2026!VerifiedPass');
        submitBtn.click();
        return { success: true };
    })()`;

    const res = await evaluate(script);
    console.log('Login result:', res);
    ws.close();
}

login().catch(console.error);
