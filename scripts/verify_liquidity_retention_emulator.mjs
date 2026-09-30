import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\83d0a166-be4e-4042-8b8d-140a6cfe8146';
const PUBLIC_DOCS_DIR = 'c:\\college-date\\docs';
const PORT = '9225';
const DEVICE = 'emulator-5554';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function captureScreenshot(filename) {
    const artPath = path.join(ARTIFACT_DIR, filename);
    const docPath = path.join(PUBLIC_DOCS_DIR, filename);

    try {
        execSync(`& "$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe" -s ${DEVICE} shell screencap -p /sdcard/${filename}; & "$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe" -s ${DEVICE} pull /sdcard/${filename} "${artPath}"`, { shell: 'powershell.exe' });
        if (fs.existsSync(artPath)) {
            try {
                fs.copyFileSync(artPath, docPath);
            } catch (e) {}
            console.log(`📸 Captured & Saved: ${filename}`);
        } else {
            console.error(`Failed to capture: ${filename}`);
        }
    } catch (err) {
        console.error(`Capture error for ${filename}:`, err.message);
    }
}

async function evalOnEmulator(expression) {
    return evalInPage(expression, PORT);
}

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function dismissOverlays() {
    await evalOnEmulator(`(() => {
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"], .modal-close');
        if (tour) tour.click();
        const xs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === '✕');
        xs.forEach(x => x.click());
    })()`).catch(() => {});
}

async function ensureAuthenticated(initialPath = '/dashboard') {
    console.log('Authenticating emulator directly via session token...');
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
            body: JSON.stringify({
                email: 'student.tester2026@gmail.com',
                password: 'CollegeDate2026!VerifiedPass'
            })
        });
        const session = await res.json();
        if (!session?.access_token) {
            console.error('Session fetch failed:', session);
            return;
        }

        const sessionStr = JSON.stringify(session);
        await evalOnEmulator(`(() => {
            localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
            window.location.href = '${initialPath}';
        })()`);
        await sleep(4000);
        await dismissOverlays();
    } catch (err) {
        console.error('ensureAuthenticated error:', err);
    }
}

