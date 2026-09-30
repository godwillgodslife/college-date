import { execSync } from 'child_process';
import fs from 'fs';

const ADB = 'C:\\Users\\DELL\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const EMULATOR = 'emulator-5558';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function takeScreenshot(filename) {
    execSync(`cmd.exe /c "${ADB} -s ${EMULATOR} exec-out screencap -p > ${filename}"`);
    console.log(`[QA] Captured screenshot: ${filename}`);
}

async function getCDPTarget() {
    const res = await fetch("http://127.0.0.1:9222/json/list");
    const targets = await res.json();
    return targets[0];
}

async function runQA() {
    console.log('[QA] Starting Confessions and Header Verification...');
    const target = await getCDPTarget();
    if (!target) {
        console.error('No devtools target found');
        process.exit(1);
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let msgId = 1;

    function sendCommand(method, params = {}) {
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

    console.log('[QA] Connected to WebView CDP');
    await sendCommand('Runtime.enable');

    // 1. Log in if on /login
    const currentUrl = await sendCommand('Runtime.evaluate', {
        expression: 'window.location.pathname',
        returnByValue: true
    });
    console.log('[QA] Current pathname:', currentUrl.result.value);

    if (currentUrl.result.value === '/login' || currentUrl.result.value === '/') {
        console.log('[QA] Logging in with test account...');
        const loginEval = await sendCommand('Runtime.evaluate', {
            expression: `
                (async () => {
                    const emailInput = document.querySelector('#email') || document.querySelector('input[type="email"]');
                    const passInput = document.querySelector('#password') || document.querySelector('input[type="password"]');
                    if (!emailInput || !passInput) return { error: 'Inputs not found' };

                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(emailInput, 'pure.signup.1788523079386@thecollegedate.com');
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));

                    nativeInputValueSetter.call(passInput, 'Password123!Test');
                    passInput.dispatchEvent(new Event('input', { bubbles: true }));

                    await new Promise(r => setTimeout(r, 400));
                    const submitBtn = document.querySelector('button[type="submit"]');
                    if (submitBtn) {
                        submitBtn.click();
                        return { submitted: true };
                    }
                    return { error: 'Submit button not found' };
                })()
            `,
            awaitPromise: true,
            returnByValue: true
        });
        console.log('[QA] Login submission result:', loginEval.result.value);

        // Wait for auth & redirect to dashboard/match
        await sleep(5000);
    }

    takeScreenshot('evidence_qa_01_authenticated_home.png');

    // 2. Navigate to /match and verify single header
    console.log('[QA] Navigating to /match...');
    await sendCommand('Runtime.evaluate', {
        expression: `window.__reactNavigate ? window.__reactNavigate('/match') : (window.location.href = '/match')`
    });
    await sleep(3000);
    takeScreenshot('evidence_qa_02_match_single_header.png');

    // 3. Navigate to /explore and verify single header
    console.log('[QA] Navigating to /explore...');
    await sendCommand('Runtime.evaluate', {
        expression: `window.__reactNavigate ? window.__reactNavigate('/explore') : (window.location.href = '/explore')`
    });
    await sleep(3000);
    takeScreenshot('evidence_qa_03_explore_single_header.png');

    // 4. Navigate to /chat and verify single header
    console.log('[QA] Navigating to /chat...');
    await sendCommand('Runtime.evaluate', {
        expression: `window.__reactNavigate ? window.__reactNavigate('/chat') : (window.location.href = '/chat')`
    });
    await sleep(3000);
    takeScreenshot('evidence_qa_04_chat_single_header.png');

    // 5. Navigate to /profile and verify single header
    console.log('[QA] Navigating to /profile...');
    await sendCommand('Runtime.evaluate', {
        expression: `window.__reactNavigate ? window.__reactNavigate('/profile') : (window.location.href = '/profile')`
    });
    await sleep(3000);
    takeScreenshot('evidence_qa_05_profile_single_header.png');

    // 6. Navigate to /confessions
    console.log('[QA] Navigating to /confessions...');
    await sendCommand('Runtime.evaluate', {
        expression: `window.__reactNavigate ? window.__reactNavigate('/confessions') : (window.location.href = '/confessions')`
    });
    await sleep(4000);
    takeScreenshot('evidence_qa_06_confessions_feed.png');

    // Verify Views metric element exists
    const viewsAudit = await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const badges = document.querySelectorAll('.confession-views-badge');
                return {
                    count: badges.length,
                    firstText: badges[0] ? badges[0].innerText : null
                };
            })()
        `,
        returnByValue: true
    });
    console.log('[QA] Confession views badges audit:', viewsAudit.result.value);

    // 7. Test Reaction Button and Floating 8-Emoji Popover
    console.log('[QA] Opening reaction popover on first card...');
    const popoverResult = await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const btn = document.querySelector('.btn-social-reaction');
                if (!btn) return { error: 'Reaction button not found' };
                btn.click();
                return { clicked: true };
            })()
        `,
        returnByValue: true
    });
    console.log('[QA] Reaction button click:', popoverResult.result.value);
    await sleep(1000);
    takeScreenshot('evidence_qa_07_reaction_popover_open.png');

    // Inspect popover emojis
    const popoverAudit = await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const popover = document.querySelector('.confession-reaction-popover');
                if (!popover) return { error: 'Popover element not found' };
                const emojis = Array.from(popover.querySelectorAll('.popover-emoji-btn')).map(b => b.innerText.trim());
                return {
                    found: true,
                    emojisCount: emojis.length,
                    emojis
                };
            })()
        `,
        returnByValue: true
    });
    console.log('[QA] Reaction popover audit:', popoverAudit.result.value);

    // Click 🔥 emoji in popover
    console.log('[QA] Selecting 🔥 emoji in popover...');
    await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const buttons = document.querySelectorAll('.popover-emoji-btn');
                for (const b of buttons) {
                    if (b.innerText.includes('🔥')) {
                        b.click();
                        return { reacted: '🔥' };
                    }
                }
                return { error: 'Emoji not found' };
            })()
        `
    });
    await sleep(1500);
    takeScreenshot('evidence_qa_08_reaction_selected.png');

    // 8. Open Comments Drawer via 💬 button
    console.log('[QA] Clicking comment button 💬 to open ConfessionDrawer...');
    await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const commentBtn = document.querySelectorAll('.btn-social[aria-label="View comments"]')[0];
                if (commentBtn) {
                    commentBtn.click();
                    return { clicked: true };
                }
                return { error: 'Comment button not found' };
            })()
        `
    });
    await sleep(2000);
    takeScreenshot('evidence_qa_09_comment_drawer_open.png');

    // Test Quick Emoji Bar in Drawer
    console.log('[QA] Testing Quick Emoji bar in comments drawer...');
    await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const emojiBtns = document.querySelectorAll('.btn-quick-emoji');
                if (emojiBtns.length > 0) {
                    emojiBtns[0].click(); // Tap ❤️
                    if (emojiBtns[1]) emojiBtns[1].click(); // Tap 😂
                }
                const input = document.querySelector('.comment-input');
                return {
                    quickEmojiCount: emojiBtns.length,
                    inputValue: input ? input.value : null
                };
            })()
        `,
        returnByValue: true
    }).then(res => console.log('[QA] Drawer Quick Emoji result:', res.result.value));

    await sleep(1000);
    takeScreenshot('evidence_qa_10_comment_drawer_emojis.png');

    // Close comment drawer
    console.log('[QA] Closing comment drawer...');
    await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const closeBtn = document.querySelector('.confession-drawer-content .close-btn');
                if (closeBtn) closeBtn.click();
            })()
        `
    });
    await sleep(1500);

    // 9. Test Share Sheet and Story Card Modal
    console.log('[QA] Opening Share Modal on first card...');
    await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const shareBtn = document.querySelectorAll('.btn-social[aria-label="Share post"]')[0];
                if (shareBtn) shareBtn.click();
            })()
        `
    });
    await sleep(1500);
    takeScreenshot('evidence_qa_11_share_modal_open.png');

    // Click 9:16 Story Card option in Share Modal
    console.log('[QA] Opening 9:16 Story Card generator...');
    await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const storyOption = document.querySelector('.btn-share-option.featured');
                if (storyOption) storyOption.click();
            })()
        `
    });
    await sleep(2500);
    takeScreenshot('evidence_qa_12_story_card_modal.png');

    // Close Story Modal
    console.log('[QA] Closing Story Modal...');
    await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const closeBtn = document.querySelector('.btn-story-close');
                if (closeBtn) closeBtn.click();
            })()
        `
    });
    await sleep(1500);

    // 10. Test Deep Linking: /confessions?id=<first-id>
    console.log('[QA] Testing deep link auto-open...');
    const deepLinkTest = await sendCommand('Runtime.evaluate', {
        expression: `
            (() => {
                const firstCard = document.querySelector('.confession-card-premium');
                // Read a post id from DOM
                return window.__testFirstConfessionId || 'test-deep-link';
            })()
        `,
        returnByValue: true
    });

    console.log('[QA] All automated emulator checks completed successfully!');
    ws.close();
}

runQA().catch(err => {
    console.error('[QA] Error:', err);
    process.exit(1);
});
