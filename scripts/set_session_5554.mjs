import WebSocket from 'ws';
import { execSync } from 'node:child_process';
import path from 'node:path';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const ADB = `"${adbPath}" -s emulator-5554`;

async function getSession(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
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

async function main() {
    console.log('1. Authenticating with Supabase...');
    const session = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    if (!session.access_token) {
        console.error('Failed to get session:', session);
        return;
    }
    console.log('Session retrieved for:', session.user.email);

    console.log('2. Forwarding port 9222 from emulator-5554...');
    const pid = execSync(`${ADB} shell pidof com.collegedate.app`).toString().trim();
    console.log(`App PID: ${pid}`);
    try { execSync(`${ADB} forward --remove tcp:9222`); } catch(_) {}
    execSync(`${ADB} forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

    console.log('3. Injecting auth token into localStorage...');
    const sessionStr = JSON.stringify(session);
    await evalCDP(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        window.location.href = '/dashboard';
    })()`);

    console.log('4. Waiting 4s for navigation to /dashboard...');
    await new Promise(r => setTimeout(r, 4000));

    const check = await evalCDP(`(() => {
        return {
            url: window.location.href,
            title: document.title,
            bodyText: document.body.innerText.slice(0, 300),
            hasBottomNav: !!document.querySelector('.bottom-nav'),
            hasHero: !!document.querySelector('.dashboard-hero, .dashboard'),
            hasQuests: !!document.querySelector('.campus-quests-card')
        };
    })()`);
    console.log('Check result:', check);
}

main().catch(console.error);
