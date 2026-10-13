import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

process.env.CDP_PORT = '9222';
const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;
const ARTIFACT_DIR = path.resolve('public/evidence_qa');

if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function captureScreenshot(filename) {
    const fullPath = path.join(ARTIFACT_DIR, filename);
    execSync(`${ADB} shell screencap -p /sdcard/screen.png`);
    execSync(`${ADB} pull /sdcard/screen.png "${fullPath}"`);
    console.log(`[Captured Artifact] ${filename}`);
    return fullPath;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log('=== VERIFYING DARK THEME ON CHAT SYSTEM ===');

    // 1. Enable Android System Dark Mode
    console.log('Setting Android system theme to night mode...');
    execSync(`${ADB} shell cmd uimode night yes`);
    await sleep(1000);

    // 2. Set dark theme preference in localStorage & documentElement
    await evalInPage(`(() => {
        localStorage.setItem('tcd_theme_preference', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
    })()`);
    await sleep(600);

    // Navigate to /chat
    console.log('Navigating to /chat in Dark Mode...');
    await evalInPage(`(() => {
        if (window.location.pathname !== '/chat') {
            window.location.href = '/chat';
        }
    })()`);
    await sleep(2500);

    // Check dark theme DOM and computed tokens
    const darkInboxAudit = await evalInPage(`(() => {
        const rootTheme = document.documentElement.getAttribute('data-theme');
        const rootClasses = document.documentElement.className;
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const wrapper = document.querySelector('.conversation-row-wrapper');
        const item = document.querySelector('.conversation-item');
        const name = item?.querySelector('.conv-name');
        const lastMsg = item?.querySelector('.conv-last-msg, .conv-info p, .conv-info span:not(.conv-name)');
        
        return {
            rootTheme,
            rootClasses,
            bodyBg,
            wrapperBg: wrapper ? window.getComputedStyle(wrapper).backgroundColor : null,
            itemBg: item ? window.getComputedStyle(item).backgroundColor : null,
            nameColor: name ? window.getComputedStyle(name).color : null,
            lastMsgColor: lastMsg ? window.getComputedStyle(lastMsg).color : null
        };
    })()`);
    console.log('Dark Mode Inbox Audit:', darkInboxAudit);
    captureScreenshot('chat_inbox_dark_live.png');

    // 3. Test Swipe in Dark Mode
    console.log('Testing swipe in Dark Mode...');
    const swipeDarkRes = await evalInPage(`(async () => {
        const item = document.querySelector('.conversation-item');
        if (!item) return { error: 'No item' };

        const propsKey = Object.keys(item).find(k => k.startsWith('__reactProps$'));
        const props = propsKey ? item[propsKey] : null;
        if (!props) return { error: 'No props' };

        props.onTouchStart({ touches: [{ clientX: 300, clientY: 200 }] });
        props.onTouchEnd({ changedTouches: [{ clientX: 180, clientY: 200 }] });

        await new Promise(r => setTimeout(r, 300));
        const updated = document.querySelector('.conversation-item');
        const delBtn = document.querySelector('.conv-swipe-btn.delete');
        const moreBtn = document.querySelector('.conv-swipe-btn.more');

        return {
            swipedTransform: updated?.style?.transform,
            hasDelete: !!delBtn,
            hasMore: !!moreBtn,
            deleteBg: delBtn ? window.getComputedStyle(delBtn).backgroundColor : null,
            moreBg: moreBtn ? window.getComputedStyle(moreBtn).backgroundColor : null
        };
    })()`);
    console.log('Swipe in Dark Mode:', swipeDarkRes);
    await sleep(600);
    captureScreenshot('chat_swipe_dark_live.png');

    // 4. Test Long-Press Sheet in Dark Mode
    console.log('Testing ChatActionModal in Dark Mode...');
    const sheetDarkRes = await evalInPage(`(async () => {
        const item = document.querySelector('.conversation-item');
        if (!item) return { error: 'No item' };

        const propsKey = Object.keys(item).find(k => k.startsWith('__reactProps$'));
        const props = propsKey ? item[propsKey] : null;
        if (!props) return { error: 'No props' };

        props.onContextMenu({ preventDefault: () => {} });
        await new Promise(r => setTimeout(r, 600));

        const sheet = document.querySelector('.chat-action-sheet');
        const contactCard = document.querySelector('.chat-action-contact-card');
        const nameEl = document.querySelector('.chat-action-name');
        const subtextEl = document.querySelector('.chat-action-subtext');
        const firstAction = document.querySelector('.chat-action-item');

        return {
            hasSheet: !!sheet,
            sheetBg: sheet ? window.getComputedStyle(sheet).backgroundColor : null,
            cardBg: contactCard ? window.getComputedStyle(contactCard).backgroundColor : null,
            nameColor: nameEl ? window.getComputedStyle(nameEl).color : null,
            subtextColor: subtextEl ? window.getComputedStyle(subtextEl).color : null,
            actionTextColor: firstAction ? window.getComputedStyle(firstAction).color : null
        };
    })()`);
    console.log('ChatActionModal in Dark Mode:', sheetDarkRes);
    await sleep(600);
    captureScreenshot('chat_action_sheet_dark_live.png');

    // Dismiss sheet
    await evalInPage(`(() => {
        const cancelBtn = document.querySelector('.chat-action-item.cancel');
        if (cancelBtn) cancelBtn.click();
    })()`);
    await sleep(600);

    // 5. Open Direct Chat Room in Dark Mode
    console.log('Opening direct conversation room in Dark Mode...');
    // Unswipe
    await evalInPage(`(() => {
        const item = document.querySelector('.conversation-item');
        const propsKey = Object.keys(item || {}).find(k => k.startsWith('__reactProps$'));
        const props = propsKey ? item[propsKey] : null;
        if (props?.onClick) props.onClick();
    })()`);
    await sleep(400);

    // Open room
    await evalInPage(`(() => {
        const item = document.querySelector('.conversation-item');
        const propsKey = Object.keys(item || {}).find(k => k.startsWith('__reactProps$'));
        const props = propsKey ? item[propsKey] : null;
        if (props?.onClick) props.onClick();
    })()`);

    for (let i = 0; i < 15; i++) {
        await sleep(1000);
        const hasComposer = await evalInPage(`!!document.getElementById('chat-message-input')`);
        if (hasComposer) break;
    }
    await sleep(1000);

    // Type draft in dark mode composer
    await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input');
        if (input) {
            input.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype || window.HTMLInputElement.prototype, "value")?.set;
            if (nativeSetter) {
                nativeSetter.call(input, "Hey! How does dark mode look? 🌙✨");
            } else {
                input.value = "Hey! How does dark mode look? 🌙✨";
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    })()`);
    await sleep(800);

    const roomDarkAudit = await evalInPage(`(() => {
        const header = document.querySelector('.chat-room-header, .header-name');
        const input = document.getElementById('chat-message-input');
        const icebreaker = document.querySelector('.chat-icebreaker-chip, .icebreaker-chip');
        const composerWrap = document.querySelector('.chat-input-area, .chat-composer-bar, .input-container');

        return {
            headerColor: header ? window.getComputedStyle(header).color : null,
            inputBg: input ? window.getComputedStyle(input).backgroundColor : null,
            inputColor: input ? window.getComputedStyle(input).color : null,
            icebreakerBg: icebreaker ? window.getComputedStyle(icebreaker).backgroundColor : null,
            composerBg: composerWrap ? window.getComputedStyle(composerWrap).backgroundColor : null
        };
    })()`);
    console.log('Room Dark Mode Audit:', roomDarkAudit);
    captureScreenshot('chat_conversation_room_dark_live.png');

    console.log('\n=== ALL DARK THEME SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

main().catch(err => {
    console.error('Dark theme verification failed:', err);
    process.exit(1);
});
