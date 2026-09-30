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

const step = process.argv[2] || 'all';

async function main() {
    const cdp = await getCdp();

    if (step === '1' || step === 'all') {
        console.log('--- Step 1: Open Attachment Tray ---');
        await cdp.evalJs(`(() => {
            const tray = document.querySelector('.attachment-tray');
            if (!tray || window.getComputedStyle(tray).display === 'none') {
                const btn = document.querySelector('.btn-more-actions-toggle');
                if (btn) btn.click();
            }
        })()`);
        await new Promise(r => setTimeout(r, 1200));
        await cdp.capture('pixel2_escrow_01_tray.png');
    }

    if (step === '2' || step === 'all') {
        console.log('--- Step 2: Open & Fill Create Deal Modal ---');
        await cdp.evalJs(`(() => {
            const btns = Array.from(document.querySelectorAll('.btn-icon-tray'));
            const escrowBtn = btns.find(b => b.innerText.includes('Escrow'));
            if (escrowBtn) escrowBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 1500));

        // Fill modal fields
        await cdp.evalJs(`(() => {
            const setValue = (el, val) => {
                if (!el) return;
                const proto = Object.getPrototypeOf(el);
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                if (setter) setter.call(el, val);
                else el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            };

            const rolePills = document.querySelectorAll('.role-pill');
            if (rolePills.length > 0) rolePills[0].click(); // Client role

            const catSelect = document.querySelector('#deal-cat');
            if (catSelect) setValue(catSelect, 'academics');

            const titleInput = document.querySelector('#deal-title');
            setValue(titleInput, 'Calculus & Linear Algebra Tutoring');

            const amountInput = document.querySelector('#deal-amount');
            setValue(amountInput, '2500');

            const descInput = document.querySelector('#deal-desc');
            setValue(descInput, '2-hour comprehensive tutoring session covering matrix transformations and vector calculus for upcoming midterms.');

            const locInput = document.querySelector('#deal-loc');
            setValue(locInput, 'Main Campus Library - Study Room 3B');

            const agreeCheck = document.querySelector('.safety-agree-label input[type="checkbox"]');
            if (agreeCheck && !agreeCheck.checked) agreeCheck.click();
        })()`);
        await new Promise(r => setTimeout(r, 1000));
        await cdp.capture('pixel2_escrow_02_create_modal.png');
    }

    if (step === '3' || step === 'all') {
        console.log('--- Step 3: Propose Deal & View Proposed Card in Chat ---');
        await cdp.evalJs(`(() => {
            const submitBtn = document.querySelector('.btn-submit-deal');
            if (submitBtn) submitBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 3000));

        // Scroll to card
        await cdp.evalJs(`(() => {
            const scroller = document.querySelector('.messages-container, [data-virtuoso-scroller="true"]');
            if (scroller) scroller.scrollTop = scroller.scrollHeight;
        })()`);
        await new Promise(r => setTimeout(r, 1000));
        await cdp.capture('pixel2_escrow_03_proposed_card.png');
    }

    if (step === '4' || step === 'all') {
        console.log('--- Step 4: Accept & Fund Escrow ---');
        const { u1, u2 } = await getClients();
        // Find newest deal
        const { data: deals } = await u1.client
            .from('service_deals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
        const deal = deals[0];
        console.log('Active deal for funding:', deal?.id, 'Status:', deal?.status);

        if (deal && deal.status === 'proposed') {
            await u2.client.rpc('accept_service_deal', { p_deal_id: deal.id });
            console.log('Deal accepted by partner');
            await new Promise(r => setTimeout(r, 1000));
        }

        // Ensure u1 has wallet balance
        await u1.client.from('wallets').update({ balance: 10000.00 }).eq('user_id', u1.user.id);

        // Fund deal
        const { data: fundRes, error: fundErr } = await u1.client.rpc('fund_service_deal_from_wallet', {
            p_deal_id: deal.id
        });
        console.log('Fund result:', fundRes, 'Error:', fundErr);

        await new Promise(r => setTimeout(r, 2000));
        await cdp.evalJs(`(() => {
            const scroller = document.querySelector('.messages-container, [data-virtuoso-scroller="true"]');
            if (scroller) scroller.scrollTop = scroller.scrollHeight;
        })()`);
        await new Promise(r => setTimeout(r, 1000));
        await cdp.capture('pixel2_escrow_04_funded_card.png');
    }

    if (step === '5' || step === 'all') {
        console.log('--- Step 5: Mark Complete & Release Escrow ---');
        const { u1, u2 } = await getClients();
        const { data: deals } = await u1.client
            .from('service_deals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
        const deal = deals[0];
        console.log('Active deal for completion:', deal?.id, 'Status:', deal?.status);

        if (deal && (deal.status === 'funded' || deal.status === 'completed_by_provider')) {
            if (deal.status === 'funded') {
                await u2.client.rpc('mark_service_completed', { p_deal_id: deal.id });
                console.log('Marked complete by provider');
                await new Promise(r => setTimeout(r, 1000));
            }
            const { data: relRes, error: relErr } = await u1.client.rpc('confirm_service_release', {
                p_deal_id: deal.id
            });
            console.log('Release result:', relRes, 'Error:', relErr);
        }

        await new Promise(r => setTimeout(r, 2000));
        await cdp.evalJs(`(() => {
            const scroller = document.querySelector('.messages-container, [data-virtuoso-scroller="true"]');
            if (scroller) scroller.scrollTop = scroller.scrollHeight;
        })()`);
        await new Promise(r => setTimeout(r, 1000));
        await cdp.capture('pixel2_escrow_05_released_card.png');
    }

    if (step === '6' || step === 'all') {
        console.log('--- Step 6: View Wallet Escrow & Payout Dashboard ---');
        await cdp.evalJs(`(() => {
            window.location.href = '/wallet';
        })()`);
        await new Promise(r => setTimeout(r, 3000));
        await cdp.capture('pixel2_escrow_06_wallet_dashboard.png');
    }

    cdp.ws.close();
    console.log('Execution completed.');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
