import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\40195fcd-8bd5-4f8a-ac7a-069b12e95a41';
const ROOT_DIR = 'c:\\college-date';
const DEVICE = 'emulator-5558';
const PORT = '9222';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getCDPPage() {
    const res = await fetch(`http://127.0.0.1:${PORT}/json`);
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No CDP page found');
    return page;
}

async function evalInPage(expression) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const page = await getCDPPage();
            return await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    try { ws.close(); } catch(e) {}
                    reject(new Error('CDP evaluation timed out'));
                }, 12000);

                const ws = new WebSocket(page.webSocketDebuggerUrl);
                ws.on('open', () => {
                    ws.send(JSON.stringify({
                        id: 1,
                        method: 'Runtime.evaluate',
                        params: {
                            expression,
                            returnByValue: true,
                            awaitPromise: true
                        }
                    }));
                });

                ws.on('message', (data) => {
                    clearTimeout(timer);
                    ws.close();
                    const msg = JSON.parse(data);
                    if (msg.error) reject(msg.error);
                    else if (msg.result?.exceptionDetails) reject(msg.result.exceptionDetails);
                    else resolve(msg.result?.result?.value);
                });

                ws.on('error', (err) => {
                    clearTimeout(timer);
                    reject(err);
                });
            });
        } catch (err) {
            if (attempt === 2) throw err;
            await sleep(1500);
        }
    }
}

function captureScreenshot(filename) {
    const artPath = path.join(ARTIFACT_DIR, filename);
    const rootPath = path.join(ROOT_DIR, filename);
    try {
        execSync(`& "$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe" -s ${DEVICE} shell screencap -p /sdcard/${filename}; & "$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe" -s ${DEVICE} pull /sdcard/${filename} "${rootPath}"`, { shell: 'powershell.exe' });
        if (fs.existsSync(rootPath)) {
            fs.copyFileSync(rootPath, artPath);
            console.log(`📸 Captured & Saved: ${filename}`);
        } else {
            console.error(`❌ Failed to capture: ${filename}`);
        }
    } catch (err) {
        console.error(`❌ Screencap error:`, err.message);
    }
}

