import fs from 'fs';
import { execSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\4a6ee34a-d7e4-4d2b-8a0a-8402211c2195';
const ADB = 'C:\\Users\\DELL\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const EMULATOR = 'emulator-5554';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('=== VERIFYING CHAT INPUT & ANDROID KEYBOARD ERGONOMICS ON ANDROID EMULATOR ===');

    // 0. Ensure devtools port 9222 is forwarded
    let unixOut = execSync(`"${ADB}" -s ${EMULATOR} shell cat /proc/net/unix`).toString();
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (match) {
        console.log('[QA] Forwarding port 9222 to socket:', match[1]);
        execSync(`"${ADB}" -s ${EMULATOR} forward tcp:9222 localabstract:${match[1]}`);
    }

    // 1. Connect to CDP
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await listRes.json();
    const page = targets.find(t => t.type === 'page') || targets[0];
    if (!page?.webSocketDebuggerUrl) {
        console.error('[QA] No debugger URL available on port 9222');
        process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
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
        const base = filename.split(/[/\\]/).pop();
        const res = await send('Page.captureScreenshot', { format: 'png' });
        if (res?.data) {
            const buf = Buffer.from(res.data, 'base64');
            fs.writeFileSync(filename, buf);
            try {
                fs.writeFileSync(`${ARTIFACT_DIR}\\${base}`, buf);
            } catch (e) {}
            console.log(`[QA Web Screenshot Saved] -> ${base}`);
        }
    }

    async function captureNative(filename) {
        const base = filename.split(/[/\\]/).pop();
        try {
            execSync(`"${ADB}" -s ${EMULATOR} shell screencap -p /sdcard/temp_screen.png`);
            execSync(`"${ADB}" -s ${EMULATOR} pull /sdcard/temp_screen.png "${ARTIFACT_DIR}\\${base}"`);
            fs.copyFileSync(`${ARTIFACT_DIR}\\${base}`, filename);
            console.log(`[QA Native Screenshot Saved] -> ${base}`);
        } catch (e) {
            console.warn('[QA Native Screenshot Warning]:', e.message);
        }
    }

    // Dismiss any modals
    await evaluate(`(() => {
        const closes = document.querySelectorAll('.btn-ai-dismiss, .btn-tour-skip, .modal-close');
        closes.forEach(c => c.click());
    })()`);

    // Ensure on /chat
    await evaluate(`(() => {
        if (window.location.pathname !== '/chat') {
            window.history.pushState({}, '', '/chat');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    })()`);
    await sleep(2000);

    // Wait for conversation items or new matches
    console.log('[QA] Waiting for conversations to render...');
    let convFound = false;
    for (let i = 0; i < 15; i++) {
        const count = await evaluate(`(() => {
            const convs = document.querySelectorAll('.conversation-item');
            const matches = document.querySelectorAll('.new-match-avatar-card');
            return convs.length + matches.length;
        })()`);
        if (count > 0) {
            convFound = true;
            console.log(`[QA] Found ${count} conversation/match item(s)`);
            break;
        }
        await sleep(1000);
    }

    if (!convFound) {
        console.warn('[QA] No conversations found directly, checking dashboard or creating mock match for test...');
    }

    // Click first conversation item
    const clickSuccess = await evaluate(`(() => {
        const item = document.querySelector('.conversation-item') || document.querySelector('.new-match-avatar-card');
        if (item) {
            item.click();
            return true;
        }
        return false;
    })()`);
    console.log('[QA] Conversation item clicked:', clickSuccess);
    await sleep(2000);

    // Verify chat window and textarea mounted
    const mountState = await evaluate(`(() => {
        const chatWindow = document.querySelector('.chat-window');
        const textarea = document.querySelector('.chat-textarea');
        const messagesContainer = document.querySelector('.messages-container');
        const composerPill = document.querySelector('.chat-composer-pill');
        const inputArea = document.querySelector('.chat-input-area');

        const computedMessages = messagesContainer ? window.getComputedStyle(messagesContainer) : null;
        const computedTextarea = textarea ? window.getComputedStyle(textarea) : null;

        return {
            hasChatWindow: !!chatWindow,
            isChatWindowShown: chatWindow?.classList.contains('show'),
            hasTextarea: !!textarea,
            hasPill: !!composerPill,
            hasMessagesContainer: !!messagesContainer,
            hasInputArea: !!inputArea,
            textareaAttrs: textarea ? {
                tagName: textarea.tagName,
                rows: textarea.getAttribute('rows'),
                autoComplete: textarea.getAttribute('autocomplete'),
                autoCorrect: textarea.getAttribute('autocorrect'),
                autoCapitalize: textarea.getAttribute('autocapitalize'),
                spellcheck: textarea.getAttribute('spellcheck'),
                enterKeyHint: textarea.getAttribute('enterkeyhint')
            } : null,
            textareaHeight: computedTextarea ? computedTextarea.height : null,
            messagesPaddingBottom: computedMessages ? computedMessages.paddingBottom : null
        };
    })()`);
    console.log('[QA] Mount State Inspection:', JSON.stringify(mountState, null, 2));

    // SCENARIO 1: Focus textarea and verify keyboard layout + zero empty void
    console.log('[QA] Scenario 1: Focus chat textarea to open virtual keyboard...');
    await evaluate(`(() => {
        const textarea = document.querySelector('.chat-textarea');
        if (textarea) textarea.focus();
    })()`);
    // Also send an adb input tap to the bottom center to trigger native soft keyboard
    try {
        const pillRect = await evaluate(`(() => {
            const pill = document.querySelector('.chat-composer-pill');
            if (!pill) return null;
            const r = pill.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        })()`);
        if (pillRect) {
            console.log(`[QA] Sending adb tap to composer pill at (${Math.round(pillRect.x)}, ${Math.round(pillRect.y)})`);
            execSync(`"${ADB}" -s ${EMULATOR} shell input tap ${Math.round(pillRect.x)} ${Math.round(pillRect.y)}`);
        }
    } catch (e) {
        console.warn('[QA Tap error]:', e.message);
    }
    await sleep(2000);

    // Check geometry when keyboard is open
    const keyboardGeometry = await evaluate(`(() => {
        const textarea = document.querySelector('.chat-textarea');
        const pill = document.querySelector('.chat-composer-pill');
        const messages = document.querySelector('.messages-container');
        const inputArea = document.querySelector('.chat-input-area');

        return {
            keyboardOffsetVar: getComputedStyle(document.documentElement).getPropertyValue('--keyboard-offset'),
            isKeyboardOpenClass: document.documentElement.classList.contains('keyboard-open'),
            messagesPaddingBottom: messages ? getComputedStyle(messages).paddingBottom : null,
            messagesHeight: messages ? messages.clientHeight : null,
            inputAreaBottomPadding: inputArea ? getComputedStyle(inputArea).paddingBottom : null,
            pillHeight: pill ? pill.clientHeight : null
        };
    })()`);
    console.log('[QA] Keyboard Open Geometry:', JSON.stringify(keyboardGeometry, null, 2));

    await capture('evidence_qa_01_keyboard_open_flush_composer.png');
    await captureNative('evidence_qa_01_keyboard_open_flush_composer_native.png');

    // SCENARIO 2: Test native emoji entry and multiline auto-resizing
    console.log('[QA] Scenario 2: Enter native emoji and multiline text...');
    const emojiTypingState = await evaluate(`(() => {
        const textarea = document.querySelector('.chat-textarea');
        if (!textarea) return null;

        // Enter text with native emojis and multi-line content
        const testText = "Hello Jordan! 😂 Testing native emojis ❤️🔥 and multiline expansion.\\nSecond line with more vibes 🙌💃\\nThird line for full expansion verification 🚀";
        
        // Native setter simulation
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeSetter.call(textarea, testText);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        return {
            textareaValue: textarea.value,
            textareaClientHeight: textarea.clientHeight,
            textareaScrollHeight: textarea.scrollHeight,
            styleHeight: textarea.style.height
        };
    })()`);
    console.log('[QA] Emoji & Multiline Auto-Resize State:', JSON.stringify(emojiTypingState, null, 2));
    await sleep(1500);

    await capture('evidence_qa_02_native_emojis_and_expansion.png');
    await captureNative('evidence_qa_02_native_emojis_and_expansion_native.png');

    // SCENARIO 3: Send message and verify single-line reset
    console.log('[QA] Scenario 3: Sending message with native emojis...');
    const sendResult = await evaluate(`(() => {
        const sendBtn = document.querySelector('.btn-send');
        if (sendBtn) {
            sendBtn.click();
            return 'clicked_btn_send';
        }
        const form = document.querySelector('.chat-input-form-wrapper');
        if (form) {
            form.requestSubmit();
            return 'form_requested_submit';
        }
        return 'not_found';
    })()`);
    console.log('[QA] Send action result:', sendResult);
    await sleep(2500);

    const afterSendState = await evaluate(`(() => {
        const textarea = document.querySelector('.chat-textarea');
        const lastMsg = document.querySelector('.message-bubble:last-child');
        return {
            textareaValue: textarea ? textarea.value : null,
            textareaHeight: textarea ? textarea.clientHeight : null,
            lastMsgContent: lastMsg ? lastMsg.innerText : null
        };
    })()`);
    console.log('[QA] After Send State:', JSON.stringify(afterSendState, null, 2));

    await capture('evidence_qa_03_sent_message_with_native_emojis.png');
    await captureNative('evidence_qa_03_sent_message_with_native_emojis_native.png');

    // SCENARIO 4: Open StickerDrawer (Existing College Date Emoji & Sticker Picker)
    console.log('[QA] Scenario 4: Opening College Date StickerDrawer...');
    await evaluate(`(() => {
        const smileyBtn = document.querySelector('.composer-inline-btn');
        if (smileyBtn) smileyBtn.click();
    })()`);
    await sleep(1500);

    const stickerDrawerState = await evaluate(`(() => {
        const drawer = document.querySelector('.sticker-drawer');
        const stickers = document.querySelectorAll('.sticker-item');
        const activeTab = document.querySelector('.drawer-tabs .active');
        return {
            drawerMounted: !!drawer,
            stickersCount: stickers.length,
            activeTab: activeTab ? activeTab.innerText : null
        };
    })()`);
    console.log('[QA] StickerDrawer State:', JSON.stringify(stickerDrawerState, null, 2));

    await capture('evidence_qa_04_sticker_drawer_intact.png');
    await captureNative('evidence_qa_04_sticker_drawer_intact_native.png');

    // SCENARIO 5: Light Theme Verification
    console.log('[QA] Scenario 5: Verifying Light Theme Composer...');
    await evaluate(`(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.classList.add('theme-light');
        // Close sticker drawer for clean composer view
        const closeBtn = document.querySelector('.btn-close-drawer');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(1200);

    const lightThemeState = await evaluate(`(() => {
        const pill = document.querySelector('.chat-composer-pill');
        const textarea = document.querySelector('.chat-textarea');
        return {
            pillBg: pill ? getComputedStyle(pill).backgroundColor : null,
            pillBorder: pill ? getComputedStyle(pill).borderColor : null,
            textColor: textarea ? getComputedStyle(textarea).color : null
        };
    })()`);
    console.log('[QA] Light Theme State:', JSON.stringify(lightThemeState, null, 2));

    await capture('evidence_qa_05_chat_composer_light_mode.png');
    await captureNative('evidence_qa_05_chat_composer_light_mode_native.png');

    // Restore dark theme
    await evaluate(`(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.remove('theme-light');
    })()`);

    console.log('=== ALL QA SCENARIOS COMPLETED ON EMULATOR ===');
    process.exit(0);
}

main().catch(err => {
    console.error('[QA Fatal Error]:', err);
    process.exit(1);
});
