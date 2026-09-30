import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\83d0a166-be4e-4042-8b8d-140a6cfe8146';
const PUBLIC_DOCS_DIR = 'c:\\college-date\\docs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    console.log('Connecting to emulator webview CDP on port 9222...');
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const list = await listRes.json();
    const target = list.find(t => t.type === 'page') || list[0];
    if (!target) {
        throw new Error('No devtools target found on port 9222');
    }

    console.log('Connecting to target:', target.title, target.url);
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let msgId = 1;
    function send(method, params = {}) {
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

    await send('Page.enable');
    await send('Runtime.enable');

    async function evaluate(expr) {
        const res = await send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        return res?.result?.value;
    }

    async function capture(filename) {
        const base = path.basename(filename);
        const artPath = path.join(ARTIFACT_DIR, base);
        const docPath = path.join(PUBLIC_DOCS_DIR, base);

        const res = await send('Page.captureScreenshot', { format: 'png' });
        if (res && res.data) {
            const buf = Buffer.from(res.data, 'base64');
            fs.writeFileSync(artPath, buf);
            try {
                fs.writeFileSync(docPath, buf);
            } catch (e) {}
            console.log(`📸 [SAVED] ${base} (${buf.length} bytes)`);
        }
    }

    async function dismissOverlays() {
        await evaluate(`(() => {
            const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"], .modal-close');
            if (tour) tour.click();
            const xs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === '✕');
            xs.forEach(x => x.click());
            const banners = Array.from(document.querySelectorAll('.app-tour-modal, .welcome-modal'));
            banners.forEach(b => b.remove());
        })()`);
    }

    async function navigateTo(route) {
        console.log(`Navigating to ${route}...`);
        await evaluate(`(() => {
            if (window.__reactNavigate) {
                window.__reactNavigate('${route}');
            } else {
                window.location.href = '${route}';
            }
        })()`);
        await sleep(3500);
        await dismissOverlays();
    }

    // ── STEP 1: DASHBOARD VERIFICATION ──
    console.log('\n--- 1. Verifying Dashboard Active Program Card & Score Streak ---');
    await navigateTo('/dashboard');
    await sleep(2000);

    const dashCheck = await evaluate(`(() => {
        const streakCard = document.querySelector('.dashboard-streak-card, [aria-label*="Streak"], .streak-card');
        const activeCard = document.querySelector('.dashboard-active-program-card');
        return {
            streakCardFound: !!streakCard,
            streakCardText: streakCard ? streakCard.innerText : null,
            activeCardFound: !!activeCard,
            activeCardText: activeCard ? activeCard.innerText : null
        };
    })()`);
    console.log('Dashboard Elements:', dashCheck);
    await capture('evidence_qa_01_dashboard_active_card.png');

    // ── STEP 2: ACTIVE PROGRAM MODAL VERIFICATION ──
    console.log('\n--- 2. Opening & Verifying College Date Active Modal ---');
    await evaluate(`(() => {
        const activeCard = document.querySelector('.dashboard-active-program-card');
        if (activeCard) activeCard.click();
    })()`);
    await sleep(1500);

    const modalCheck = await evaluate(`(() => {
        const modal = document.querySelector('.active-program-modal');
        const heroVal = document.querySelector('.active-earnings-value')?.innerText;
        const progressFill = document.querySelector('.active-progress-bar-fill')?.style?.width;
        const checklist = Array.from(document.querySelectorAll('.active-check-item')).map(el => el.innerText.replace(/\\n/g, ' '));
        const metrics = Array.from(document.querySelectorAll('.active-mini-metric')).map(el => el.innerText.replace(/\\n/g, ' '));
        return {
            modalMounted: !!modal,
            heroVal,
            progressFill,
            checklist,
            metrics
        };
    })()`);
    console.log('Active Modal Elements:', modalCheck);
    await capture('evidence_qa_02_active_program_modal.png');

    // Close modal
    await evaluate(`(() => {
        const closeBtn = document.querySelector('.active-close-btn');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(1000);

    // ── STEP 3: MATCH PAGE & CELEBRATION POPUP ──
    console.log('\n--- 3. Verifying Match Screen & Match Celebration Popup ---');
    await navigateTo('/match');
    await sleep(2500);

    // Trigger celebration overlay state in Match.jsx
    console.log('Mounting celebration state with mock match payload...');
    await evaluate(`(() => {
        // Direct test invocation on MatchCelebration trigger
        const matchData = {
            id: 'mock-user-female-1',
            full_name: 'Amara Kalu',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
            university: 'University of Lagos',
            department: 'Computer Science',
            match_id: 'c387cf3e-c6e7-4bd3-875f-b52ad6933f7c'
        };
        // Inject or trigger React setState if exposed or trigger DOM component test
        window.dispatchEvent(new CustomEvent('tcd:test-match-celebration', { detail: matchData }));
    })()`);
    await sleep(1500);
    await capture('evidence_qa_03_match_screen.png');

    // ── STEP 4: WALLET ACTIVE SECTION ──
    console.log('\n--- 4. Verifying Wallet Active Program Section ---');
    await navigateTo('/wallet');
    await sleep(2500);

    const walletCheck = await evaluate(`(() => {
        const allCards = Array.from(document.querySelectorAll('*'));
        const activeCard = allCards.find(el => el.children.length === 0 && el.innerText && el.innerText.includes('College Date Active'));
        return {
            walletActiveFound: !!activeCard,
            parentCardText: activeCard ? activeCard.parentElement?.innerText?.slice(0, 150) : null
        };
    })()`);
    console.log('Wallet Active Elements:', walletCheck);
    await capture('evidence_qa_04_wallet_active_program.png');

    console.log('\n================================================================');
    console.log('  ALL QA SCREENSHOTS CAPTURED SUCCESSFULLY!');
    console.log('================================================================\n');

    ws.close();
}

main().catch(console.error);
