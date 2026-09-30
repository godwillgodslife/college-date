import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const CDP_PORT = '9224';
const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity/brain/0e0b216d-b069-49b6-9f02-559761a1265b';
const PUBLIC_DOCS_DIR = 'c:/college-date/docs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    console.log('--- Connecting to Chromium DevTools on port ' + CDP_PORT + ' ---');
    const listRes = await fetch('http://127.0.0.1:' + CDP_PORT + '/json', {
        headers: { Connection: 'close' }
    });
    const targets = await listRes.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found on port ' + CDP_PORT);

    const ws = new WebSocket(page.webSocketDebuggerUrl, {
        headers: { Host: 'localhost' }
    });

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
    console.log('✅ WebSocket Connected!');
    await send('Runtime.enable');
    await send('Page.enable');

    const evalJs = async (expr) => {
        const r = await send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        if (r.result?.exceptionDetails) {
            console.error('JS Exception:', r.result.exceptionDetails);
        }
        return r.result?.result?.value;
    };

    const capture = async (filename) => {
        console.log('Capturing: ' + filename);
        const res = await send('Page.captureScreenshot', { format: 'png' });
        if (res?.result?.data) {
            const buffer = Buffer.from(res.result.data, 'base64');
            const docPath = path.join(PUBLIC_DOCS_DIR, filename);
            const artPath = path.join(ARTIFACT_DIR, filename);
            fs.writeFileSync(docPath, buffer);
            fs.writeFileSync(artPath, buffer);
            console.log('📸 Saved: ' + filename + ' (' + buffer.length + ' bytes)');
        } else {
            console.error('Screenshot failed:', res);
        }
    };

    // ==========================================
    // STEP 1: Capture Evidence 03 (Chat Vibe Modal)
    // ==========================================
    console.log('\n>>> [1/3] Navigating to /explore for Evidence 03...');
    await evalJs(`(() => {
        window.history.pushState({}, '', '/explore');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3500);

    const exploreInfo = await evalJs(`(() => {
        const cards = Array.from(document.querySelectorAll('.explore-card, .masonry-card'));
        const quickChatBtns = Array.from(document.querySelectorAll('.quick-tray-btn.chat'));
        return {
            url: location.href,
            cardCount: cards.length,
            chatBtnCount: quickChatBtns.length
        };
    })()`);
    console.log('Explore state:', exploreInfo);

    // Open Chat Vibe modal on the first student card
    console.log('Clicking 💬 quick chat button...');
    const vibeOpened = await evalJs(`(() => {
        const chatBtn = document.querySelector('.quick-tray-btn.chat') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('💬') || b.className.includes('chat'));
        if (chatBtn) {
            chatBtn.click();
            return true;
        }
        return false;
    })()`);
    console.log('Vibe button clicked:', vibeOpened);
    await sleep(1500);

    // Check modal visibility
    const modalInfo = await evalJs(`(() => {
        const modal = document.querySelector('.chat-vibe-modal, .chat-vibe-backdrop');
        const title = document.querySelector('.chat-vibe-title')?.innerText;
        const balance = document.querySelector('.vibe-balance-amount')?.innerText;
        const btn = document.querySelector('.btn-confirm-vibe, .btn-fund-vibe')?.innerText;
        return { visible: Boolean(modal), title, balance, btn };
    })()`);
    console.log('Modal info:', modalInfo);

    await capture('evidence_03_chat_vibe_modal.png');

    // Close the modal
    await evalJs(`(() => {
        const closeBtn = document.querySelector('.chat-vibe-close-btn, .btn-cancel-vibe');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(1000);

    // ==========================================
    // STEP 2: Capture Evidence 04 (Chat AI Suggestions Active)
    // ==========================================
    console.log('\n>>> [2/3] Navigating to /chat for Evidence 04 & 05...');
    await evalJs(`(() => {
        window.history.pushState({}, '', '/chat');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3500);

    const convList = await evalJs(`(() => {
        const convs = Array.from(document.querySelectorAll('.conversation-item, .chat-list-item, [class*="conversation"]'));
        return {
            url: location.href,
            convCount: convs.length,
            firstConvText: convs[0]?.innerText?.slice(0, 50)
        };
    })()`);
    console.log('Conversations list:', convList);

    // Open first conversation
    console.log('Opening conversation...');
    await evalJs(`(() => {
        const firstConv = document.querySelector('.conversation-item, .chat-list-item');
        if (firstConv) firstConv.click();
    })()`);
    await sleep(2500);

    // Open attachment tray (.btn-more-actions-toggle)
    console.log('Opening attachment tray...');
    await evalJs(`(() => {
        const toggle = document.querySelector('.btn-more-actions-toggle');
        if (toggle) toggle.click();
    })()`);
    await sleep(1200);

    // Click ✨ AI Assist (.whatsapp-attachment-item with 'AI Assist')
    console.log('Clicking ✨ AI Assist...');
    const aiClicked = await evalJs(`(() => {
        const aiBtn = Array.from(document.querySelectorAll('.whatsapp-attachment-item')).find(b => b.innerText.includes('AI Assist'));
        if (aiBtn) {
            aiBtn.click();
            return true;
        }
        return false;
    })()`);
    console.log('AI Assist clicked:', aiClicked);
    await sleep(2500); // Wait for suggestions to render

    const aiStripInfo = await evalJs(`(() => {
        const strip = document.querySelector('.chat-ai-suggestions-strip');
        const chips = Array.from(document.querySelectorAll('.ai-suggestion-chip')).map(c => c.innerText.trim());
        const dismissBtn = document.querySelector('.btn-ai-dismiss');
        return {
            hasStrip: Boolean(strip),
            chipCount: chips.length,
            sampleChips: chips.slice(0, 3),
            hasDismissBtn: Boolean(dismissBtn)
        };
    })()`);
    console.log('AI Strip Info:', aiStripInfo);

    await capture('evidence_04_chat_ai_suggestions_active.png');

    // ==========================================
    // STEP 3: Capture Evidence 05 (Chat AI Suggestion Inserted)
    // ==========================================
    console.log('\n>>> [3/3] Clicking first AI suggestion chip for Evidence 05...');
    const chipClicked = await evalJs(`(() => {
        const firstChip = document.querySelector('.ai-suggestion-chip');
        if (firstChip) {
            firstChip.click();
            return true;
        }
        return false;
    })()`);
    console.log('Suggestion chip clicked:', chipClicked);
    await sleep(1500);

    const postClickInfo = await evalJs(`(() => {
        const input = document.querySelector('.chat-input');
        const strip = document.querySelector('.chat-ai-suggestions-strip');
        return {
            inputValue: input ? (input.value || input.innerText) : null,
            stripClosed: strip === null
        };
    })()`);
    console.log('Post-click state:', postClickInfo);

    await capture('evidence_05_chat_ai_suggestion_inserted.png');

    console.log('\n🎉 All 3 evidence screenshots captured successfully!');
    ws.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Script error:', err);
    process.exit(1);
});