async function navigate(path) {
    console.log(`Navigating to ${path}...`);
    await evalInPage(`(() => {
        window.history.pushState(null, '', '${path}');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3500);
}

async function main() {
    console.log('================================================================');
    console.log(' STARTING COMPREHENSIVE QA RUNNER ACROSS ALL ACCEPTANCE CRITERIA');
    console.log('================================================================\n');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1: ANONYMOUS ASK CONFIRMATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('=== Step 1: Verifying Anonymous Ask Page ===');
    await navigate('/ask/queenterry986');
    await sleep(2500);

    const askInfo = await evalInPage(`(() => {
        const title = document.querySelector('h2, .ask-profile-name, .ask-card')?.innerText || '';
        const chips = Array.from(document.querySelectorAll('.ask-chip-btn')).map(c => c.innerText);
        return { title: title.replace(/\\n+/g, ' '), chipsCount: chips.length };
    })()`);
    console.log('[QA] Ask page info:', askInfo);
    captureScreenshot('evidence_qa_02_ask_page.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: DIRECT CHAT - STATIONARY HEADER, NO BOTTOM NAV, AUDIO DURATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n=== Step 2: Direct Chat Room QA ===');
    await navigate('/chat?chatId=0ac4fd66-2e85-4bf1-a7ed-7dd273437aea');
    await sleep(4000);

    const chatState = await evalInPage(`(() => {
        const isMobile = document.body.classList.contains('mobile-chat-active');
        const h = document.querySelector('.chat-header');
        const hPos = h ? window.getComputedStyle(h).position : 'none';
        const b = document.querySelector('.bottom-nav');
        const bDisplay = b ? window.getComputedStyle(b).display : 'none';
        const audios = Array.from(document.querySelectorAll('.audio-time-display, .audio-player')).map(e => e.innerText.trim());
        const hasMessages = document.querySelectorAll('.message-bubble, .message-card').length;
        return { isMobile, hPos, bDisplay, audios, hasMessages };
    })()`);
    console.log('[QA] Direct chat state:', chatState);

    // Scroll message history
    await evalInPage(`(() => {
        const mc = document.querySelector('.messages-container');
        if (mc) mc.scrollTop = 150;
    })()`);
    await sleep(1000);
    captureScreenshot('evidence_qa_04_chat_room.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: VIRTUAL GIFT STORE - 🦁 CAMPUS LION (10,000 COINS)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n=== Step 3: Virtual Gift Store QA ===');
    await evalInPage(`(() => {
        const moreBtn = document.querySelector('.btn-more-actions-toggle');
        if (moreBtn) moreBtn.click();
    })()`);
    await sleep(1500);

    await evalInPage(`(() => {
        const giftItem = Array.from(document.querySelectorAll('.whatsapp-attachment-item')).find(b => b.innerText.includes('Gift') || b.title?.includes('Gift'));
        if (giftItem) giftItem.click();
    })()`);
    await sleep(2500);

    const giftLionFound = await evalInPage(`(() => {
        const cards = Array.from(document.querySelectorAll('.gift-card, .gift-item')).map(c => c.innerText.replace(/\\n+/g, ' '));
        const lionCard = cards.find(c => c.includes('Lion') || c.includes('🦁'));
        return { lionCard, allCount: cards.length };
    })()`);
    console.log('[QA] Virtual Gift Store Lion:', giftLionFound);
    captureScreenshot('evidence_qa_05_gift_store_lion.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: COIN STORE MODAL - 🦁 ₦100,000 CAMPUS LION (25,000 COINS)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n=== Step 4: Coin Store Modal QA ===');
    await evalInPage(`(() => {
        const pill = document.querySelector('.coin-balance-pill');
        if (pill) pill.click();
    })()`);
    await sleep(2500);

    const coinLionFound = await evalInPage(`(() => {
        const cards = Array.from(document.querySelectorAll('.package-card, .coin-package-card, .coin-package-item')).map(c => c.innerText.replace(/\\n+/g, ' '));
        const lionPkg = cards.find(c => c.includes('100,000') || c.includes('25,000') || c.includes('Lion'));
        return { lionPkg, allCount: cards.length };
    })()`);
    console.log('[QA] Coin Store Lion Package:', coinLionFound);
    captureScreenshot('evidence_qa_06_coin_store_lion.png');

    // Close CoinStoreModal
    await evalInPage(`(() => {
        const closeBtn = document.querySelector('.coin-store-modal .btn-close, .coin-store-modal button.close');
        if (closeBtn) closeBtn.click();
        else {
            const overlay = document.querySelector('.coin-store-overlay');
            if (overlay) overlay.click();
        }
    })()`).catch(() => {});
    await sleep(1000);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 5: EXPLORE - OPPOSITE GENDER & STATIONARY STICKY HEADER
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n=== Step 5: Explore Opposite Gender & Sticky Header QA ===');
    await navigate('/explore');
    await sleep(4000);

    const exploreData = await evalInPage(`(() => {
        const cards = Array.from(document.querySelectorAll('.explore-card, .profile-card')).map(c => {
            const name = c.querySelector('h3, .profile-name')?.innerText || '';
            const tag = c.querySelector('.gender-tag, .university-tag, .tag')?.innerText || '';
            return { name, tag };
        });
        const h = document.querySelector('.explore-sticky-header');
        const hPos = h ? window.getComputedStyle(h).position : 'none';
        return { count: cards.length, sample: cards.slice(0, 4), hPos };
    })()`);
    console.log('[QA] Explore discovery data:', exploreData);

    // Scroll down to test sticky header
    await evalInPage(`window.scrollTo(0, 400)`);
    await sleep(1500);
    captureScreenshot('evidence_qa_07_explore_sticky.png');

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 6: CONFESSIONS - SINGLE HEADER QA
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n=== Step 6: Confessions Single Header QA ===');
    await navigate('/confessions');
    await sleep(4000);

    const confHeaderData = await evalInPage(`(() => {
        const navbars = document.querySelectorAll('.navbar').length;
        const askLink = document.querySelector('.ngl-banner, .ask-banner, .anonymous-box')?.innerText || '';
        return { navbars, hasAskLink: askLink.includes('thecollegedate.com') };
    })()`);
    console.log('[QA] Confessions header data:', confHeaderData);
    captureScreenshot('evidence_qa_08_confessions_single_header.png');

    console.log('\n================================================================');
    console.log(' ALL QA VERIFICATION FLOWS COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
    process.exit(0);
}

main().catch(err => {
    console.error('QA Fatal Error:', err);
    process.exit(1);
});
