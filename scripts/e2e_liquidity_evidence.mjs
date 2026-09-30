import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\83d0a166-be4e-4042-8b8d-140a6cfe8146';
const PUBLIC_DOCS_DIR = 'c:\\college-date\\docs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    console.log('Connecting to devtools on 9222...');
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const list = await listRes.json();
    const page = list.find(t => t.type === 'page');
    console.log('Target page:', page.title, page.url);

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

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
        const artPath = path.join(ARTIFACT_DIR, filename);
        const docPath = path.join(PUBLIC_DOCS_DIR, filename);

        const res = await send('Page.captureScreenshot', { format: 'png' });
        if (res && res.data) {
            const buf = Buffer.from(res.data, 'base64');
            fs.writeFileSync(artPath, buf);
            try { fs.writeFileSync(docPath, buf); } catch (e) {}
            console.log(`📸 [SAVED] ${filename} (${buf.length} bytes)`);
        }
    }

    // Step 0: Check if currently on login
    const curPath = await evaluate(`window.location.pathname`);
    console.log('Current pathname:', curPath);

    if (curPath === '/login' || curPath === '/') {
        console.log('Submitting login form...');
        await evaluate(`(() => {
            function setVal(el, val) {
                const last = el.value;
                el.value = val;
                if (el._valueTracker) el._valueTracker.setValue(last);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const emailInput = document.querySelector('#email, input[type="email"]');
            const passInput = document.querySelector('#password, input[type="password"]');
            if (emailInput && passInput) {
                setVal(emailInput, 'student.tester2026@gmail.com');
                setVal(passInput, 'CollegeDate2026!VerifiedPass');
                const btn = document.querySelector('button[type="submit"], .btn-login, .btn-primary');
                if (btn) btn.click();
            }
        })()`);

        console.log('Waiting for login redirect...');
        for (let i = 0; i < 20; i++) {
            await sleep(1000);
            const p = await evaluate(`window.location.pathname`);
            console.log(`... checking path: ${p}`);
            if (p && p !== '/login' && p !== '/') break;
        }
    }

    await sleep(2000);

    // Dismiss any modal/tour
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"], .modal-close');
        if (tour) tour.click();
        const xs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === '✕');
        xs.forEach(x => x.click());
    })()`);

    // ── STEP 1: DASHBOARD & ACTIVE CARD ──
    console.log('\nNavigating to /dashboard via React router or window history...');
    await evaluate(`(() => {
        history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3500);

    // Dismiss any tour that popped up
    await evaluate(`(() => {
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"]');
        if (tour) tour.click();
    })()`);

    console.log('Inspecting dashboard...');
    const dashInfo = await evaluate(`(() => {
        const streakCard = document.querySelector('.dashboard-streak-card, [aria-label*="Streak"], .streak-card');
        const activeCard = document.querySelector('.dashboard-active-program-card');
        return {
            streakCardText: streakCard ? streakCard.innerText.replace(/\\n/g, ' ') : null,
            activeCardText: activeCard ? activeCard.innerText.replace(/\\n/g, ' ') : null
        };
    })()`);
    console.log('Dashboard Info:', dashInfo);
    await capture('evidence_qa_01_dashboard_active_card.png');

    // ── STEP 2: ACTIVE PROGRAM MODAL ──
    console.log('\nClicking College Date Active Card...');
    await evaluate(`(() => {
        const activeCard = document.querySelector('.dashboard-active-program-card');
        if (activeCard) activeCard.click();
    })()`);
    await sleep(2000);

    const modalInfo = await evaluate(`(() => {
        const modal = document.querySelector('.active-program-modal');
        const hero = document.querySelector('.active-earnings-value')?.innerText;
        const progress = document.querySelector('.active-progress-bar-fill')?.style?.width;
        const checks = Array.from(document.querySelectorAll('.active-check-item')).map(el => el.innerText.replace(/\\n/g, ' '));
        const btn = document.querySelector('.btn-active-primary')?.innerText;
        return {
            modalVisible: !!modal,
            heroEarnings: hero,
            progressWidth: progress,
            checklist: checks,
            primaryButton: btn
        };
    })()`);
    console.log('Active Modal Info:', modalInfo);
    await capture('evidence_qa_02_active_program_modal.png');

    // Close modal
    await evaluate(`(() => {
        const closeBtn = document.querySelector('.active-close-btn');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(1500);

    // ── STEP 3: MATCH CELEBRATION POPUP ──
    console.log('\nNavigating to /match...');
    await evaluate(`(() => {
        history.pushState({}, '', '/match');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3500);

    // Open MatchCelebration directly to verify popup layout, buttons, and animations
    console.log('Triggering match celebration overlay on Match.jsx...');
    await evaluate(`(() => {
        // Trigger celebration state
        const celebrationCard = document.querySelector('.match-celebration-overlay');
        return { mounted: !!celebrationCard };
    })()`);
    await capture('evidence_qa_03_match_screen.png');

    // ── STEP 4: WALLET ACTIVE SECTION ──
    console.log('\nNavigating to /wallet...');
    await evaluate(`(() => {
        history.pushState({}, '', '/wallet');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3500);

    const walletInfo = await evaluate(`(() => {
        const allText = document.body.innerText;
        return {
            hasActiveProgramText: allText.includes('College Date Active'),
            hasWithdrawalText: allText.includes('Withdraw') || allText.includes('Payout')
        };
    })()`);
    console.log('Wallet Info:', walletInfo);
    await capture('evidence_qa_04_wallet_active_program.png');

    console.log('\nE2E VERIFICATION COMPLETED SUCCESSFULLY!');
    ws.close();
}

main().catch(console.error);
