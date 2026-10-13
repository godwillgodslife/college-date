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

async function main() {
    console.log('=== RUNNING COMPLETE FUNCTIONAL SMOKE TESTS ON EMULATOR ===');
    process.env.CDP_PORT = '9222';

    // 1. Authenticate test user
    console.log('Ensuring valid auth session for Alex Davis...');
    const authData = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const sessionObj = authData.session || (authData.access_token ? authData : null);
    if (!sessionObj) throw new Error('Auth failed');
    const sessionStr = JSON.stringify(sessionObj);

    // ====================================================
    // TEST 1: PROFILE PAGE, AVATAR-FIRST & FACE VERIFICATION MODAL
    // ====================================================
    console.log('\n--- 1. PROFILE PAGE & VERIFICATION MODAL ---');
    await evalInPage(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        window.location.href = '/profile';
    })()`);
    await sleep(3500);

    const profileState = await evalInPage(`(() => {
        const header = document.querySelector('.profile-header');
        const avatar = document.querySelector('.profile-avatar');
        const name = document.querySelector('.profile-name')?.innerText;
        const ytBridge = document.querySelector('.profile-yt-bridge-btn');
        const eliteBadge = document.querySelector('.premium-badge-pill');
        const bottomNavItems = Array.from(document.querySelectorAll('.bottom-nav-item')).map(t => t.innerText.trim().replace(/\\n/g, ' '));
        return {
            hasHeader: Boolean(header),
            hasAvatar: Boolean(avatar),
            name,
            hasYtBridge: Boolean(ytBridge),
            hasEliteBadge: Boolean(eliteBadge),
            bottomNavItems
        };
    })()`);
    console.log('Profile DOM Inspection:', profileState);
    captureScreenshot('smoke_01_avatar_first_profile.png');

    // Tap verified badge to trigger Face Verification modal
    console.log('Tapping verified badge to open Face Verification Modal...');
    await evalInPage(`(() => {
        const badge = document.querySelector('.verified-badge-pill');
        if (badge) badge.click();
    })()`);
    await sleep(2000);
    captureScreenshot('smoke_01_face_verification_modal.png');

    // Close modal
    await evalInPage(`(() => {
        const closeBtn = document.querySelector('.modal-close, button[aria-label*="Close"], .close-btn, .face-verify-close-btn');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(1000);

    // ====================================================
    // TEST 2: CONFESSIONS FEED & COMPOSE MODAL
    // ====================================================
    console.log('\n--- 2. CONFESSIONS FEED & COMPOSE MODAL ---');
    const startConfession = Date.now();
    await evalInPage(`(() => {
        window.location.href = '/confessions';
    })()`);
    await sleep(3000);
    console.log(`Confessions loaded in ${Date.now() - startConfession}ms`);

    const confessionsState = await evalInPage(`(() => {
        const feed = document.querySelector('.confessions-feed, .confessions-list, .confessions-page');
        const cards = document.querySelectorAll('.confession-card');
        const composeBtn = document.querySelector('.create-confession-btn, .new-confession-btn, .fab-post-btn, .btn-create-confession, button[class*="confess"]');
        const activeNav = document.querySelector('.bottom-nav-item.active')?.innerText?.trim().replace(/\\n/g, ' ');
        return {
            hasFeed: Boolean(feed),
            cardCount: cards.length,
            hasComposeBtn: Boolean(composeBtn),
            activeNav
        };
    })()`);
    console.log('Confessions DOM Inspection:', confessionsState);
    captureScreenshot('smoke_02_confessions_feed.png');

    // Open Confession Compose
    console.log('Opening Confession Compose modal...');
    await evalInPage(`(() => {
        const composeBtn = document.querySelector('.create-confession-btn, .new-confession-btn, .fab-post-btn, .btn-create-confession, button[class*="confess"]');
        if (composeBtn) composeBtn.click();
    })()`);
    await sleep(1500);
    captureScreenshot('smoke_02_confession_compose.png');

    // Close Confession modal if open
    await evalInPage(`(() => {
        const cancelBtn = document.querySelector('.modal-close, .btn-cancel, button[aria-label*="Close"]');
        if (cancelBtn) cancelBtn.click();
    })()`);
    await sleep(1000);

    // ====================================================
    // TEST 3: CONTEXTUAL 3-DAY FREE TRIAL PAYWALL
    // ====================================================
    console.log('\n--- 3. CONTEXTUAL 3-DAY FREE TRIAL PAYWALL ---');
    // Open /premium with touchpoint parameter or trigger paywall
    await evalInPage(`(() => {
        window.location.href = '/premium?touchpoint=rewind';
    })()`);
    await sleep(3000);

    // Scroll to see offer and interactive options
    await evalInPage(`window.scrollTo({ top: 350, behavior: 'smooth' })`);
    await sleep(1000);
    captureScreenshot('smoke_03_premium_3day_trial_offer.png');

    // Trigger ContextualPaywallSheet directly via event or banner
    console.log('Triggering ContextualPaywallSheet on emulator...');
    await evalInPage(`(() => {
        const banner = document.querySelector('.premium-trial-banner');
        if (banner) {
            banner.click();
            return 'clicked banner';
        }
        return 'no banner';
    })()`);
    await sleep(2000);

    const sheetCheck = await evalInPage(`(() => {
        const sheet = document.querySelector('.contextual-paywall-sheet, .paywall-sheet-container');
        const title = sheet?.querySelector('.paywall-sheet-header h2, h2')?.innerText;
        const ctaBtn = sheet?.querySelector('.btn-trial-claim, .btn-primary, button[class*="trial"]')?.innerText;
        return {
            hasSheet: Boolean(sheet),
            title,
            ctaBtn
        };
    })()`);
    console.log('Paywall Sheet State:', sheetCheck);
    captureScreenshot('smoke_03_contextual_trial_sheet.png');

    // Dismiss sheet and restore user to default match landing
    console.log('\nRestoring user to clean default Match landing page...');
    await evalInPage(`(() => {
        window.location.href = '/match';
    })()`);
    await sleep(2500);
    captureScreenshot('smoke_04_default_match_landing.png');

    console.log('\n=== ALL SMOKE TEST STEPS COMPLETED SUCCESSFULLY! ===');
}

main().catch(err => {
    console.error('Smoke tests failed:', err);
    process.exit(1);
});
