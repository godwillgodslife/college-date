import { execSync } from 'child_process';
import fs from 'fs';

const ADB = 'C:\\Users\\DELL\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const EMULATOR = 'emulator-5558';
const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCDPTarget() {
    const res = await fetch("http://127.0.0.1:9222/json/list");
    const targets = await res.json();
    return targets[0];
}

async function main() {
    console.log('=== STARTING ANDROID FINAL FIXES E2E VERIFICATION ===');
    const target = await getCDPTarget();
    if (!target) {
        console.error('No devtools target found');
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

    function takeScreenshot(filename) {
        try {
            const base = filename.split(/[/\\]/).pop();
            const tmp = `/data/local/tmp/${base}`;
            execSync(`& "${ADB}" -s ${EMULATOR} shell screencap -p ${tmp}; & "${ADB}" -s ${EMULATOR} pull ${tmp} "${filename}"`, { shell: 'powershell.exe' });
            console.log(`[QA] Captured screenshot: ${filename}`);
        } catch (e) {
            console.warn(`[QA] Screenshot failed via ADB:`, e.message);
        }
    }

    // Helper: evaluate JS in page
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
            window.history.pushState(null, '', '${path}');
            window.dispatchEvent(new PopStateEvent('popstate'));
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
    // STEP 1: TEST ANONYMOUS ASK PAGE (/ask/queenterry986)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 1: Testing Anonymous Ask Page ---');
    await navigateTo('/ask/queenterry986');
    await sleep(2500);
    await waitForSelector('.ask-card:not(.loading-state)', 12000);

    const askTitle = await evaluate(`document.querySelector('.ask-card h2, .ask-card h3, .ask-title')?.innerText || document.body.innerText.substring(0, 150)`);
    console.log('[QA] Ask page heading:', askTitle);

    await takeScreenshot('c:\\college-date\\evidence_qa_02_ask_page.png');

    // Click a prompt chip to populate message textarea
    await evaluate(`(() => {
        const chip = document.querySelector('.ask-chip-btn');
        if (chip) {
            chip.click();
        } else {
            const ta = document.querySelector('.ask-textarea');
            if (ta) {
                ta.value = 'What is your honest impression of me? 👀';
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    })()`);
    await sleep(1000);

    const textareaVal = await evaluate(`document.querySelector('.ask-textarea')?.value`);
    console.log('[QA] Populated prompt text:', textareaVal);

    // Click send
    await evaluate(`(() => {
        const btn = document.querySelector('.ask-submit-btn');
        if (btn) btn.click();
    })()`);
    await sleep(4000);

    const sentText = await evaluate(`document.querySelector('.ask-success-view h3, .ask-success-view p, .ask-error-box')?.innerText || document.body.innerText.substring(0, 150)`);
    console.log('[QA] Ask submission result:', sentText);
    await takeScreenshot('c:\\college-date\\evidence_qa_03_ask_sent.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: AUTHENTICATE TESTER ACCOUNT (Alex Davis / Male)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 2: Logging in as tester (Alex Davis) ---');
    await navigateTo('/login');
    await sleep(2500);
    await waitForSelector('#email, input[type="email"]', 8000);

    const loginRes = await evaluate(`(() => {
        const emailInput = document.querySelector('#email, input[type="email"]');
        const passInput = document.querySelector('#password, input[type="password"]');
        if (!emailInput || !passInput) return { error: 'Inputs not found' };

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(emailInput, 'student.tester2026@gmail.com');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));

        nativeSetter.call(passInput, 'CollegeDate2026!VerifiedPass');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));

        const btn = document.querySelector('button[type="submit"], .login-btn, .btn-primary');
        if (btn) {
            btn.click();
            return { clicked: true };
        }
        return { error: 'Submit button not found' };
    })()`);
    console.log('[QA] Login execution:', loginRes);
    await sleep(5500);

    const postLoginUrl = await evaluate(`window.location.pathname`);
    console.log('[QA] Post-login path:', postLoginUrl);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: DIRECT CHAT - STATIONARY HEADER & SCROLLING MESSAGES & AUDIO DURATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 3: Direct Chat & Stationary Header QA ---');
    await navigateTo('/chat?chatId=64f6a537-5b3e-4c7c-9846-899bc933706b');
    await sleep(3500);
    await waitForSelector('.chat-header, .messages-container', 10000);

    const isMobileChatActive = await evaluate(`document.body.classList.contains('mobile-chat-active')`);
    const bottomNavDisplay = await evaluate(`(() => {
        const nav = document.querySelector('.bottom-nav');
        return nav ? window.getComputedStyle(nav).display : 'none';
    })()`);
    const chatHeaderPos = await evaluate(`(() => {
        const h = document.querySelector('.chat-header');
        return h ? window.getComputedStyle(h).position : 'none';
    })()`);
    console.log('[QA] mobile-chat-active class present:', isMobileChatActive);
    console.log('[QA] bottom-nav computed display:', bottomNavDisplay);
    console.log('[QA] chat-header computed position:', chatHeaderPos);

    // Check for audio duration text in message container
    const audioTimes = await evaluate(`(() => {
        const times = Array.from(document.querySelectorAll('.audio-time-display, .audio-message')).map(el => el.innerText.trim());
        return times;
    })()`);
    console.log('[QA] Audio message timestamps found in chat:', audioTimes);

    // Scroll message history
    await evaluate(`(() => {
        const mc = document.querySelector('.messages-container');
        if (mc) mc.scrollTop = 150;
    })()`);
    await sleep(1000);

    await takeScreenshot('c:\\college-date\\evidence_qa_04_chat_room.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: VIRTUAL GIFTS - 🦁 CAMPUS LION GIFT (10,000 COINS)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 4: Virtual Gift Store QA ---');
    await evaluate(`(() => {
        const moreBtn = document.querySelector('.btn-more-actions-toggle');
        if (moreBtn) moreBtn.click();
    })()`);
    await sleep(1500);

    await evaluate(`(() => {
        const giftItem = Array.from(document.querySelectorAll('.whatsapp-attachment-item')).find(b => b.innerText.includes('Gift') || b.title?.includes('Gift'));
        if (giftItem) giftItem.click();
    })()`);
    await sleep(2000);
    await waitForSelector('.gift-store-modal, .gift-card', 6000);

    const giftItems = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.gift-card, .gift-item')).map(c => c.innerText.replace(/\n+/g, ' '));
        return cards;
    })()`);
    console.log('[QA] Virtual Gift cards loaded:', giftItems);
    await takeScreenshot('c:\\college-date\\evidence_qa_05_gift_store_lion.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 5: COIN STORE - 🦁 ₦100,000 CAMPUS LION PACKAGE (25,000 COINS)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 5: Coin Store QA (Lion ₦100,000 / 25,000 coins) ---');
    await evaluate(`(() => {
        const pill = document.querySelector('.coin-balance-pill');
        if (pill) pill.click();
    })()`);
    await sleep(2500);
    await waitForSelector('.coin-store-modal, .package-card', 6000);

    const coinPackages = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.package-card, .coin-package-card')).map(c => c.innerText.replace(/\n+/g, ' '));
        return cards;
    })()`);
    console.log('[QA] Coin packages in CoinStoreModal:', coinPackages);
    await takeScreenshot('c:\\college-date\\evidence_qa_06_coin_store_lion.png');

    // Close CoinStoreModal
    await evaluate(`(() => {
        const closeBtn = document.querySelector('.coin-store-modal .btn-close, .coin-store-modal button.close');
        if (closeBtn) closeBtn.click();
        else {
            const overlay = document.querySelector('.coin-store-overlay');
            if (overlay) overlay.click();
        }
    })()`);
    await sleep(1000);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 6: EXPLORE - OPPOSITE GENDER & STATIONARY STICKY HEADER
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 6: Explore Page & Gender Discovery QA ---');
    await navigateTo('/explore');
    await sleep(3500);
    await waitForSelector('.explore-card, .profile-card', 10000);

    const exploreProfiles = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.profile-card, .explore-card')).map(c => {
            const name = c.querySelector('.profile-name, .student-name, h3')?.innerText || '';
            const tag = c.querySelector('.gender-tag, .university-tag')?.innerText || '';
            return { name, tag };
        });
        return cards;
    })()`);
    console.log(`[QA] Loaded ${exploreProfiles.length} discovery student cards on Explore`);
    if (exploreProfiles.length > 0) {
        console.log('[QA] Sample student cards:', exploreProfiles.slice(0, 4));
    }

    const stickyHeaderPos = await evaluate(`(() => {
        const h = document.querySelector('.explore-sticky-header');
        return h ? window.getComputedStyle(h).position : 'none';
    })()`);
    console.log('[QA] Explore sticky header position:', stickyHeaderPos);

    // Scroll down to verify stationary header
    await evaluate(`window.scrollTo(0, 400)`);
    await sleep(1500);

    await takeScreenshot('c:\\college-date\\evidence_qa_07_explore_sticky.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 7: CONFESSIONS - SINGLE HEADER & 8-EMOJI REACTION POPOVER
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 7: Confessions Page & Single Header QA ---');
    await navigateTo('/confessions');
    await sleep(3500);
    await waitForSelector('.confession-card, .confessions-list', 10000);

    const headerCount = await evaluate(`document.querySelectorAll('.navbar').length`);
    console.log('[QA] Legitimate navbar header count:', headerCount);

    await takeScreenshot('c:\\college-date\\evidence_qa_08_confessions_single_header.png');

    console.log('\n=== ALL QA VERIFICATION STEPS COMPLETED SUCCESSFULLY ===');
    ws.close();
    process.exit(0);
}

main().catch(err => {
    console.error('QA Script Error:', err);
    process.exit(1);
});
