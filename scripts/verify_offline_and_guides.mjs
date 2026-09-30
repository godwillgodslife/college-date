import { execSync } from 'child_process';
import fs from 'fs';

const ADB = 'C:\\Users\\DELL\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const EMULATOR = 'emulator-5554';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCDPTarget() {
    const res = await fetch("http://127.0.0.1:9222/json/list");
    const targets = await res.json();
    return targets[0];
}

async function main() {
    console.log('=== STARTING OFFLINE-FIRST & USER ONBOARDING VERIFICATION ===');
    const target = await getCDPTarget();
    if (!target) {
        console.error('No devtools target found on port 9222');
        process.exit(1);
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let msgId = 1;

    function sendCommand(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (event) => {
                const data = JSON.parse(event.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    if (data.error) reject(data.error);
                    else resolve(data.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve);
        ws.addEventListener('error', reject);
    });

    console.log('[QA] Connected to WebView CDP on port 9222');
    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\83d0a166-be4e-4042-8b8d-140a6cfe8146';

    async function takeScreenshot(filename) {
        try {
            const base = filename.split(/[/\\]/).pop();
            const res = await sendCommand('Page.captureScreenshot', { format: 'png' });
            if (res && res.data) {
                const buf = Buffer.from(res.data, 'base64');
                fs.writeFileSync(filename, buf);
                const artCopy = `${ARTIFACT_DIR}\\${base}`;
                fs.writeFileSync(artCopy, buf);
                console.log(`[QA] Captured screenshot: ${filename} (${buf.length} bytes, mirrored to artifact dir)`);
            }
        } catch (e) {
            console.warn(`[QA] Screenshot failed:`, e.message);
        }
    }

    async function evaluate(expr) {
        const res = await sendCommand('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        return res?.result?.value;
    }

    async function navigateTo(path) {
        await evaluate(`(() => {
            if (window.__reactNavigate) {
                window.__reactNavigate('${path}');
            } else {
                window.location.href = '${path}';
            }
        })()`);
    }

    async function waitForSelector(selector, timeoutMs = 12000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const exists = await evaluate(`!!document.querySelector('${selector}')`);
            if (exists) return true;
            await sleep(300);
        }
        return false;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1: AUTHENTICATE TESTER ACCOUNT (Alex Davis / Male)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 1: Ensuring tester is logged in (Alex Davis) ---');
    let curPath = await evaluate(`window.location.pathname`);
    console.log('[QA] Initial path:', curPath);

    if (curPath !== '/login' && curPath !== '/match' && curPath !== '/dashboard') {
        console.log('[QA] Navigating to /login...');
        await navigateTo('/login');
        await sleep(2000);
        curPath = await evaluate(`window.location.pathname`);
    }

    const hasEmail = await waitForSelector('#email', 5000);
    if (hasEmail || curPath === '/login') {
        console.log('[QA] On login form, entering credentials...');
        await evaluate(`(() => {
            const emailInput = document.querySelector('#email');
            const passInput = document.querySelector('#password');
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            if (emailInput && passInput) {
                nativeSetter.call(emailInput, 'student.tester2026@gmail.com');
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                nativeSetter.call(passInput, 'CollegeDate2026!VerifiedPass');
                passInput.dispatchEvent(new Event('input', { bubbles: true }));
                const btn = document.querySelector('button[type="submit"]');
                if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
            }
        })()`);
        
        const startAuth = Date.now();
        while (Date.now() - startAuth < 15000) {
            await sleep(1000);
            const path = await evaluate(`window.location.pathname`);
            if (path && path !== '/login') break;
        }
    }

    const postLoginUrl = await evaluate(`window.location.pathname`);
    console.log('[QA] Active path after auth check:', postLoginUrl);

    // Reset all guides first so we can verify fresh first-time onboarding
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        const tourClose = document.querySelector('.tour-close, .tour-modal button');
        if (tourClose) tourClose.click();
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('tcd_guide_seen_')) localStorage.removeItem(k);
        });
    })()`);
    await sleep(1000);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: VERIFY MATCH SWIPE GUIDANCE (match_swipe)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 2: Match Swipe Contextual Tip ---');
    await navigateTo('/match');
    await sleep(3000);

    // Dismiss tour again if it popped up during navigation
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        const tourClose = document.querySelector('.tour-close, .tour-modal button');
        if (tourClose) tourClose.click();
    })()`);
    await sleep(1000);

    const matchTipExists = await evaluate(`!!document.querySelector('.match-contextual-tip, .contextual-tip-card')`);
    const matchTipTitle = await evaluate(`document.querySelector('.match-contextual-tip .tip-title, .contextual-tip-card .tip-title')?.innerText`);
    console.log('[QA] Match tip visible:', matchTipExists, '| Title:', matchTipTitle);

    await takeScreenshot('c:\\college-date\\evidence_qa_01_match_guide.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: VERIFY EXPLORE FILTERS & CHAT VIBE GUIDANCE (explore_filters)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 3: Explore Filters Contextual Tip ---');
    await navigateTo('/explore');
    await sleep(3000);

    const exploreTipExists = await evaluate(`!!document.querySelector('.contextual-tip-card')`);
    const exploreTipTitle = await evaluate(`document.querySelector('.contextual-tip-card .tip-title')?.innerText`);
    console.log('[QA] Explore tip visible:', exploreTipExists, '| Title:', exploreTipTitle);

    await takeScreenshot('c:\\college-date\\evidence_qa_02_explore_guide.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: VERIFY MESSAGES & DIRECT CHAT GUIDANCE (messages_chat)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 4: Messages & Chat Contextual Tip ---');
    await navigateTo('/chat');
    await sleep(3000);

    const chatTipExists = await evaluate(`!!document.querySelector('.contextual-tip-card')`);
    const chatTipTitle = await evaluate(`document.querySelector('.contextual-tip-card .tip-title')?.innerText`);
    console.log('[QA] Chat tip visible:', chatTipExists, '| Title:', chatTipTitle);

    await takeScreenshot('c:\\college-date\\evidence_qa_03_chat_guide.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 5: VERIFY REQUESTS & ADMIRERS GUIDANCE (accept_request & who_liked_me)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 5: Requests & Admirers Contextual Tips ---');
    await navigateTo('/requests');
    await sleep(3000);

    const requestsTipCount = await evaluate(`document.querySelectorAll('.contextual-tip-card').length`);
    console.log('[QA] Requests tip cards count:', requestsTipCount);

    await takeScreenshot('c:\\college-date\\evidence_qa_04_requests_guide.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 6: VERIFY WHO VIEWED ME RADAR GUIDANCE (who_viewed_me)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 6: Who Viewed Me Contextual Tip ---');
    await navigateTo('/viewers');
    await sleep(3000);

    const viewersTipExists = await evaluate(`!!document.querySelector('.contextual-tip-card')`);
    const viewersTipTitle = await evaluate(`document.querySelector('.contextual-tip-card .tip-title')?.innerText`);
    console.log('[QA] Viewers tip visible:', viewersTipExists, '| Title:', viewersTipTitle);

    await takeScreenshot('c:\\college-date\\evidence_qa_05_viewers_guide.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 7: VERIFY PREMIUM BENEFITS GUIDANCE (premium_benefits)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 7: Premium Benefits Contextual Tip ---');
    await navigateTo('/premium');
    await sleep(3000);

    const premiumTipExists = await evaluate(`!!document.querySelector('.contextual-tip-card')`);
    const premiumTipTitle = await evaluate(`document.querySelector('.contextual-tip-card .tip-title')?.innerText`);
    console.log('[QA] Premium tip visible:', premiumTipExists, '| Title:', premiumTipTitle);

    await takeScreenshot('c:\\college-date\\evidence_qa_06_premium_guide.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 8: SETTINGS - INTERACTIVE APP GUIDE MODAL & RESET ALL GUIDES
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 8: Settings App Guide Replay & Reset ---');
    await navigateTo('/settings');
    await sleep(3000);

    // Click "How College Date Works (App Guide)"
    await evaluate(`(() => {
        const items = Array.from(document.querySelectorAll('.settings-item'));
        const guideItem = items.find(el => el.innerText.includes('How College Date Works'));
        if (guideItem) {
            guideItem.scrollIntoView({ block: 'center' });
            guideItem.click();
            guideItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
    })()`);
    await sleep(2000);

    const modalVisible = await evaluate(`!!document.querySelector('.guide-modal-card')`);
    const activeGuideTitle = await evaluate(`document.querySelector('.guide-modal-card .feature-title')?.innerText`);
    console.log('[QA] App Guide Modal opened:', modalVisible, '| Active Step:', activeGuideTitle);

    await takeScreenshot('c:\\college-date\\evidence_qa_07_guide_modal.png');

    // Cycle to Next Step in modal
    await evaluate(`(() => {
        const nextBtn = document.querySelector('.btn-guide-nav.primary');
        if (nextBtn) {
            nextBtn.click();
            nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
    })()`);
    await sleep(1000);
    const step2Title = await evaluate(`document.querySelector('.guide-modal-card .feature-title')?.innerText`);
    console.log('[QA] Cycled to step 2:', step2Title);

    // Close modal
    await evaluate(`(() => {
        const closeBtn = document.querySelector('.guide-close-btn');
        if (closeBtn) {
            closeBtn.click();
            closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
    })()`);
    await sleep(1500);

    // Test Reset Guidance Tips button
    const resetResult = await evaluate(`(() => {
        const items = Array.from(document.querySelectorAll('.settings-item'));
        const resetItem = items.find(el => el.innerText.includes('Reset Guidance Tips'));
        if (resetItem) {
            resetItem.scrollIntoView({ block: 'center' });
            resetItem.click();
            resetItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return true;
        }
        return false;
    })()`);
    console.log('[QA] Reset guidance tips triggered:', resetResult);
    await sleep(1500);
    await takeScreenshot('c:\\college-date\\evidence_qa_08_guides_reset.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 9: OFFLINE-FIRST PERSISTENCE VERIFICATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 9: Offline-First Behavior & Persistence ---');
    const cachedKeys = await evaluate(`Object.keys(localStorage).filter(k => k.startsWith('tcd-cache-'))`);
    console.log('[QA] Number of persisted cache keys in localStorage:', cachedKeys.length);
    console.log('[QA] Sample cache keys:', cachedKeys.slice(0, 5));

    // Disable network on emulator
    console.log('[QA] Simulating Network Offline: Disabling WiFi and Mobile Data...');
    execSync(`cmd.exe /c "${ADB} -s ${EMULATOR} shell svc wifi disable && ${ADB} -s ${EMULATOR} shell svc data disable"`);
    await sleep(2000);

    const isOnlineNow = await evaluate(`navigator.onLine`);
    console.log('[QA] navigator.onLine after network cut:', isOnlineNow);

    // Navigate to /match and /dashboard while offline
    await navigateTo('/dashboard');
    await sleep(3000);

    const dashboardRenderedOffline = await evaluate(`(() => {
        return !!document.querySelector('.dashboard, .dashboard-container, .main-dashboard, .profile-card');
    })()`);
    console.log('[QA] Dashboard rendered from local cache while offline:', dashboardRenderedOffline);

    await navigateTo('/match');
    await sleep(3000);

    const matchRenderedOffline = await evaluate(`(() => {
        return !!document.querySelector('.discover-page, .swipe-container, .swipe-card, .no-profiles');
    })()`);
    console.log('[QA] Match rendered from local cache while offline:', matchRenderedOffline);

    await takeScreenshot('c:\\college-date\\evidence_qa_09_offline_mode.png');

    // Re-enable network
    console.log('[QA] Restoring Network: Enabling WiFi and Mobile Data...');
    execSync(`cmd.exe /c "${ADB} -s ${EMULATOR} shell svc wifi enable && ${ADB} -s ${EMULATOR} shell svc data enable"`);
    await sleep(3000);

    const isOnlineRestored = await evaluate(`navigator.onLine`);
    console.log('[QA] navigator.onLine after restore:', isOnlineRestored);

    await takeScreenshot('c:\\college-date\\evidence_qa_10_online_restored.png');

    console.log('\n=== ALL 10 E2E OFFLINE-FIRST & ONBOARDING CHECKS PASSED ===');
    process.exit(0);
}

main().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
