import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const CDP_PORT = '9224';
const EVIDENCE_DIR = 'docs';
const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity/brain/5126839c-f2fb-4695-9a0b-0a3bcf919012';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function getClients() {
    async function authUser(email, pass) {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
            body: JSON.stringify({ email, password: pass })
        });
        const d = await res.json();
        return {
            user: d.user,
            token: d.access_token,
            client: createClient(SUPABASE_URL, ANON_KEY, {
                global: { headers: { Authorization: `Bearer ${d.access_token}` } }
            })
        };
    }
    const u1 = await authUser('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const u2 = await authUser('student.tester2026.partner@gmail.com', 'CollegeDate2026!VerifiedPass');
    return { u1, u2 };
}

async function getCdp() {
    const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
    const targets = await listRes.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found on port ' + CDP_PORT);

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();

    ws.on('message', (raw) => {
        const msg = JSON.parse(raw);
        if (msg.id && callbacks.has(msg.id)) {
            const cb = callbacks.get(msg.id);
            callbacks.delete(msg.id);
            cb(msg);
        }
    });

    const send = (method, params = {}) => new Promise((resolve) => {
        const curId = id++;
        callbacks.set(curId, (res) => resolve(res));
        ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await new Promise(r => ws.on('open', r));
    await send('Runtime.enable');
    await send('Page.enable');

    const evalJs = async (expr) => {
        const r = await send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        return r.result?.result?.value;
    };

    const capture = async (filename) => {
        const res = await send('Page.captureScreenshot', { format: 'png' });
        if (res?.result?.data) {
            const buffer = Buffer.from(res.result.data, 'base64');
            const docPath = path.join(EVIDENCE_DIR, filename);
            const artPath = path.join(ARTIFACT_DIR, filename);
            fs.writeFileSync(docPath, buffer);
            fs.writeFileSync(artPath, buffer);
            console.log(`📸 Saved: ${filename}`);
            return true;
        }
        return false;
    };

    return { ws, send, evalJs, capture };
}

async function main() {
    console.log('--- Connecting to Pixel 2 Lightweight (port 9224) ---');
    const cdp = await getCdp();
    const { u1, u2 } = await getClients();

    // Mutual match
    const { data: matches } = await u1.client.from('matches').select('*').limit(1);
    const matchId = matches[0].id;

    console.log('--- Proposing legitimate ₦600 Calculus Revision deal via RPC ---');
    const { data: dealRes, error: dealErr } = await u1.client.rpc('propose_service_deal', {
        p_match_id: matchId,
        p_title: 'Calculus 101 Midterm Prep',
        p_description: '2-hour focused revision covering differentiation rules, limits, and integration problem sets.',
        p_category: 'academics',
        p_amount: 600.00,
        p_provider_id: u2.user.id // Jordan Taylor provides, Alex Davis is client
    });
    console.log('Propose result:', dealRes, 'Error:', dealErr);
    const dealId = dealRes?.deal_id;

    // Navigate webview to /chat and open Jordan Taylor
    await cdp.evalJs(`(() => {
        window.location.href = '/chat';
    })()`);
    await new Promise(r => setTimeout(r, 2500));

    await cdp.evalJs(`(() => {
        const item = Array.from(document.querySelectorAll('.conversation-item, .recent-chat-card')).find(el => el.innerText.includes('Jordan Taylor'));
        if (item) item.click();
    })()`);
    await new Promise(r => setTimeout(r, 2000));

    // Scroll to proposed deal card
    await cdp.evalJs(`(() => {
        const scroller = document.querySelector('.messages-container, [data-virtuoso-scroller="true"]');
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
    })()`);
    await new Promise(r => setTimeout(r, 1000));
    await cdp.capture('pixel2_escrow_03_proposed_card.png');

    console.log('--- Step 4: Accept & Fund Deal ---');
    // u2 accepts
    await u2.client.rpc('accept_service_deal', { p_deal_id: dealId });
    // u1 funds from wallet
    const { data: fundRes, error: fundErr } = await u1.client.rpc('fund_service_deal_from_wallet', {
        p_deal_id: dealId
    });
    console.log('Fund result:', fundRes, 'Error:', fundErr);

    await new Promise(r => setTimeout(r, 2000));
    await cdp.evalJs(`(() => {
        const scroller = document.querySelector('.messages-container, [data-virtuoso-scroller="true"]');
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
    })()`);
    await new Promise(r => setTimeout(r, 1000));
    await cdp.capture('pixel2_escrow_04_funded_card.png');

    console.log('--- Step 5: Provider Marks Complete & Client Releases Escrow ---');
    await u2.client.rpc('mark_service_completed', { p_deal_id: dealId });
    const { data: relRes, error: relErr } = await u1.client.rpc('confirm_service_release', {
        p_deal_id: dealId
    });
    console.log('Release result:', relRes, 'Error:', relErr);

    await new Promise(r => setTimeout(r, 2000));
    await cdp.evalJs(`(() => {
        const scroller = document.querySelector('.messages-container, [data-virtuoso-scroller="true"]');
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
    })()`);
    await new Promise(r => setTimeout(r, 1000));
    await cdp.capture('pixel2_escrow_05_released_card.png');

    cdp.ws.close();
    console.log('Done!');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
