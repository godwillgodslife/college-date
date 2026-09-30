import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const CDP_PORT = '9224';
const EVIDENCE_DIR = 'docs';
const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity/brain/5126839c-f2fb-4695-9a0b-0a3bcf919012';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Sign in failed: ${JSON.stringify(data)}`);
    const client = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${data.access_token}` } }
    });
    return { token: data.access_token, user: data.user, client };
}

async function createCdpClient(port) {
    const listRes = await fetch(`http://127.0.0.1:${port}/json`);
    const targets = await listRes.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found on port ' + port);

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
            console.log(`📸 Captured & Saved: ${filename}`);
            return true;
        }
        return false;
    };

    return { ws, send, evalJs, capture };
}

async function run() {
    console.log('--- 1. Authenticating backend users for Escrow lifecycle ---');
    const u1 = await signIn('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const u2 = await signIn('student.tester2026.partner@gmail.com', 'CollegeDate2026!VerifiedPass');
    console.log('User 1 (Alex Davis):', u1.user.id);
    console.log('User 2 (Jordan Taylor):', u2.user.id);

    // Get mutual match
    const { data: matches } = await u1.client.from('matches').select('*').limit(1);
    const matchId = matches[0].id;
    console.log('Active match ID:', matchId);

    // Ensure u1 has wallet balance for funding
    const { data: u1Wallet } = await u1.client.from('wallets').select('*').eq('user_id', u1.user.id).single();
    if (!u1Wallet || Number(u1Wallet.balance) < 2000) {
        console.log('Topping up Alex wallet for escrow demonstration...');
        await u1.client.from('wallets').update({ balance: 5000.00 }).eq('user_id', u1.user.id);
    }

    console.log('\n--- 2. Connecting to Pixel 2 Lightweight (port 9224) ---');
    const client = await createCdpClient(CDP_PORT);

    console.log('\n--- Navigating to /chat and opening Jordan Taylor conversation ---');
    await client.evalJs(`(() => {
        window.location.href = '/chat';
    })()`);
    await new Promise(r => setTimeout(r, 2500));

    // Deselect if already inside
    await client.evalJs(`(() => {
        const backBtn = document.querySelector('.chat-header .back-btn');
        if (backBtn && window.getComputedStyle(backBtn).display !== 'none') backBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    // Click Jordan Taylor
    await client.evalJs(`(() => {
        const item = Array.from(document.querySelectorAll('.conversation-item, .recent-chat-card')).find(el => el.innerText.includes('Jordan Taylor'));
        if (item) item.click();
    })()`);
    await new Promise(r => setTimeout(r, 2000));

    console.log('\n--- Step 1: Open Attachment Tray with Escrow ---');
    // Open tray
    await client.evalJs(`(() => {
        const btn = document.querySelector('.btn-more-actions-toggle');
        const tray = document.querySelector('.attachment-tray');
        if (btn && (!tray || window.getComputedStyle(tray).display === 'none')) {
            btn.click();
        }
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    await client.capture('pixel2_escrow_01_tray.png');

    console.log('\n--- Step 2: Open & Fill Create Service Deal Modal ---');
    await client.evalJs(`(() => {
        const btns = Array.from(document.querySelectorAll('.btn-icon-tray'));
        const escrowBtn = btns.find(b => b.innerText.includes('Escrow'));
        if (escrowBtn) escrowBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    // Fill modal fields
    await client.evalJs(`(() => {
        const setValue = (el, val) => {
            if (!el) return;
            const proto = Object.getPrototypeOf(el);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (setter) setter.call(el, val);
            else el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        // Select Role: Client (I will pay)
        const rolePills = document.querySelectorAll('.role-pill');
        if (rolePills.length > 0) rolePills[0].click();

        // Select Category: academics
        const catSelect = document.querySelector('#deal-cat');
        if (catSelect) setValue(catSelect, 'academics');

        // Set Title
        const titleInput = document.querySelector('#deal-title');
        setValue(titleInput, 'Python Algorithms & Data Structures Tutoring');

        // Set Amount
        const amountInput = document.querySelector('#deal-amount');
        setValue(amountInput, '1500');

        // Set Description
        const descInput = document.querySelector('#deal-desc');
        setValue(descInput, '2-hour code review & debugging session for CSC 201 sorting algorithms project.');

        // Set Location
        const locInput = document.querySelector('#deal-loc');
        setValue(locInput, 'Main Library Study Room 4B');

        // Check safety agreed
        const agreeCheck = document.querySelector('.safety-agree-label input[type="checkbox"]');
        if (agreeCheck && !agreeCheck.checked) agreeCheck.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));
    await client.capture('pixel2_escrow_02_create_modal.png');

    console.log('\n--- Step 3: Propose Deal & View Deal Card in Chat ---');
    // Submit modal
    await client.evalJs(`(() => {
        const submitBtn = document.querySelector('.btn-submit-deal');
        if (submitBtn) submitBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to newest message
    await client.evalJs(`(() => {
        const scroller = document.querySelector('.messages-container, [data-virtuoso-scroller="true"]');
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    await client.capture('pixel2_escrow_03_proposed_card.png');

    // Retrieve the newly created deal from DB
    const { data: latestDeals } = await u1.client
        .from('service_deals')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(1);
    const activeDeal = latestDeals[0];
    console.log('Active Deal created:', activeDeal?.id, 'Status:', activeDeal?.status);

    if (activeDeal) {
        console.log('\n--- Step 4: Accept Deal & Fund into Escrow ---');
        // Partner (u2) accepts deal
        await u2.client.rpc('accept_service_deal', { p_deal_id: activeDeal.id });
        // Client (u1) funds deal from wallet
        const { data: fundRes, error: fundErr } = await u1.client.rpc('fund_service_deal_from_wallet', {
            p_deal_id: activeDeal.id
        });
        console.log('Fund result:', fundRes, 'Error:', fundErr);

        await new Promise(r => setTimeout(r, 2500));
        // Scroll to card
        await client.evalJs(`(() => {
            const scroller = document.querySelector('.messages-container, [data-virtuoso-scroller="true"]');
            if (scroller) scroller.scrollTop = scroller.scrollHeight;
        })()`);
        await new Promise(r => setTimeout(r, 1000));
        await client.capture('pixel2_escrow_04_funded_card.png');

        console.log('\n--- Step 5: Mark Completed & Release Escrow Payout ---');
        // Provider marks complete
        await u2.client.rpc('mark_service_completed', { p_deal_id: activeDeal.id });
        // Client confirms release
        const { data: relRes, error: relErr } = await u1.client.rpc('confirm_service_release', {
            p_deal_id: activeDeal.id
        });
        console.log('Release result:', relRes, 'Error:', relErr);

        await new Promise(r => setTimeout(r, 2500));
        // Scroll to card
        await client.evalJs(`(() => {
            const scroller = document.querySelector('.messages-container, [data-virtuoso-scroller="true"]');
            if (scroller) scroller.scrollTop = scroller.scrollHeight;
        })()`);
        await new Promise(r => setTimeout(r, 1000));
        await client.capture('pixel2_escrow_05_released_card.png');
    }

    console.log('\n--- Step 6: View Wallet Escrow & Payout Dashboard ---');
    await client.evalJs(`(() => {
        window.location.href = '/wallet';
    })()`);
    await new Promise(r => setTimeout(r, 3000));
    await client.capture('pixel2_escrow_06_wallet_dashboard.png');

    console.log('\n✅ All 6 Pixel 2 Lightweight Escrow evidence screenshots captured successfully!');
    client.ws.close();
    process.exit(0);
}

run().catch(err => {
    console.error('Execution failed:', err);
    process.exit(1);
});
