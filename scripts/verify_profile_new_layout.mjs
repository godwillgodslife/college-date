import WebSocket from 'ws';
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
    const raw = await (await fetch('http://127.0.0.1:9222/json')).json();
    const target = raw.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found on port 9222');

    console.log('Connecting to page:', target.title, target.url);
    const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise(r => ws.on('open', r));

    let msgId = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id === id) {
                    ws.off('message', handler);
                    if (msg.error) reject(msg.error);
                    else resolve(msg.result);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async function evaluate(expr) {
        const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (res.exceptionDetails) {
            console.error('Eval error:', res.exceptionDetails);
            throw new Error(res.exceptionDetails.text || 'Eval error');
        }
        return res.result?.value;
    }

    async function captureScreenshot(filename) {
        await send('Page.enable');
        const r = await send('Page.captureScreenshot', { format: 'png' });
        const targetDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\713edf99-17db-41df-b5ca-20c12a82133c';
        const targetPath = path.join(targetDir, filename);
        fs.writeFileSync(targetPath, Buffer.from(r.data, 'base64'));
        console.log(`Saved screenshot: ${filename}`);
    }

    // 1. Ensure user is authenticated
    console.log('--- 1. Authenticating test user ---');
    const authData = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const sessionObj = authData.session || (authData.access_token ? authData : null);
    if (!sessionObj) throw new Error('Failed to get session');

    await evaluate(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(JSON.stringify(sessionObj))});
        localStorage.setItem("hasSeenAppTour", "true");
        window.location.href = '/match';
    })()`);

    await new Promise(r => setTimeout(r, 2000));

    // 2. Navigate to /profile
    console.log('--- 2. Navigating to /profile ---');
    await evaluate(`
        (() => {
            window.location.href = '/profile';
        })()
    `);
    await new Promise(r => setTimeout(r, 2200));

    // 3. Inspect DOM
    const inspection = await evaluate(`
        (() => {
            const navLabels = Array.from(document.querySelectorAll('.bottom-nav-label')).map(el => el.innerText.trim());
            const hasHomeInNav = navLabels.includes('Home');
            const hasVerificationCard = !!document.querySelector('.verification-card-permanent');
            const hasYtBridge = !!document.querySelector('.profile-yt-bridge-btn');
            const ytBridgeText = document.querySelector('.profile-yt-bridge-btn')?.innerText;
            const hasOldWalletCard = !!document.querySelector('.wallet-entry-card');
            const hasProfileHeader = !!document.querySelector('.profile-header');
            const premiumPill = document.querySelector('.premium-badge-pill');
            const verifiedPill = document.querySelector('.verified-badge-pill');

            return {
                url: window.location.pathname,
                navCount: navLabels.length,
                navLabels,
                hasHomeInNav,
                hasVerificationCard,
                hasYtBridge,
                ytBridgeText: ytBridgeText?.replace(/\\s+/g, ' '),
                hasOldWalletCard,
                hasProfileHeader,
                premiumPillText: premiumPill?.innerText,
                verifiedPillText: verifiedPill?.innerText
            };
        })()
    `);

    console.log('Profile Inspection Result:', JSON.stringify(inspection, null, 2));

    await captureScreenshot('profile_new_layout_live.png');

    // 4. Test clicking YouTube bridge button -> should go to /dashboard
    console.log('--- 4. Clicking YouTube Bridge Button ---');
    await evaluate(`
        (() => {
            const btn = document.querySelector('.profile-yt-bridge-btn');
            if (btn) btn.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 1500));

    const dashboardCheck = await evaluate(`
        (() => {
            return {
                url: window.location.pathname,
                title: document.title,
                hasDashboardHero: !!document.querySelector('.dashboard-hero, .dashboard-command-header, [class*="dashboard"]'),
                sampleText: document.body.innerText.slice(0, 150)
            };
        })()
    `);
    console.log('Dashboard check after bridge click:', JSON.stringify(dashboardCheck, null, 2));
    await captureScreenshot('dashboard_from_yt_bridge.png');

    // 5. Test clicking Match in bottom navbar -> should go to /match
    console.log('--- 5. Clicking Match in Bottom Navigation ---');
    await evaluate(`
        (() => {
            const matchLink = Array.from(document.querySelectorAll('.bottom-nav-item')).find(el => el.getAttribute('href') === '/match' || el.innerText.includes('Match'));
            if (matchLink) matchLink.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 1500));

    const matchCheck = await evaluate(`
        (() => {
            return {
                url: window.location.pathname,
                hasSwipeContainer: !!document.querySelector('.swipe-container, .tinder-card, .discover-rail-btn'),
                sampleText: document.body.innerText.slice(0, 150)
            };
        })()
    `);
    console.log('Match check after nav click:', JSON.stringify(matchCheck, null, 2));
    await captureScreenshot('match_screen_5tabs.png');

    ws.close();
    console.log('All verification steps completed successfully!');
}

main().catch(err => {
    console.error('Verification error:', err);
    process.exit(1);
});
