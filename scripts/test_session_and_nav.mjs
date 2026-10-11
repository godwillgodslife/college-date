import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function getSession(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

async function main() {
    // 1. Ensure port 9222 forwarded
    const adb = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
    const out = execSync(`"${adb}" -s emulator-5554 shell "cat /proc/net/unix"`).toString();
    const match = out.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket found');
    console.log('Found socket:', match[1]);
    execSync(`"${adb}" -s emulator-5554 forward tcp:9222 localabstract:${match[1]}`);

    // 2. Fetch page target
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const target = targets.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found');

    console.log('Connecting to WebSocket:', target.webSocketDebuggerUrl);
    const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    let msgId = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id === id) {
                    ws.off('message', handler);
                    if (msg.error) reject(msg.error);
                    else if (msg.result?.exceptionDetails) reject(msg.result.exceptionDetails);
                    else resolve(msg.result?.result?.value);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async function evaluate(expr) {
        return send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    }

    // Authenticate test user
    console.log('Authenticating student.tester2026@gmail.com...');
    const authData = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const sessionObj = authData.session || (authData.access_token ? authData : null);
    if (!sessionObj) {
        console.error('Auth error:', authData);
        process.exit(1);
    }
    console.log('Auth success. Setting session in localStorage and navigating to /requests...');

    const sessionStr = JSON.stringify(sessionObj);
    const navRes = await evaluate(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        localStorage.setItem("hasSeenAppTour", "true");
        window.location.href = '/requests';
        return window.location.href;
    })()`);
    console.log('Navigated to:', navRes);

    ws.close();
}

main().catch(console.error);