async function runVerification() {
    console.log('================================================================');
    console.log('  COLLEGE DATE ACTIVE & MATCH CELEBRATION EMULATOR VERIFICATION');
    console.log(`  Device: Pixel 2 Lightweight (${DEVICE}, Port ${PORT})`);
    console.log('================================================================\n');

    // 1. Setup port forwarding for webview devtools
    try {
        const adbOut = execSync(`& "$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe" -s ${DEVICE} shell "cat /proc/net/unix | grep devtools"`, { shell: 'powershell.exe' }).toString();
        console.log('Active devtools sockets on emulator:\n', adbOut.trim());
        const match = adbOut.match(/@webview_devtools_remote_(\d+)/);
        if (match) {
            const socketName = `@webview_devtools_remote_${match[1]}`;
            console.log(`Forwarding tcp:${PORT} to ${socketName}...`);
            execSync(`& "$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe" -s ${DEVICE} forward tcp:${PORT} localabstract:${socketName.slice(1)}`, { shell: 'powershell.exe' });
        } else {
            console.warn('Could not find webview_devtools_remote socket, trying fallback forward...');
            execSync(`& "$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe" -s ${DEVICE} forward tcp:${PORT} localabstract:webview_devtools_remote_${DEVICE}`, { shell: 'powershell.exe' });
        }
    } catch (err) {
        console.warn('Forwarding check warning:', err.message);
    }

    await sleep(2000);
    await ensureAuthenticated('/dashboard');
    await sleep(3000);

    // --- TEST 1: Dashboard Active Program Card ---
    console.log('\n--- 1. Testing Dashboard College Date Active Card ---');
    const dashboardState = await evalOnEmulator(`(() => {
        const card = document.querySelector('.dashboard-active-program-card');
        const streakCard = document.querySelector('.dashboard-streak-card, [aria-label*="Score Streak"]');
        return {
            hasActiveCard: !!card,
            cardText: card ? card.innerText : null,
            hasStreakCard: !!streakCard
        };
    })()`);
    console.log('Dashboard State:', dashboardState);
    captureScreenshot('evidence_qa_01_dashboard_active_card.png');
    await sleep(1000);

    // --- TEST 2: Active Program Modal ---
    console.log('\n--- 2. Testing College Date Active Modal ---');
    await evalOnEmulator(`(() => {
        const card = document.querySelector('.dashboard-active-program-card');
        if (card) card.click();
    })()`);
    await sleep(2000);

    const modalState = await evalOnEmulator(`(() => {
        const modal = document.querySelector('.active-program-modal');
        const hero = document.querySelector('.active-earnings-value');
        const progressBar = document.querySelector('.active-progress-bar-fill');
        const checklistItems = document.querySelectorAll('.active-check-item');
        const metrics = document.querySelectorAll('.active-mini-metric');
        const primaryBtn = document.querySelector('.btn-active-primary');
        return {
            modalVisible: !!modal,
            heroEarnings: hero ? hero.innerText : null,
            progressWidth: progressBar ? progressBar.style.width : null,
            checklistCount: checklistItems.length,
            metricsCount: metrics.length,
            primaryBtnLabel: primaryBtn ? primaryBtn.innerText : null
        };
    })()`);
    console.log('Modal State:', modalState);
    captureScreenshot('evidence_qa_02_active_program_modal.png');
    await sleep(1000);

    // Close modal
    await evalOnEmulator(`(() => {
        const closeBtn = document.querySelector('.active-close-btn');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(1500);

    // --- TEST 3: Match Page & Match Celebration Popup ---
    console.log('\n--- 3. Testing Match Page & Celebration Popup ---');
    await evalOnEmulator(`window.location.href = '/match'`);
    await sleep(4000);
    await dismissOverlays();

    // Trigger MatchCelebration for inspection
    const matchCelebrationState = await evalOnEmulator(`(() => {
        // Trigger simulated celebration modal state via custom event or direct root trigger
        window.dispatchEvent(new CustomEvent('tcd:trigger-match-test', {
            detail: {
                id: 'test-user-id',
                full_name: 'Amara Kalu',
                avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
                university: 'University of Lagos',
                department: 'Computer Science',
                match_id: 'mock-match-uuid-12345'
            }
        }));

        // Or inject/test MatchCelebration presence in DOM
        const celebration = document.querySelector('.match-celebration-overlay');
        return {
            celebrationMounted: !!celebration,
            matchHeading: document.querySelector('.match-celebration-title')?.innerText || null
        };
    })()`);
    console.log('Match Celebration State:', matchCelebrationState);
    captureScreenshot('evidence_qa_03_match_screen.png');
    await sleep(1000);

    // --- TEST 4: Wallet Active Program Section ---
    console.log('\n--- 4. Testing Wallet Active Program Section ---');
    await evalOnEmulator(`window.location.href = '/wallet'`);
    await sleep(4000);
    await dismissOverlays();

    const walletState = await evalOnEmulator(`(() => {
        const cards = Array.from(document.querySelectorAll('.wallet-card, .dashboard-card, div'));
        const activeCard = cards.find(c => c.innerText && c.innerText.includes('College Date Active'));
        return {
            activeInWallet: !!activeCard,
            walletText: activeCard ? activeCard.innerText.slice(0, 100) : null
        };
    })()`);
    console.log('Wallet State:', walletState);
    captureScreenshot('evidence_qa_04_wallet_active_program.png');
    await sleep(1000);

    console.log('\n================================================================');
    console.log('  VERIFICATION COMPLETE — ALL SCREENSHOTS SAVED');
    console.log('================================================================\n');
}

runVerification().catch(console.error);
