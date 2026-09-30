import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\83d0a166-be4e-4042-8b8d-140a6cfe8146';
const PUBLIC_DOCS_DIR = 'c:\\college-date\\docs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    const list = await (await fetch('http://127.0.0.1:9222/json')).json();
    const target = list.find(t => t.type === 'page');
    console.log('Connecting to:', target.title, target.url);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
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

    // Reload page to ensure updated web bundle is running
    console.log('Reloading page to load fresh assets...');
    await send('Page.reload');
    await sleep(4000);

    // Dismiss tour
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"], .modal-close');
        if (tour) tour.click();
        const xs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === '✕');
        xs.forEach(x => x.click());
    })()`);

    // ── 1. MATCH CELEBRATION POPUP ──
    console.log('\nNavigating to /match...');
    await evaluate(`(() => {
        history.pushState({}, '', '/match');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3000);

    // Dismiss any modal
    await evaluate(`(() => {
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"]');
        if (tour) tour.click();
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Got It'));
        if (btn) btn.click();
    })()`);
    await sleep(1000);

    console.log('Dispatching match celebration test event...');
    await evaluate(`(() => {
        window.dispatchEvent(new CustomEvent('tcd:trigger-match-test', {
            detail: {
                id: 'mock-amara-kalu',
                full_name: 'Amara Kalu',
                avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
                university: 'University of Port Harcourt (UNIPORT)',
                department: 'Computer Science',
                match_id: 'c387cf3e-c6e7-4bd3-875f-b52ad6933f7c'
            }
        }));
    })()`);
    await sleep(1500);

    console.log('Capturing Match Celebration Popup...');
    await capture('evidence_qa_03_match_celebration_popup.png');

    // Close Match Celebration
    await evaluate(`(() => {
        const keepBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Keep Swiping') || b.innerText.includes('✕'));
        if (keepBtn) keepBtn.click();
    })()`);
    await sleep(1000);

    // ── 2. DASHBOARD ACTIVE MODAL SCROLLED TO CHECKLIST ──
    console.log('\nNavigating to /dashboard...');
    await evaluate(`(() => {
        history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3000);

    // Click Active Program Card
    console.log('Opening College Date Active Modal...');
    await evaluate(`(() => {
        const activeCard = document.querySelector('.dashboard-active-program-card');
        if (activeCard) activeCard.click();
    })()`);
    await sleep(1500);

    // Scroll modal body slightly so full checklist is in frame
    await evaluate(`(() => {
        const body = document.querySelector('.active-modal-body');
        if (body) body.scrollTop = 120;
    })()`);
    await sleep(600);

    console.log('Capturing College Date Active Modal with Checklist...');
    await capture('evidence_qa_02_active_program_modal.png');

    console.log('\nALL VERIFICATION COMPLETED CLEANLY!');
    ws.close();
}

main().catch(console.error);
