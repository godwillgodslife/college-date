import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import path from 'path';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;
const ARTIFACT_DIR = path.resolve('public/evidence_qa');

function snap(name) {
    const full = path.join(ARTIFACT_DIR, name);
    execSync(`${ADB} shell screencap -p /sdcard/screen.png`);
    execSync(`${ADB} pull /sdcard/screen.png "${full}"`);
    console.log(`[Snap] Saved ${name}`);
    return full;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    process.env.CDP_PORT = '9222';
    console.log('=== CAPTURING CRISP SMOKE TEST PROOFS ACROSS 5-TAB APP ===');

    // 1. We are already on Match! Let's click the "💎 Premium Unlock Available" chip to trigger the paywall!
    console.log('\n--- 1. TRIGGERING CONTEXTUAL PAYWALL FROM MATCH ---');
    await evalInPage(`(() => {
        const chip = Array.from(document.querySelectorAll('span, div, button')).find(el => el.innerText && el.innerText.includes('Premium Unlock Available'));
        if (chip) {
            chip.click();
            return 'clicked premium chip';
        }
        return 'not found';
    })()`);
    await sleep(1500);
    snap('smoke_step1_paywall_triggered.png');

    // Dismiss modal if open
    await evalInPage(`(() => {
        const close = document.querySelector('.modal-close, .sheet-close, button[aria-label*="Close"]');
        if (close) close.click();
    })()`);
    await sleep(500);

    // 2. Tap Confessions tab in bottom nav
    console.log('\n--- 2. TAPPING CONFESSIONS TAB IN 5-TAB BAR ---');
    await evalInPage(`(() => {
        const tabs = Array.from(document.querySelectorAll('.bottom-nav-item'));
        const confTab = tabs.find(t => t.innerText.includes('Confessions'));
        if (confTab) confTab.click();
    })()`);
    await sleep(1500);
    snap('smoke_step2_confessions_tab.png');

    // 3. Tap Profile tab in bottom nav
    console.log('\n--- 3. TAPPING PROFILE TAB IN 5-TAB BAR ---');
    await evalInPage(`(() => {
        const tabs = Array.from(document.querySelectorAll('.bottom-nav-item'));
        const profTab = tabs.find(t => t.innerText.includes('Profile'));
        if (profTab) profTab.click();
    })()`);
    await sleep(1500);
    snap('smoke_step3_profile_tab.png');

    // 4. In Profile, tap the YouTube-style "Campus Command Center" button!
    console.log('\n--- 4. TAPPING YOUTUBE COMMAND CENTER BRIDGE IN PROFILE ---');
    await evalInPage(`(() => {
        const ytBridge = document.querySelector('.profile-yt-bridge-btn');
        if (ytBridge) ytBridge.click();
    })()`);
    await sleep(1500);
    snap('smoke_step4_campus_command_center.png');

    // 5. Return to Match tab
    console.log('\n--- 5. RETURNING TO DEFAULT MATCH TAB ---');
    await evalInPage(`(() => {
        const tabs = Array.from(document.querySelectorAll('.bottom-nav-item'));
        const matchTab = tabs.find(t => t.innerText.includes('Match'));
        if (matchTab) matchTab.click();
    })()`);
    await sleep(1500);
    snap('smoke_step5_match_tab_restored.png');

    console.log('\n=== ALL SMOKE PROOFS CAPTURED SUCCESSFULLY! ===');
}

main().catch(console.error);
