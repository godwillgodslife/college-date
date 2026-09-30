import WebSocket from "ws";
import fs from "fs";

async function main() {
    const listRes = await fetch("http://127.0.0.1:9223/json");
    const targets = await listRes.json();
    const page = targets.find(t => t.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();

    ws.on("message", (raw) => {
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

    await new Promise(r => ws.on("open", r));
    await send("Runtime.enable");
    await send("Page.enable");

    async function evalCode(expression) {
        const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        return res?.result?.result?.value;
    }

    async function screenshot(filename) {
        const res = await send("Page.captureScreenshot", { format: "png" });
        if (res?.result?.data) {
            fs.writeFileSync(filename, Buffer.from(res.result.data, "base64"));
            console.log("Saved screenshot:", filename);
        }
    }

    console.log("Checking current view on emulator-5556...");
    const isLogin = await evalCode("Boolean(document.querySelector('input[type=\"password\"]'))");
    if (isLogin) {
        console.log("On Login screen. Entering credentials...");
        await evalCode(`
            (() => {
                const setNativeValue = (element, value) => {
                    const prototype = Object.getPrototypeOf(element);
                    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
                    if (prototypeValueSetter) {
                        prototypeValueSetter.call(element, value);
                    } else {
                        element.value = value;
                    }
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                };
                const emailInput = document.querySelector('input[type="email"]');
                const passInput = document.querySelector('input[type="password"]');
                if (emailInput) setNativeValue(emailInput, 'pure.signup.1788523079386@thecollegedate.com');
                if (passInput) setNativeValue(passInput, 'Password123!Test');
            })()
        `);
        await new Promise(r => setTimeout(r, 600));
        console.log("Clicking Sign In button...");
        await evalCode(`
            (() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In')) || document.querySelector('button[type="submit"]');
                if (btn) btn.click();
            })()
        `);
        console.log("Waiting for login auth completion...");
        await new Promise(r => setTimeout(r, 4500));
    }

    console.log("Navigating to /chat...");
    for (let i = 0; i < 10; i++) {
        const path = await evalCode("window.location.pathname");
        console.log("Current path:", path);
        if (path === '/chat') break;
        await evalCode(`
            (() => {
                const openChatsBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Open chats'));
                if (openChatsBtn) {
                    openChatsBtn.click();
                    return;
                }
                const chatLink = document.querySelector('a[href="/chat"]');
                if (chatLink) {
                    chatLink.click();
                }
            })()
        `);
        await new Promise(r => setTimeout(r, 1000));
    }

    // Ensure search input is cleared and notification dropdown closed
    await evalCode(`
        (() => {
            const clearBtn = document.querySelector('.chat-search-clear');
            if (clearBtn) clearBtn.click();
            const searchInput = document.querySelector('.chat-search-input');
            if (searchInput && searchInput.value) {
                const proto = Object.getPrototypeOf(searchInput);
                Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(searchInput, '');
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const notifDropdown = document.querySelector('.notifications-dropdown');
            if (notifDropdown) {
                const bell = document.querySelector('.notification-bell-btn, .bell-btn');
                if (bell) bell.click();
            }
        })()
    `);
    await new Promise(r => setTimeout(r, 600));

    // Wait for conversation item
    for (let i = 0; i < 8; i++) {
        const convFound = await evalCode("Boolean(document.querySelector('.conversation-item'))");
        if (convFound) break;
        await new Promise(r => setTimeout(r, 1000));
    }

    const convCount = await evalCode("document.querySelectorAll('.conversation-item').length");
    console.log("Total conversations rendered:", convCount);

    const convText = await evalCode("document.querySelector('.conversation-item')?.innerText");
    console.log("First conversation preview:", convText);

    const hasCrownInList = await evalCode("Boolean(document.querySelector('.conversation-item .premium-crown'))");
    console.log("Has Premium Crown in conversation list:", hasCrownInList);
    await screenshot("remediation_20_chat_premium_badge.png");

    // Click on conversation to open DM
    console.log("Opening conversation with Junior...");
    await evalCode("document.querySelector('.conversation-item')?.click();");
    await new Promise(r => setTimeout(r, 2000));

    const headerNameText = await evalCode("document.querySelector('.header-name')?.innerText");
    console.log("Chat Header Name:", headerNameText);

    const hasHeaderPremiumBadge = await evalCode("Boolean(document.querySelector('.premium-badge-pill-chat'))");
    console.log("Has Premium Badge Pill in Chat Header:", hasHeaderPremiumBadge);

    // 1. Open Gift Modal via More Actions toggle (+)
    console.log("Clicking More Actions (+) toggle to open action tray...");
    await evalCode(`
        (() => {
            const toggle = document.querySelector('.btn-more-actions-toggle');
            if (toggle) toggle.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 600));

    console.log("Clicking Send Gift button in action tray...");
    await evalCode(`
        (() => {
            const giftBtn = document.querySelector('button[title="Send Gift"]');
            if (giftBtn) giftBtn.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 1200));

    const giftModalOpen = await evalCode("Boolean(document.querySelector('.gift-store-modal, .gift-store-content'))");
    console.log("Gift Store Modal Open:", giftModalOpen);

    const sendGiftBtnRect = await evalCode(`
        (() => {
            const btn = document.querySelector('.btn-buy, .btn-send-gift');
            if (!btn) return null;
            const r = btn.getBoundingClientRect();
            return {
                text: btn.innerText,
                top: Math.round(r.top),
                bottom: Math.round(r.bottom),
                height: Math.round(r.height),
                windowHeight: window.innerHeight,
                isFullyVisible: r.bottom <= window.innerHeight && r.top >= 0
            };
        })()
    `);
    console.log("Send Gift Button Rect:", JSON.stringify(sendGiftBtnRect));
    await screenshot("remediation_22_gift_modal_clean.png");

    // Close Gift Modal
    console.log("Closing Gift modal...");
    await evalCode(`
        (() => {
            const closeBtn = document.querySelector('.gift-store-header .btn-close, .gift-store-modal button.btn-close');
            if (closeBtn) {
                closeBtn.click();
            } else {
                const backdrop = document.querySelector('.gift-store-overlay');
                if (backdrop) backdrop.click();
            }
        })()
    `);
    await new Promise(r => setTimeout(r, 1000));

    // 2. Send text message in chat window
    console.log("Typing and sending text message in chat window...");
    await evalCode(`
        (() => {
            const setNativeValue = (element, value) => {
                const prototype = Object.getPrototypeOf(element);
                const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
                if (prototypeValueSetter) {
                    prototypeValueSetter.call(element, value);
                } else {
                    element.value = value;
                }
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            };
            const input = document.querySelector('.chat-window input.chat-input');
            if (input) {
                setNativeValue(input, 'Hey Junior! Great to connect on campus 🔥');
            }
        })()
    `);
    await new Promise(r => setTimeout(r, 400));

    // Submit form or click send button
    await evalCode(`
        (() => {
            const form = document.querySelector('.chat-input-form-wrapper');
            const sendBtn = document.querySelector('.chat-window .btn-send');
            if (sendBtn) {
                sendBtn.click();
            } else if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        })()
    `);
    await new Promise(r => setTimeout(r, 2500));

    // Check if message is delivered (not pending / no hourglass)
    const hasPendingHourglass = await evalCode("Boolean(document.querySelector('.read-receipt.pending, .message-bubble._pending'))");
    console.log("Has Pending Hourglass:", hasPendingHourglass, "(Expected: false)");

    const lastMsg = await evalCode(`
        (() => {
            const msgs = document.querySelectorAll('.message-content-text');
            return msgs.length > 0 ? msgs[msgs.length - 1].innerText : 'none';
        })()
    `);
    console.log("Last sent message content:", lastMsg);
    await screenshot("remediation_21_message_delivered.png");

    // 3. Test in-app back navigation
    console.log("Testing in-app back button navigation...");
    await evalCode(`
        (() => {
            const backBtn = document.querySelector('.chat-header .back-btn');
            if (backBtn) backBtn.click();
        })()
    `);
    await new Promise(r => setTimeout(r, 1200));

    const isBackAtInbox = await evalCode("Boolean(document.querySelector('.conversation-list'))");
    console.log("Is cleanly back at inbox list:", isBackAtInbox);

    // Ensure notification drawer is not obscuring inbox if opened
    await evalCode(`
        (() => {
            const notifOverlay = document.querySelector('.notification-dropdown-overlay, .notifications-dropdown');
            if (notifOverlay) {
                const bell = document.querySelector('.nav-notif-wrapper .nav-icon-btn, .nav-icon-btn');
                if (bell) bell.click();
            }
        })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await screenshot("remediation_23_back_to_inbox.png");

    ws.close();
}

main().catch(err => console.error(err));
