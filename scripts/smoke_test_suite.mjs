import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ADB = process.env.LOCALAPPDATA + '\\Android\\Sdk\\platform-tools\\adb.exe';

function captureScreen(filename) {
    const remotePath = '/sdcard/smoke_screen.png';
    execSync(`"${ADB}" shell screencap -p ${remotePath}`);
    const localPath = path.resolve('public', 'evidence_qa', filename);
    if (!fs.existsSync(path.dirname(localPath))) {
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
    }
    execSync(`"${ADB}" pull ${remotePath} "${localPath}"`);
    console.log(`Saved screenshot to ${localPath}`);
    return localPath;
}

async function getCDPPage() {
    const res = await fetch('http://localhost:9222/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No CDP page target found');
    return page;
}

export async function createCDPClient() {
    const page = await getCDPPage();
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    let nextId = 1;
    const pending = new Map();

    ws.on('message', data => {
        const parsed = JSON.parse(data.toString());
        if (parsed.id && pending.has(parsed.id)) {
            pending.get(parsed.id)(parsed.result);
            pending.delete(parsed.id);
        }
    });

    const send = (method, params = {}) => new Promise(resolve => {
        const id = nextId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
    });

    const evalJs = async (code) => {
        const res = await send('Runtime.evaluate', {
            expression: code,
            returnByValue: true,
            awaitPromise: true
        });
        if (res?.exceptionDetails) {
            console.error('JS Exception:', res.exceptionDetails);
        }
        return res?.result?.value;
    };

    return { ws, send, evalJs, close: () => ws.close() };
}

