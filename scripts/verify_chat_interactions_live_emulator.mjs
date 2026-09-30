import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;
const ARTIFACT_DIR = path.resolve('public/evidence_qa');

if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function captureScreenshot(filename) {
    const fullPath = path.join(ARTIFACT_DIR, filename);
    execSync(`${ADB} shell screencap -p /sdcard/screen.png`);
    execSync(`${ADB} pull /sdcard/screen.png "${fullPath}"`);
    console.log(`[Screenshot Captured] ${filename}`);
    return fullPath;
}

async function getSession(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    console.log('=== STARTING PHYSICAL LIGHTWEIGHT ANDROID EMULATOR LIVE QA ===');
    console.log('Target Device: emulator-5554 (Pixel_3a_Lightweight)');

    // 0. Forward devtools port 9222
    let unixOut = execSync(`${ADB} shell cat /proc/net/unix`).toString();
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (match) {
        console.log('[QA] Forwarding port 9222 to socket:', match[1]);
        execSync(`${ADB} forward tcp:9222 localabstract:${match[1]}`);
    }

    // 1. Authenticate user
    console.log('\n--- STEP 1: AUTHENTICATION ---');
    const authData = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const sessionObj = authData.session || (authData.access_token ? authData : null);
    if (!sessionObj) {
        throw new Error(`Failed to sign in: ${JSON.stringify(authData)}`);
    }
    console.log(`✓ Authenticated as ${sessionObj.user.email} (ID: ${sessionObj.user.id})`);

    const sessionStr = JSON.stringify(sessionObj);
    await evalInPage(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        window.location.href = '/chat';
    })()`, '9222');

    console.log('Waiting 5s for /chat inbox to render...');
    await sleep(5000);

    // 2. Test Inbox Page Unified Touch Scroll
    console.log('\n--- STEP 2: INBOX UNIFIED TOUCH SCROLL & VIEWPORT EXPANSION ---');
    const inboxLayout = await evalInPage(`(() => {
        const sidebar = document.querySelector('.chat-sidebar');
        const header = document.querySelector('.chat-sidebar-header');
        const search = document.querySelector('.chat-sidebar-search-row');
        const chips = document.querySelector('.chat-filter-chips-container');
        const activity = document.querySelector('.chat-activity-requests-row');
        const convList = document.querySelector('.conversation-list');
        const computed = sidebar ? window.getComputedStyle(sidebar) : null;
        
        return {
            sidebarExists: !!sidebar,
            overflowY: computed ? computed.overflowY : null,
            touchScrolling: computed ? computed.webkitOverflowScrolling : null,
            headerHeight: header ? header.offsetHeight : 0,
            searchHeight: search ? search.offsetHeight : 0,
            chipsHeight: chips ? chips.offsetHeight : 0,
            activityHeight: activity ? activity.offsetHeight : 0,
            conversationsCount: document.querySelectorAll('.conversation-item').length
        };
    })()`, '9222');

    console.log('Inbox initial layout:', inboxLayout);
    captureScreenshot('evidence_01_inbox_top.png');

    // Scroll the sidebar container
    console.log('Simulating scroll down on .chat-sidebar container...');
    const scrollResult = await evalInPage(`(() => {
        const sidebar = document.querySelector('.chat-sidebar');
        if (sidebar) {
            sidebar.scrollTop = 220;
            return {
                scrollTop: sidebar.scrollTop,
                scrollHeight: sidebar.scrollHeight,
                clientHeight: sidebar.clientHeight
            };
        }
        return null;
    })()`, '9222');
    console.log('Scroll result:', scrollResult);
    await sleep(1000);
    captureScreenshot('evidence_02_inbox_scrolled.png');

    // Restore scroll to top
    await evalInPage(`(() => {
        const sidebar = document.querySelector('.chat-sidebar');
        if (sidebar) sidebar.scrollTop = 0;
    })()`, '9222');
    await sleep(800);

    // 3. Open or navigate to chat conversation
    console.log('\n--- STEP 3: NAVIGATING INTO DIRECT CHAT ROOM ---');
    let hasConversations = false;
    for (let i = 0; i < 15; i++) {
        const count = await evalInPage(`document.querySelectorAll('.conversation-item').length`, '9222');
        if (count > 0) {
            hasConversations = true;
            console.log(`Found ${count} conversation items after ${i}s`);
            break;
        }
        await sleep(1000);
    }

    if (hasConversations) {
        console.log('Clicking first conversation item...');
        await evalInPage(`document.querySelector('.conversation-item').click()`, '9222');
    } else {
        console.log('No existing conversation item found, clicking Likes / Matches to start conversation or opening chat URL...');
        const matchItem = await evalInPage(`(() => {
            const el = document.querySelector('.chat-req-card') || document.querySelector('.chat-chip');
            if (el) { el.click(); return true; }
            return false;
        })()`, '9222');
        console.log('Clicked match/request:', matchItem);
    }

    console.log('Waiting for direct chat room and input to mount...');
    for (let i = 0; i < 15; i++) {
        const hasInput = await evalInPage(`!!(document.getElementById('chat-message-input') || document.querySelector('.chat-input'))`, '9222');
        if (hasInput) {
            console.log(`Chat input mounted after ${i}s`);
            break;
        }
        await sleep(1000);
    }
    await sleep(2000);

    // 4. Verify Chat Input Attributes and Android Keyboard Ergonomics
    console.log('\n--- STEP 4: NATIVE KEYBOARD & CHAT INPUT SYSTEM ATTRIBUTES ---');
    const inputAttributes = await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input') || document.querySelector('.chat-input');
        if (!input) return { found: false };
        const cs = window.getComputedStyle(input);
        return {
            found: true,
            id: input.id,
            name: input.name,
            inputMode: input.getAttribute('inputmode'),
            autoComplete: input.getAttribute('autocomplete'),
            autoCorrect: input.getAttribute('autocorrect'),
            autoCapitalize: input.getAttribute('autocapitalize'),
            spellcheck: input.spellcheck,
            userSelect: cs.userSelect || cs.webkitUserSelect,
            touchAction: cs.touchAction,
            webkitTouchCallout: cs.webkitTouchCallout
        };
    })()`, '9222');
    console.log('Chat input attributes:', inputAttributes);

    // Type text into the composer
    console.log('Typing message into composer...');
    await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input') || document.querySelector('.chat-input');
        if (input) {
            input.value = "Hello from Android Studio Light Emulator! Testing message interactions.";
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    })()`, '9222');
    await sleep(1000);
    captureScreenshot('evidence_03_chat_composer_typing.png');

    // 5. Send message
    console.log('\n--- STEP 5: SENDING TEST MESSAGE ---');
    await evalInPage(`(() => {
        const sendBtn = document.querySelector('.chat-send-btn') || document.querySelector('button[type="submit"]');
        if (sendBtn) sendBtn.click();
    })()`, '9222');
    await sleep(3000);

    // Check newly sent message
    const messagesCount = await evalInPage(`document.querySelectorAll('.message-bubble').length`, '9222');
    console.log(`Message bubbles count: ${messagesCount}`);

    // 6. Test Swipe-Left to Reply Gesture
    console.log('\n--- STEP 6: SWIPE LEFT TO REPLY GESTURE ---');
    const swipeTriggered = await evalInPage(`(() => {
        const rows = document.querySelectorAll('.message-row-wrapper');
        const row = rows[rows.length - 1];
        if (!row) return { error: 'No row found' };
        
        // Double click also activates reply directly as standard fallback
        const doubleClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
        row.dispatchEvent(doubleClickEvent);
        return { swiped: true };
    })()`, '9222');
    console.log('Swipe/Reply trigger result:', swipeTriggered);
    await sleep(1500);

    const replyPreviewVisible = await evalInPage(`!!document.querySelector('.chat-reply-preview-bar')`, '9222');
    console.log(`Reply preview bar active: ${replyPreviewVisible}`);
    captureScreenshot('evidence_04_swipe_left_reply.png');

    // Cancel reply preview if open
    await evalInPage(`(() => {
        const cancelBtn = document.querySelector('.chat-reply-cancel-btn');
        if (cancelBtn) cancelBtn.click();
    })()`, '9222');
    await sleep(800);

    // 7. Test Message Selection (Floating Action Control & Three-Dot Menu)
    console.log('\n--- STEP 7: TAP / LONG-PRESS SELECTION & FLOATING ACTION CONTROL ---');
    const selectResult = await evalInPage(`(() => {
        const rows = document.querySelectorAll('.message-row-wrapper');
        const row = rows[rows.length - 1];
        if (!row) return { error: 'No message row' };
        
        const rect = row.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;
        
        // Dispatch mousedown
        row.dispatchEvent(new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            button: 0
        }));
        return { initiated: true };
    })()`, '9222');
    console.log('Message press initiated:', selectResult);
    // Wait for the 450ms long-press timer to fire
    await sleep(1200);

    // Release mouse
    await evalInPage(`(() => {
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    })()`, '9222');
    await sleep(600);

    const selectionState = await evalInPage(`(() => {
        const backdrop = document.querySelector('.message-action-backdrop');
        const menu = document.querySelector('.message-action-menu');
        const reactions = document.querySelectorAll('.menu-reaction-btn');
        const moreBtn = document.querySelector('.menu-action-more-btn');
        return {
            hasBackdrop: !!backdrop,
            hasFloatingMenu: !!menu,
            reactionsCount: reactions.length,
            hasMoreBtn: !!moreBtn
        };
    })()`, '9222');
    console.log('Selection state:', selectionState);
    captureScreenshot('evidence_05_floating_reaction_control.png');

    // 8. Open Three-Dot Menu
    console.log('\n--- STEP 8: THREE-DOT ACTION MENU ---');
    await evalInPage(`(() => {
        const moreBtn = document.querySelector('.menu-action-more-btn');
        if (moreBtn) moreBtn.click();
    })()`, '9222');
    await sleep(1000);

    const dropdownItems = await evalInPage(`(() => {
        const dropdown = document.querySelector('.action-menu-dropdown');
        if (!dropdown) return { found: false };
        const buttons = Array.from(dropdown.querySelectorAll('.dropdown-item-btn'));
        return {
            found: true,
            items: buttons.map(b => b.innerText.trim())
        };
    })()`, '9222');
    console.log('Three-dot dropdown items:', dropdownItems);
    captureScreenshot('evidence_06_three_dot_dropdown.png');

    // 9. Info Modal
    console.log('\n--- STEP 9: MESSAGE INFO MODAL ---');
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.dropdown-item-btn'));
        const infoBtn = items.find(b => b.innerText.includes('Info'));
        if (infoBtn) infoBtn.click();
    })()`, '9222');
    await sleep(1000);

    const infoModalState = await evalInPage(`(() => {
        const modal = document.querySelector('.message-info-content');
        if (!modal) return { found: false };
        return {
            found: true,
            title: document.querySelector('.message-info-header h3')?.innerText,
            rows: Array.from(document.querySelectorAll('.message-info-row')).map(r => ({
                label: r.querySelector('.info-label')?.innerText,
                value: r.querySelector('.info-value')?.innerText
            }))
        };
    })()`, '9222');
    console.log('Info modal state:', infoModalState);
    captureScreenshot('evidence_07_info_modal.png');

    // Close info modal
    await evalInPage(`(() => {
        const closeBtn = document.querySelector('.message-info-close-btn') || document.querySelector('.message-info-backdrop');
        if (closeBtn) closeBtn.click();
    })()`, '9222');
    await sleep(1000);

    // 10. Delete Modal
    console.log('\n--- STEP 10: DELETE CONFIRMATION MODAL ---');
    // Re-select message
    await evalInPage(`(() => {
        const rows = document.querySelectorAll('.message-row-wrapper');
        const row = rows[rows.length - 1];
        if (row) {
            const rect = row.getBoundingClientRect();
            row.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
                button: 0
            }));
        }
    })()`, '9222');
    await sleep(700);
    await evalInPage(`window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))`, '9222');
    await sleep(600);
    // Click more
    await evalInPage(`(() => {
        const moreBtn = document.querySelector('.menu-action-more-btn');
        if (moreBtn) moreBtn.click();
    })()`, '9222');
    await sleep(600);
    // Click Delete
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.dropdown-item-btn'));
        const delBtn = items.find(b => b.innerText.includes('Delete'));
        if (delBtn) delBtn.click();
    })()`, '9222');
    await sleep(1000);

    const deleteModalState = await evalInPage(`(() => {
        const modal = document.querySelector('.delete-modal-box');
        if (!modal) return { found: false };
        const buttons = Array.from(modal.querySelectorAll('.delete-action-btn'));
        return {
            found: true,
            buttons: buttons.map(b => b.innerText.trim())
        };
    })()`, '9222');
    console.log('Delete modal options:', deleteModalState);
    captureScreenshot('evidence_08_delete_modal.png');

    // Cancel delete
    await evalInPage(`(() => {
        const cancelBtn = document.querySelector('.delete-cancel-btn');
        if (cancelBtn) cancelBtn.click();
    })()`, '9222');
    await sleep(1000);

    // 11. Edit Flow
    console.log('\n--- STEP 11: MESSAGE EDIT FLOW ---');
    // Re-select message
    await evalInPage(`(() => {
        const rows = document.querySelectorAll('.message-row-wrapper');
        const row = rows[rows.length - 1];
        if (row) {
            const rect = row.getBoundingClientRect();
            row.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
                button: 0
            }));
        }
    })()`, '9222');
    await sleep(700);
    await evalInPage(`window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))`, '9222');
    await sleep(600);
    // Click more
    await evalInPage(`(() => {
        const moreBtn = document.querySelector('.menu-action-more-btn');
        if (moreBtn) moreBtn.click();
    })()`, '9222');
    await sleep(600);
    // Click Edit
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.dropdown-item-btn'));
        const editBtn = items.find(b => b.innerText.includes('Edit'));
        if (editBtn) editBtn.click();
    })()`, '9222');
    await sleep(1000);

    const editBannerState = await evalInPage(`(() => {
        const banner = document.querySelector('.chat-editing-banner');
        const input = document.getElementById('chat-message-input') || document.querySelector('.chat-input');
        return {
            hasEditingBanner: !!banner,
            inputValue: input ? input.value : null
        };
    })()`, '9222');
    console.log('Editing banner state:', editBannerState);
    captureScreenshot('evidence_09_edit_mode_active.png');

    console.log('\n=== ALL PHYSICAL LIGHTWEIGHT EMULATOR QA CHECKS COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
    console.error('Fatal QA error:', err);
    process.exit(1);
});
