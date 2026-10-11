import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    console.log('=== CONTEXTUAL PREMIUM TRIAL & IN-APP PAYWALL EMULATOR QA ===');
    console.log('Target Device: emulator-5554 (Pixel_3a_Lightweight)');

    // 0. Ensure port 9222 forward to webview
    const unixOut = execSync(`${ADB} shell cat /proc/net/unix`).toString();
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (match) {
        console.log('[QA] Forwarding port 9222 to socket:', match[1]);
        execSync(`${ADB} forward tcp:9222 localabstract:${match[1]}`);
    }

    process.env.CDP_PORT = '9222';

    // 1. Check current route and navigate to /premium
    console.log('\n--- STEP 1: VERIFYING PREMIUM PAGE & STUDENT 3-DAY TRIAL BANNER ---');
    await evalInPage(`(() => {
        window.location.hash = '';
        window.history.pushState({}, '', '/premium');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(2000);

    // Scroll to see plan section and student banner
    await evalInPage(`window.scrollTo({ top: 380, behavior: 'smooth' })`);
    await sleep(1000);
    captureScreenshot('evidence_01_premium_student_banner.png');

    // 2. Open ContextualPaywallSheet in Case A: 3-Day Free Trial (Trigger: Viewers)
    console.log('\n--- STEP 2: OPENING CONTEXTUAL PAYWALL (CASE A: 3-DAY FREE TRIAL) ---');
    await evalInPage(`(() => {
        // Find paywall sheet button or trigger via state
        const banner = document.querySelector('.premium-trial-banner') || document.querySelector('.btn-sheet-primary-trial');
        if (banner) banner.click();
    })()`);
    await sleep(1500);

    // Check if sheet opened
    const isSheetOpen = await evalInPage(`Boolean(document.querySelector('.paywall-sheet-container'))`);
    console.log('Is Paywall Sheet DOM Present:', isSheetOpen);

    captureScreenshot('evidence_02_paywall_trial_timeline.png');

    // 3. Test Swipe/Drag-to-dismiss gesture physics on Android
    console.log('\n--- STEP 3: TESTING TOUCH DISMISS GESTURE ---');
    // Simulate drag down via adb input swipe
    execSync(`${ADB} shell input swipe 540 800 540 1800 300`);
    await sleep(1000);
    captureScreenshot('evidence_03_after_drag_dismiss.png');

    // 4. Navigate to /profile/edit and verify 10s Video Profile locked card
    console.log('\n--- STEP 4: VERIFYING 10S VIDEO PROFILE TOUCHPOINT IN /profile/edit ---');
    await evalInPage(`(() => {
        window.history.pushState({}, '', '/profile/edit');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(2000);

    await evalInPage(`(() => {
        const videoSection = document.querySelector('.video-premium-locked-card');
        if (videoSection) {
            videoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    })()`);
    await sleep(1200);
    captureScreenshot('evidence_04_edit_profile_video_locked.png');

    // 5. Click video locked card to open Contextual Paywall Sheet with triggerSource="video_upload"
    console.log('\n--- STEP 5: OPENING PAYWALL VIA VIDEO PROFILE TOUCHPOINT ---');
    await evalInPage(`(() => {
        const card = document.querySelector('.video-premium-locked-card');
        if (card) card.click();
    })()`);
    await sleep(1500);
    captureScreenshot('evidence_05_paywall_video_upload_trigger.png');

    // Dismiss again
    execSync(`${ADB} shell input tap 540 200`); // Tap backdrop
    await sleep(1000);

    console.log('\n=== EMULATOR QA COMPLETE: ALL 5 EVIDENCE SCREENSHOTS CAPTURED ===');
}

run().catch(err => {
    console.error('QA Error:', err);
    process.exit(1);
});
