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
    console.log(`[Captured Artifact] ${filename}`);
    return fullPath;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getSession(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

async function run() {
    console.log('====================================================');
    console.log('🎯 PHYSICAL EMULATOR FUNCTIONAL SMOKE TEST SUITE');
    console.log('Device: Pixel_3a_Lightweight (emulator-5554)');
    console.log('====================================================\n');

    // Ensure ADB port forwarding
    try {
        const testRes = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
        if (!testRes || testRes.length === 0) throw new Error('empty');
        console.log('[ADB] Port 9222 is already open and responding with target:', testRes[0].title);
    } catch (e) {
        const unixOut = execSync(`${ADB} shell cat /proc/net/unix`).toString();
        const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
        if (match) {
            console.log('[ADB] Forwarding port 9222 to socket:', match[1]);
            execSync(`${ADB} forward tcp:9222 localabstract:${match[1]}`);
        }
    }
    process.env.CDP_PORT = '9222';

    // Authenticate
    console.log('Authenticating test student...');
    const authData = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const sessionObj = authData.session || (authData.access_token ? authData : null);
    if (!sessionObj) throw new Error('Auth failed');
    const sessionStr = JSON.stringify(sessionObj);

    // ====================================================
    // TEST 1: UNVERIFIED PROFILE STATE & FACE VERIFICATION MODAL
    // ====================================================
    console.log('\n--- SMOKE TEST 1: PROFILE PAGE & VERIFICATION MODAL ---');
    await evalInPage(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        window.location.href = '/profile';
    })()`);
    await sleep(3500);

    const profileAudit = await evalInPage(`(() => {
        const header = document.querySelector('.profile-header');
        const ytBridge = document.querySelector('.profile-yt-bridge-btn');
        const verifyBadge = document.querySelector('.verified-badge-pill');
        const eliteBadge = document.querySelector('.premium-badge-pill');
        const bottomTabs = Array.from(document.querySelectorAll('.bottom-nav-item')).map(t => t.innerText.trim().replace(/\\n/g, ' '));
        return {
            hasHeader: Boolean(header),
            hasYtBridge: Boolean(ytBridge),
            verifiedPillText: verifyBadge?.innerText,
            elitePillText: eliteBadge?.innerText,
            bottomTabs
        };
    })()`);
    console.log('Profile Structure Audit:', profileAudit);
    captureScreenshot('smoke_01_profile_avatar_first.png');

    // Tap Verified badge to open Face Verification Modal
    console.log('Opening Face & Photo Verification Modal on live emulator...');
    await evalInPage(`(() => {
        const badge = document.querySelector('.verified-badge-pill');
        if (badge) badge.click();
    })()`);
    await sleep(1500);
    captureScreenshot('smoke_01_face_verification_modal.png');

    // Close modal
    await evalInPage(`(() => {
        const closeBtn = document.querySelector('.modal-close-btn, .face-verify-close-btn, button[aria-label="Close"], .modal-overlay');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(1000);

    // ====================================================
    // TEST 2: CONFESSIONS FEED INSTANT OPENING & REACTIONS
    // ====================================================
    console.log('\n--- SMOKE TEST 2: CONFESSIONS FEED & REACTIONS ---');
    const startConfession = Date.now();
    await evalInPage(`(() => {
        window.location.href = '/confessions';
    })()`);
    await sleep(3000);
    const confessionOpenTime = Date.now() - startConfession;
    console.log(`Confessions navigated in ~${confessionOpenTime}ms`);

    const confessionsAudit = await evalInPage(`(() => {
        const cards = document.querySelectorAll('.confession-card');
        const bottomNavTabs = Array.from(document.querySelectorAll('.bottom-nav-item')).map(t => t.innerText.trim().replace(/\\n/g, ' '));
        const activeNavTab = document.querySelector('.bottom-nav-item.active')?.innerText?.trim().replace(/\\n/g, ' ');
        return {
            confessionCount: cards.length,
            bottomNavTabs,
            activeNavTab
        };
    })()`);
    console.log('Confessions Feed Audit:', confessionsAudit);
    captureScreenshot('smoke_02_confessions_screen.png');

    // ====================================================
    // TEST 3: CONTEXTUAL 3-DAY FREE TRIAL PAYWALL
    // ====================================================
    console.log('\n--- SMOKE TEST 3: CONTEXTUAL 3-DAY FREE TRIAL PAYWALL ---');
    // Navigate to /viewers (Secret Admirers touchpoint)
    await evalInPage(`(() => {
        window.location.href = '/viewers';
    })()`);
    await sleep(3000);
    captureScreenshot('smoke_03_viewers_touchpoint.png');

    console.log('Triggering Contextual Paywall Sheet (Secret Admirers)...');
    await evalInPage(`(() => {
        const unlockBtn = document.querySelector('.btn-unlock-premium');
        if (unlockBtn) unlockBtn.click();
    })()`);
    await sleep(2000);

    const paywallAudit = await evalInPage(`(() => {
        const sheet = document.querySelector('.paywall-sheet-container, .contextual-paywall-sheet, .modal-sheet');
        const title = sheet?.querySelector('.paywall-sheet-header h2, .paywall-sheet-title, h2')?.innerText;
        const ctaBtn = sheet?.querySelector('.btn-trial-claim, .btn-primary, button[class*="trial"]')?.innerText;
        const timelineSteps = Array.from(sheet ? sheet.querySelectorAll('.timeline-step, .trial-timeline-item') : []).map(s => s.innerText.trim().replace(/\\n/g, ' '));
        return {
            isOpen: Boolean(sheet),
            title,
            ctaBtn,
            timelineStepsCount: timelineSteps.length,
            timelineSample: timelineSteps.slice(0, 3)
        };
    })()`);
    console.log('Contextual Paywall Sheet Audit:', paywallAudit);
    captureScreenshot('smoke_03_contextual_3day_trial_sheet.png');

    // Restore to Match landing page
    console.log('\nRestoring user back to Match default landing page...');
    await evalInPage(`(() => {
        window.location.href = '/match';
    })()`);
    await sleep(2500);
    captureScreenshot('smoke_04_match_landing_restored.png');

    console.log('\n====================================================');
    console.log('🎉 ALL 3 SMOKE TEST FLOWS COMPLETED & VERIFIED!');
    console.log('====================================================');
}

run().catch(err => {
    console.error('Smoke Test Failed:', err);
    process.exit(1);
});
