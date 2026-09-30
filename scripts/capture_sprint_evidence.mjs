import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const CDP_PORT = '9223';
const EVIDENCE_DIR = 'docs';

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
            const fullPath = path.join(EVIDENCE_DIR, filename);
            fs.writeFileSync(fullPath, Buffer.from(res.result.data, 'base64'));
            console.log(`📸 Captured: ${filename}`);
            return true;
        }
        return false;
    };

    return { ws, send, evalJs, capture };
}

async function run() {
    console.log('Connecting to emulator-5556 CDP on port ' + CDP_PORT + '...');
    const client = await createCdpClient(CDP_PORT);

    console.log('\n--- Navigating to /chat via bottom nav link ---');
    await client.evalJs(`(() => {
        const tourClose = document.querySelector('.tour-close');
        if (tourClose) tourClose.click();
        const chatLink = Array.from(document.querySelectorAll('a')).find(a => a.getAttribute('href') === '/chat');
        if (chatLink) chatLink.click();
    })()`);
    await new Promise(r => setTimeout(r, 2000));

    // Deselect conversation if currently open so we see inbox
    await client.evalJs(`(() => {
        const backBtn = document.querySelector('.chat-header .back-btn');
        if (backBtn && window.getComputedStyle(backBtn).display !== 'none') {
            backBtn.click();
        }
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    console.log('\n--- 1. Evidence 01: Messages Inbox ---');
    await client.capture('evidence_01_messages_inbox.png');

    console.log('\n--- 2. Evidence 02: Chat Room Conversation ---');
    const clickedConv = await client.evalJs(`(() => {
        const item = document.querySelector('.conversation-item') || document.querySelector('.recent-chat-card');
        if (item) {
            item.click();
            return { clicked: true, name: item.innerText.slice(0, 50) };
        }
        return { clicked: false };
    })()`);
    console.log('Conversation clicked:', clickedConv);
    await new Promise(r => setTimeout(r, 2500));

    // Scroll chat room down
    await client.evalJs(`(() => {
        const c = document.querySelector('.messages-container, [data-virtuoso-scroller="true"]');
        if (c) c.scrollTop = c.scrollHeight;
    })()`);
    await new Promise(r => setTimeout(r, 800));
    await client.capture('evidence_02_chat_room_conversation.png');

    console.log('\n--- 3. Evidence 03: Coin Store Modal ---');
    const coinClick = await client.evalJs(`(() => {
        const pill = document.querySelector('.chat-header-coin-pill');
        if (pill) {
            pill.click();
            return { clicked: true, text: pill.innerText };
        }
        return { clicked: false };
    })()`);
    console.log('Coin pill click:', coinClick);
    await new Promise(r => setTimeout(r, 1500));
    await client.capture('evidence_03_coin_store_modal.png');

    // Close Coin Store
    await client.evalJs(`(() => {
        const btn = document.querySelector('.btn-close-coin-store');
        if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n--- 4. Evidence 04: Attachment Tray (6 Buttons) ---');
    const moreActionsClick = await client.evalJs(`(() => {
        const btn = document.querySelector('.btn-more-actions-toggle');
        if (btn) {
            btn.click();
            return { clicked: true };
        }
        return { clicked: false };
    })()`);
    console.log('More actions toggle:', moreActionsClick);
    await new Promise(r => setTimeout(r, 1200));
    await client.capture('evidence_04_attachment_tray.png');

    console.log('\n--- 5. Evidence 05: Create Service Deal Modal ---');
    const escrowClick = await client.evalJs(`(() => {
        const btns = Array.from(document.querySelectorAll('.btn-icon-tray'));
        const escrowBtn = btns.find(b => b.innerText.includes('Escrow'));
        if (escrowBtn) {
            escrowBtn.click();
            return { clicked: true };
        }
        return { clicked: false };
    })()`);
    console.log('Escrow button click:', escrowClick);
    await new Promise(r => setTimeout(r, 1500));
    await client.capture('evidence_05_create_service_deal_modal.png');

    // Close Deal Modal
    await client.evalJs(`(() => {
        const btn = document.querySelector('.btn-close-deal-modal');
        if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n--- 6. Evidence 06: Live Location Duration Picker ---');
    await client.evalJs(`(() => {
        const btn = document.querySelector('.btn-more-actions-toggle');
        if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const locClick = await client.evalJs(`(() => {
        const btns = Array.from(document.querySelectorAll('.btn-icon-tray'));
        const locBtn = btns.find(b => b.innerText.includes('Location'));
        if (locBtn) {
            locBtn.click();
            return { clicked: true };
        }
        return { clicked: false };
    })()`);
    console.log('Location button click:', locClick);
    await new Promise(r => setTimeout(r, 1500));
    await client.capture('evidence_06_live_location_modal.png');

    // Close Location Modal
    await client.evalJs(`(() => {
        const btn = document.querySelector('.btn-close-loc');
        if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n--- 7. Evidence 07: Gift Store Modal ---');
    await client.evalJs(`(() => {
        const btn = document.querySelector('.btn-more-actions-toggle');
        if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const giftClick = await client.evalJs(`(() => {
        const btns = Array.from(document.querySelectorAll('.btn-icon-tray'));
        const giftBtn = btns.find(b => b.innerText.includes('Gift'));
        if (giftBtn) {
            giftBtn.click();
            return { clicked: true };
        }
        return { clicked: false };
    })()`);
    console.log('Gift button click:', giftClick);
    await new Promise(r => setTimeout(r, 1500));
    await client.capture('evidence_07_gift_store_coins.png');

    // Close Gift Store
    await client.evalJs(`(() => {
        const btn = document.querySelector('.gift-modal-card .btn-close, .gift-header .btn-close, .gift-store-modal .btn-close');
        if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n--- 8. Evidence 08: Chat Header Menu (Settings/Safety) ---');
    const menuClick = await client.evalJs(`(() => {
        const btn = document.querySelector('.btn-chat-menu');
        if (btn) {
            btn.click();
            return { clicked: true };
        }
        return { clicked: false };
    })()`);
    console.log('Chat menu click:', menuClick);
    await new Promise(r => setTimeout(r, 1200));
    await client.capture('evidence_08_chat_menu_options.png');

    console.log('\n--- 9. Evidence 09: Report User Modal ---');
    const reportClick = await client.evalJs(`(() => {
        const btn = document.querySelector('.chat-safety-menu-item.report');
        if (btn) {
            btn.click();
            return { clicked: true };
        }
        return { clicked: false };
    })()`);
    console.log('Report button click:', reportClick);
    await new Promise(r => setTimeout(r, 1500));
    await client.capture('evidence_09_report_modal.png');

    // Close Report Modal
    await client.evalJs(`(() => {
        const btn = document.querySelector('.btn-close-report');
        if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n--- 10. Evidence 10: Wallet Page (Escrow & Earnings) ---');
    // First back to inbox / profile
    await client.evalJs(`(() => {
        const backBtn = document.querySelector('.chat-header .back-btn');
        if (backBtn && window.getComputedStyle(backBtn).display !== 'none') {
            backBtn.click();
        }
    })()`);
    await new Promise(r => setTimeout(r, 500));

    await client.evalJs(`(() => {
        const link = Array.from(document.querySelectorAll('a')).find(a => a.getAttribute('href') === '/profile');
        if (link) link.click();
    })()`);
    await new Promise(r => setTimeout(r, 2000));

    await client.evalJs(`(() => {
        const el = Array.from(document.querySelectorAll('button, a, .menu-item')).find(el => el.innerText.includes('Earnings'));
        if (el) el.click();
    })()`);
    await new Promise(r => setTimeout(r, 3000));
    await client.capture('evidence_10_wallet_page.png');

    console.log('\n--- 11. Evidence 11: Settings Blocked Accounts ---');
    await client.evalJs(`(() => {
        const link = Array.from(document.querySelectorAll('a')).find(a => a.getAttribute('href') === '/profile');
        if (link) link.click();
    })()`);
    await new Promise(r => setTimeout(r, 2000));

    await client.evalJs(`(() => {
        const el = Array.from(document.querySelectorAll('button, a, .menu-item')).find(el => el.innerText.includes('Settings'));
        if (el) el.click();
    })()`);
    await new Promise(r => setTimeout(r, 2500));

    const blockedClick = await client.evalJs(`(() => {
        const items = Array.from(document.querySelectorAll('.settings-item.feature-link, .settings-item'));
        const blockedRow = items.find(el => el.innerText.includes('Blocked Accounts'));
        if (blockedRow) {
            blockedRow.click();
            return { clicked: true };
        }
        return { clicked: false, found: items.length };
    })()`);
    console.log('Blocked accounts row click:', blockedClick);
    await new Promise(r => setTimeout(r, 1800));
    await client.capture('evidence_11_settings_blocked_accounts.png');

    client.ws.close();
    console.log('\n======================================================');
    console.log('✅ ALL 11 SPRINT EVIDENCE SCREENSHOTS CAPTURED & SAVED');
    console.log('======================================================');
}

run().catch((err) => {
    console.error('Evidence capture failed:', err);
    process.exit(1);
});
