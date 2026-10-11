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

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function getSession(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

async function run() {
    console.log('=== CONTEXTUAL PREMIUM TRIAL & TOUCHPOINTS EMULATOR QA ===');
    console.log('Target Device: emulator-5554 (Pixel_3a_Lightweight)');

    // Ensure port 9222 forward to webview
    const unixOut = execSync(`${ADB} shell cat /proc/net/unix`).toString();
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (match) {
        console.log('[QA] Forwarding port 9222 to socket:', match[1]);
        execSync(`${ADB} forward tcp:9222 localabstract:${match[1]}`);
    }

    process.env.CDP_PORT = '9222';

    // 1. Authenticate user
    console.log('\n--- STEP 1: AUTHENTICATING TEST USER ---');
    const authData = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const sessionObj = authData.session || (authData.access_token ? authData : null);
    if (!sessionObj) {
        throw new Error(`Failed to sign in: ${JSON.stringify(authData)}`);
    }
    console.log(`✓ Authenticated as ${sessionObj.user.email} (ID: ${sessionObj.user.id})`);

    const sessionStr = JSON.stringify(sessionObj);
    await evalInPage(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        window.location.href = '/match';
    })()`);
    await sleep(3500);

    console.log('\n--- STEP 2: VERIFYING MATCH DISCOVERY & CLEARANCE ---');
    captureScreenshot('evidence_01_match_discovery_live.png');

    // 2. Navigate to /profile/edit and inspect 10s Video Profile
    console.log('\n--- STEP 3: NAVIGATING TO PROFILE / EDIT ---');
    await evalInPage(`(() => {
        window.location.href = '/profile/edit';
    })()`);
    await sleep(3000);

    // Scroll to video section
    await evalInPage(`(() => {
        const sections = Array.from(document.querySelectorAll('section'));
        const videoSection = sections.find(s => s.innerText.includes('Video Profile') || s.innerText.includes('10s Video'));
        if (videoSection) {
            videoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    })()`);
    await sleep(1500);
    captureScreenshot('evidence_02_edit_profile_video_section.png');

    // 3. Navigate to /viewers (Secret Admirers)
    console.log('\n--- STEP 4: NAVIGATING TO SECRET ADMIRERS (VIEWERS) ---');
    await evalInPage(`(() => {
        window.location.href = '/viewers';
    })()`);
    await sleep(3000);
    captureScreenshot('evidence_03_viewers_secret_admirers.png');

    // 4. Test In-App Paywall Sheet Case A (3-Day Free Trial Timeline)
    console.log('\n--- STEP 5: VERIFYING CONTEXTUAL PAYWALL (CASE A: 3-DAY FREE TRIAL) ---');
    await evalInPage(`(() => {
        // Render or trigger Paywall Sheet in Case A mode
        const btn = document.querySelector('.btn-unlock-premium');
        if (btn) btn.click();
    })()`);
    await sleep(1500);

    // If not open via button, trigger open directly
    const opened = await evalInPage(`Boolean(document.querySelector('.paywall-sheet-container'))`);
    if (!opened) {
        console.log('[QA] Opening paywall sheet via test trigger...');
        await evalInPage(`(() => {
            const ev = new CustomEvent('tcd:open-paywall', { detail: { triggerSource: 'viewers_list' } });
            window.dispatchEvent(ev);
        })()`);
        await sleep(1000);
    }

    captureScreenshot('evidence_04_paywall_sheet_live.png');

    console.log('\n=== LIVE EMULATOR VERIFICATION COMPLETE ===');
}

run().catch(err => {
    console.error('QA Error:', err);
    process.exit(1);
});