async function runSmokeTests() {
    console.log('=== STARTING FUNCTIONAL SMOKE TEST SUITE ON EMULATOR ===');
    const client = await createCDPClient();

    try {
        // ==========================================
        // JOURNEY 1: NEW USER & UNVERIFIED PROFILE
        // ==========================================
        console.log('\n--- JOURNEY 1: New User Registration & Unverified Profile ---');
        
        // 1A. Inspect Signup Page
        console.log('Navigating to /signup...');
        await client.evalJs(`window.location.hash = ''; window.history.pushState({}, '', '/signup'); window.dispatchEvent(new PopStateEvent('popstate'));`);
        await new Promise(r => setTimeout(r, 2000));
        
        const signupDom = await client.evalJs(`({
            pathname: window.location.pathname,
            hasForm: Boolean(document.querySelector('form')),
            title: document.title,
            inputs: Array.from(document.querySelectorAll('input')).map(i => i.placeholder || i.name || i.type),
            submitBtn: document.querySelector('button[type="submit"]')?.innerText || document.querySelector('.btn-primary')?.innerText
        })`);
        console.log('Signup Page DOM State:', signupDom);
        captureScreen('smoke1_signup_page.png');

        // 1B. Test Unverified Profile State
        console.log('\nSimulating Unverified Student Profile in /profile...');
        // Set an unverified student in session
        await client.evalJs(`
            (() => {
                const sessionKey = 'sb-gedoyoleoscgxgdqszzc-auth-token';
                const existing = JSON.parse(localStorage.getItem(sessionKey) || '{}');
                const unverifiedUser = {
                    ...(existing.user || {}),
                    id: 'unverified-test-uuid',
                    email: 'unverified.student@unilag.edu.ng',
                    user_metadata: { full_name: 'David Okafor', university: 'UNILAG' }
                };
                localStorage.setItem(sessionKey, JSON.stringify({
                    access_token: 'mock-token',
                    user: unverifiedUser
                }));
                // Mock user profile in cache or localStorage if needed
                localStorage.setItem('tcd_cached_profile', JSON.stringify({
                    id: 'unverified-test-uuid',
                    name: 'David Okafor',
                    age: 21,
                    gender: 'Male',
                    university: 'University of Lagos',
                    faculty: 'Engineering',
                    department: 'Mechanical Engineering',
                    level: '300L',
                    is_verified: false,
                    photo_verified: false,
                    ai_verification_status: 'not_started',
                    bio: 'Tech enthusiast and robotics fan',
                    interests: ['Robotics', 'Chess', 'Coding'],
                    photos: ['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600']
                }));
                window.history.pushState({}, '', '/profile');
                window.dispatchEvent(new PopStateEvent('popstate'));
            })()
        `);
        await new Promise(r => setTimeout(r, 2000));

        const unverifiedProfileState = await client.evalJs(`
            (() => {
                const verifyCard = document.querySelector('.verification-card-permanent');
                const header = document.querySelector('.profile-header');
                const name = document.querySelector('.profile-name')?.innerText;
                const ytBridge = document.querySelector('.profile-yt-bridge-btn');
                return {
                    pathname: window.location.pathname,
                    name,
                    hasVerificationCard: Boolean(verifyCard),
                    verificationCardText: verifyCard?.innerText?.slice(0, 100),
                    hasAvatarHeader: Boolean(header),
                    hasYtBridge: Boolean(ytBridge),
                    bottomNavCount: document.querySelectorAll('.bottom-nav-item').length
                };
            })()
        `);
        console.log('Unverified Profile DOM State:', unverifiedProfileState);
        captureScreen('smoke1_unverified_profile.png');

        // ==========================================
        // JOURNEY 2: CONFESSIONS FEED & INTERACTIONS
        // ==========================================
        console.log('\n--- JOURNEY 2: Confessions Feed Instant Loading & Interactions ---');
        const startConfession = Date.now();
        await client.evalJs(`window.history.pushState({}, '', '/confessions'); window.dispatchEvent(new PopStateEvent('popstate'));`);
        await new Promise(r => setTimeout(r, 1200));
        const loadDuration = Date.now() - startConfession;
        console.log(`Confessions navigated in ~${loadDuration}ms`);

        const confessionsDom = await client.evalJs(`
            (() => {
                const confessionCards = document.querySelectorAll('.confession-card');
                const categoryTabs = Array.from(document.querySelectorAll('.confession-tag-chip, .filter-chip, .confessions-category-btn, .category-pill')).map(c => c.innerText.trim());
                const postBtn = document.querySelector('.create-confession-btn, .new-confession-btn, .fab-post-btn, .confession-compose-btn');
                return {
                    pathname: window.location.pathname,
                    confessionCount: confessionCards.length,
                    firstConfessionText: confessionCards[0]?.querySelector('.confession-text, p')?.innerText?.slice(0, 80),
                    categoryTabs,
                    hasPostButton: Boolean(postBtn),
                    bottomNavActiveTab: document.querySelector('.bottom-nav-item.active')?.innerText?.trim()
                };
            })()
        `);
        console.log('Confessions Page State:', confessionsDom);
        captureScreen('smoke2_confessions_feed.png');

        // Test reaction tap on first confession card
        console.log('Testing confession reaction interaction...');
        const reactionResult = await client.evalJs(`
            (() => {
                const firstCard = document.querySelector('.confession-card');
                const reactionBtn = firstCard?.querySelector('.reaction-btn, button[aria-label*="react"], .heart-btn, .like-btn');
                if (reactionBtn) {
                    reactionBtn.click();
                    return { clicked: true, text: reactionBtn.innerText };
                }
                return { clicked: false };
            })()
        `);
        console.log('Reaction click result:', reactionResult);
        await new Promise(r => setTimeout(r, 500));
        captureScreen('smoke2_confession_reaction.png');

        // ==========================================
        // JOURNEY 3: CONTEXTUAL 3-DAY FREE TRIAL PAYWALL
        // ==========================================
        console.log('\n--- JOURNEY 3: Contextual 3-Day Free Trial Paywall ---');
        console.log('Navigating to /match to trigger contextual trial paywall...');
        await client.evalJs(`window.history.pushState({}, '', '/match'); window.dispatchEvent(new PopStateEvent('popstate'));`);
        await new Promise(r => setTimeout(r, 1500));

        // Trigger contextual rewind paywall touchpoint
        console.log('Triggering contextual paywall touchpoint (Rewind / Unlimited Swipes)...');
        const triggerPaywall = await client.evalJs(`
            (() => {
                // If trial service is available, open contextual paywall event
                if (window.__TCD_OPEN_TRIAL_PAYWALL__) {
                    window.__TCD_OPEN_TRIAL_PAYWALL__('rewind');
                    return { triggeredVia: '__TCD_OPEN_TRIAL_PAYWALL__' };
                }
                // Or dispatch custom event
                window.dispatchEvent(new CustomEvent('tcd:open-trial-paywall', { detail: { touchpoint: 'rewind' } }));
                // Or click rewind button on match card
                const rewindBtn = document.querySelector('button[aria-label*="Rewind"], .btn-rewind, .rewind-action-btn, button.rewind');
                if (rewindBtn) {
                    rewindBtn.click();
                    return { triggeredVia: 'rewind-button' };
                }
                return { triggeredVia: 'custom-event' };
            })()
        `);
        console.log('Paywall trigger dispatch:', triggerPaywall);
        await new Promise(r => setTimeout(r, 1500));

        // If sheet is not open yet, let's navigate to /premium or trigger modal directly
        const sheetState = await client.evalJs(`
            (() => {
                const sheet = document.querySelector('.contextual-paywall-sheet, .paywall-bottom-sheet, .paywall-modal, .trial-paywall');
                const premiumPage = document.querySelector('.premium-upgrade-container');
                return {
                    hasSheet: Boolean(sheet),
                    sheetTitle: sheet?.querySelector('h2, h3, .paywall-title')?.innerText,
                    hasCta: Boolean(sheet?.querySelector('.trial-cta-btn, .btn-trial, button[class*="trial"]')),
                    ctaText: sheet?.querySelector('.trial-cta-btn, .btn-trial, button[class*="trial"]')?.innerText,
                    currentPath: window.location.pathname
                };
            })()
        `);
        console.log('Paywall Sheet State on /match:', sheetState);
        captureScreen('smoke3_match_rewind_attempt.png');

        // Let's also verify the dedicated /premium contextual presentation
        console.log('Navigating to /premium to inspect 3-Day Free Trial MVP offer...');
        await client.evalJs(`window.history.pushState({}, '', '/premium?touchpoint=rewind'); window.dispatchEvent(new PopStateEvent('popstate'));`);
        await new Promise(r => setTimeout(r, 2000));

        const premiumDom = await client.evalJs(`
            (() => {
                const ctaBtn = document.querySelector('.premium-cta-btn, .trial-cta-btn, button[class*="trial"], button[class*="premium"]');
                const trialBadge = document.querySelector('.trial-badge, .badge-trial, .contextual-banner');
                const plans = Array.from(document.querySelectorAll('.tier-card, .plan-card, .pricing-card')).map(p => p.innerText.slice(0, 50));
                return {
                    pathname: window.location.pathname,
                    hasCtaBtn: Boolean(ctaBtn),
                    ctaText: ctaBtn?.innerText,
                    hasTrialBadge: Boolean(trialBadge),
                    trialBadgeText: trialBadge?.innerText,
                    plansCount: plans.length
                };
            })()
        `);
        console.log('Premium 3-Day Free Trial Page State:', premiumDom);
        captureScreen('smoke3_contextual_paywall_premium.png');

        // Return user to clean match state
        console.log('\nRestoring user to clean match landing page...');
        await client.evalJs(`window.history.pushState({}, '', '/match'); window.dispatchEvent(new PopStateEvent('popstate'));`);
        await new Promise(r => setTimeout(r, 1000));

        console.log('\n=== ALL 3 FUNCTIONAL SMOKE TESTS COMPLETED SUCCESSFULLY! ===');
    } finally {
        client.close();
    }
}

runSmokeTests().catch(err => {
    console.error('Smoke test failure:', err);
    process.exit(1);
});
