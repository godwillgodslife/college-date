import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import path from 'path';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;

function captureScreenshot(filename) {
    const fullPath = path.resolve('public/evidence_qa', filename);
    execSync(`${ADB} shell screencap -p /sdcard/screen.png`);
    execSync(`${ADB} pull /sdcard/screen.png "${fullPath}"`);
    console.log(`[Screenshot Captured] ${filename}`);
    return fullPath;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log('=== VERIFYING INBOX SCROLL & COLLAPSE ON LIGHTWEIGHT EMULATOR ===');

    // 1. Add mock conversation items to test scroll overflow
    await evalInPage(`(() => {
        const list = document.querySelector('.conversation-list') || document.querySelector('.chat-sidebar');
        if (!list) return false;
        
        let container = document.getElementById('test-conv-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'test-conv-container';
            list.appendChild(container);
        }
        container.innerHTML = '';
        
        const sampleNames = ['Amaka O. (UNILAG)', 'Chinedu E. (UNN)', 'Fatima B. (ABU)', 'Tolani A. (OAU)', 'Kelechi M. (UNIBEN)', 'Zainab S. (BUK)', 'Dayo K. (LASU)', 'Blessing N. (UNIPORT)'];
        
        sampleNames.forEach((name, i) => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.style.padding = '1rem';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '12px';
            item.style.borderBottom = '1px solid rgba(255, 255, 255, 0.06)';
            item.innerHTML = \`
                <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #a855f7, #ec4899); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">\${name[0]}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">\${name}</div>
                    <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 2px;">Hey! Are you on campus today? 👋</div>
                </div>
                <div style="font-size: 0.72rem; color: #64748b;">12:\${i < 10 ? '0' + i : i} PM</div>
            \`;
            container.appendChild(item);
        });
        return true;
    })()`, '9222');

    await sleep(600);
    console.log('Top position captured:');
    captureScreenshot('evidence_01_inbox_top.png');

    // 2. Scroll .chat-sidebar down by 260px
    console.log('Scrolling down by 260px (collapsing header/search/chips/likes)...');
    const scrollRes = await evalInPage(`(() => {
        const sidebar = document.querySelector('.chat-sidebar');
        if (sidebar) {
            sidebar.scrollTop = 260;
            return {
                scrollTop: sidebar.scrollTop,
                scrollHeight: sidebar.scrollHeight,
                clientHeight: sidebar.clientHeight
            };
        }
        return null;
    })()`, '9222');
    console.log('Scroll metrics:', scrollRes);

    await sleep(800);
    captureScreenshot('evidence_02_inbox_scrolled.png');

    console.log('=== INBOX SCROLL TEST COMPLETE ===');
}

main().catch(console.error);
