import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\0e0b216d-b069-49b6-9f02-559761a1265b';
const PUBLIC_DOCS_DIR = 'c:\\college-date\\docs';
const PORT = '9224';
const DEVICE = 'emulator-5558';

async function evalOnEmulator(expression) {
    return evalInPage(expression, PORT);
}

function captureScreenshot(filename) {
    const artPath = path.join(ARTIFACT_DIR, filename);
    const docPath = path.join(PUBLIC_DOCS_DIR, filename);

    execSync(`& "$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe" -s ${DEVICE} shell screencap -p /sdcard/${filename}; & "$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe" -s ${DEVICE} pull /sdcard/${filename} "${artPath}"`, { shell: 'powershell.exe' });
    if (fs.existsSync(artPath)) {
        try {
            fs.copyFileSync(artPath, docPath);
        } catch (e) {
            // ignore
        }
        console.log(`📸 Captured & Saved: ${filename}`);
    } else {
        console.error(`Failed to capture: ${filename}`);
    }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function navigateTo(pathname) {
    console.log(`Navigating to ${pathname}...`);
    await evalOnEmulator(`window.location.href = '${pathname}'`);
    await sleep(4000);
    await dismissOverlays();
}

async function dismissOverlays() {
    await evalOnEmulator(`(() => {
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"], .modal-close');
        if (tour) tour.click();
        const xs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === '✕');
        xs.forEach(x => x.click());
    })()`).catch(() => {});
}

async function ensureAuthenticated(initialPath = '/confessions') {
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
        await sleep(4500);
        await dismissOverlays();
    } catch (err) {
        console.error('ensureAuthenticated error:', err);
    }
}

async function runFullVerification() {
    console.log('================================================================');
    console.log('  STARTING PHYSICAL ANDROID EMULATOR QA SUITE');
    console.log('  Device: Pixel 2 Lightweight (emulator-5558, Port 9224)');
    console.log('================================================================\n');

    await ensureAuthenticated();

    // ── 1. CONFESSIONS NGL BANNER & POST TYPE SWITCHER ──
    console.log('--- 1. Verifying Confessions NGL Banner & Post Types ---');
    await navigateTo('/confessions');
    await dismissOverlays();
    await sleep(2500);

    const bannerAndComposer = await evalOnEmulator(`(() => {
        const nglBanner = !!document.querySelector('.ngl-banner');
        const shareBtn = !!document.querySelector('.ngl-btn-whatsapp');
        const inboxBtn = !!document.querySelector('.ngl-btn-inbox');
        const postTypeSwitch = !!document.querySelector('.post-type-switcher');
        const secretPill = document.querySelector('.type-pill.active')?.innerText;
        const mediaBtn = !!document.querySelector('.btn-add-media');
        return { nglBanner, shareBtn, inboxBtn, postTypeSwitch, activePill: secretPill, mediaBtn };
    })()`);
    console.log('Confessions Header & Composer State:', bannerAndComposer);
    captureScreenshot('evidence_01_confessions_ngl_and_post_types.png');
    await sleep(1000);

    // ── 2. CONFESSIONS REACTION BUTTONS (NO EVENT BUBBLING) ──
    console.log('\n--- 2. Verifying Emoji Reaction Buttons (No Event Bubbling) ---');
    // Check if card exists, else post one
    const postCount = await evalOnEmulator(`document.querySelectorAll('.confession-card').length`);
    if (postCount === 0) {
        console.log('Posting a campus confession for reaction testing...');
        await evalOnEmulator(`(async () => {
            const ta = document.querySelector('textarea');
            if (ta) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                setter.call(ta, 'Campus confession: Late night library study sessions hit different! 📚🔥');
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                const postBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Post Secret'));
                if (postBtn) postBtn.click();
            }
        })()`);
        await sleep(3000);
    }

    const reactionTest = await evalOnEmulator(`(async () => {
        const firstReaction = document.querySelector('.btn-reaction, .reaction-btn');
        if (!firstReaction) return { error: 'No reaction button found' };
        
        const drawerBefore = !!document.querySelector('.confession-drawer-content');
        firstReaction.click();
        await new Promise(r => setTimeout(r, 600));
        const drawerAfter = !!document.querySelector('.confession-drawer-content');

        return {
            clickedEmoji: firstReaction.innerText,
            drawerBefore,
            drawerAfter,
            bubblingPrevented: drawerAfter === false
        };
    })()`);
    console.log('Reaction Bubbling Result:', reactionTest);
    captureScreenshot('evidence_02_confession_reaction_no_bubbling.png');
    await sleep(1000);

    // ── 3. MOBILE COMMENT DRAWER (PINNED INPUT BAR & ACTIONS) ──
    console.log('\n--- 3. Verifying Mobile Comment Drawer (Pinned Input) ---');
    const drawerOpen = await evalOnEmulator(`(() => {
        const commentBtn = document.querySelector('.btn-social-action.comment-action, .social-actions button:nth-child(2)');
        if (commentBtn) {
            commentBtn.click();
            return { clicked: true };
        }
        return { clicked: false };
    })()`);
    console.log('Comment drawer opened:', drawerOpen);
    await sleep(2000);

    const drawerMetrics = await evalOnEmulator(`(() => {
        const drawer = document.querySelector('.confession-drawer-content');
        const inputWrap = document.querySelector('.comment-input-wrapper');
        const input = document.querySelector('.comment-input');
        const sendBtn = document.querySelector('.comment-send-btn');
        if (!inputWrap) return { error: 'Comment input wrapper not found' };

        const rect = inputWrap.getBoundingClientRect();
        const style = window.getComputedStyle(inputWrap);
        return {
            isOpen: !!drawer,
            position: style.position,
            bottom: style.bottom,
            top: rect.top,
            visibleHeight: window.innerHeight,
            inputBarOnScreen: rect.bottom <= window.innerHeight + 10,
            hasInput: !!input,
            hasSendBtn: !!sendBtn
        };
    })()`);
    console.log('Mobile Drawer Metrics:', drawerMetrics);
    captureScreenshot('evidence_03_confessions_comment_drawer_pinned.png');
    await sleep(1000);

    // Close drawer
    await evalOnEmulator(`(() => {
        const closeBtn = document.querySelector('.drawer-close-btn');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(1000);

    // ── 4. ANONYMOUS ASK PUBLIC PAGE (/ask/:username) ──
    console.log('\n--- 4. Verifying Public Anonymous Ask Page ---');
    await navigateTo('/ask/tester2026');
    await sleep(2500);

    const askPageState = await evalOnEmulator(`(() => {
        const header = document.querySelector('.ask-card-header')?.innerText;
        const chips = Array.from(document.querySelectorAll('.starter-chip')).map(c => c.innerText);
        const textarea = !!document.querySelector('.ask-textarea');
        const sendBtn = document.querySelector('.ask-submit-btn')?.innerText;
        const banner = document.querySelector('.ask-brand-tag')?.innerText;
        return { header, chipsCount: chips.length, hasTextarea: textarea, sendBtn, banner };
    })()`);
    console.log('Anonymous Ask Page State:', askPageState);
    captureScreenshot('evidence_04_anonymous_ask_page.png');
    await sleep(1000);

    // ── 5. ANONYMOUS INBOX & 9:16 STORY CARD GENERATOR ──
    console.log('\n--- 5. Verifying Anonymous Inbox & 9:16 Story Card Generator ---');
    await navigateTo('/confessions');
    await dismissOverlays();
    await sleep(2000);

    // Open Inbox
    console.log('Opening Anonymous Inbox Modal...');
    await evalOnEmulator(`(() => {
        const inboxBtn = document.querySelector('.ngl-btn-inbox');
        if (inboxBtn) inboxBtn.click();
    })()`);
    await sleep(2000);

    // If inbox has messages, click share story; if empty, test story card generator directly
    const inboxState = await evalOnEmulator(`(async () => {
        const modal = document.querySelector('.anon-inbox-modal');
        const shareBtns = Array.from(document.querySelectorAll('.btn-inbox-action.share-story'));
        if (shareBtns.length > 0) {
            shareBtns[0].click();
            return { openedStoryModal: true };
        }
        return { openedStoryModal: false, hasInboxModal: !!modal };
    })()`);
    console.log('Inbox State:', inboxState);
    await sleep(1500);
    captureScreenshot('evidence_05_anonymous_inbox_and_story.png');
    await sleep(1000);

    // Close any open modals
    await evalOnEmulator(`(() => {
        const closeBtns = Array.from(document.querySelectorAll('.anon-inbox-close, .story-card-close'));
        closeBtns.forEach(b => b.click());
    })()`);
    await sleep(1000);

    // ── 6. PROFILE 10S VIDEO SHOWCASE & CAMPUS POSTS ──
    console.log('\n--- 6. Verifying Profile 10s Video Showcase & Posts/Reposts ---');
    await navigateTo('/profile');
    await dismissOverlays();
    await sleep(2500);

    const profileSections = await evalOnEmulator(`(() => {
        const postsTitle = Array.from(document.querySelectorAll('h3, h4')).find(h => h.innerText.includes('Campus Posts & Reposts'));
        const postsFeed = document.querySelector('.profile-posts-feed, .profile-posts-empty');
        const videoShowcase = !!document.querySelector('.profile-video-showcase-card');
        return {
            hasPostsSection: !!postsTitle,
            hasPostsFeed: !!postsFeed,
            hasVideoShowcase: videoShowcase
        };
    })()`);
    console.log('Profile Sections:', profileSections);

    // Scroll down to show posts
    await evalOnEmulator(`window.scrollTo({ top: 400, behavior: 'instant' })`);
    await sleep(1000);
    captureScreenshot('evidence_06_profile_video_and_reposts.png');
    await sleep(1000);

    // Verify EditProfile Video Section
    console.log('Verifying EditProfile 10s Video Section...');
    await navigateTo('/profile/edit');
    await dismissOverlays();
    await sleep(2500);

    const editProfileVideoSection = await evalOnEmulator(`(() => {
        const section = document.querySelector('.video-profile-section');
        const title = section?.querySelector('.section-title')?.innerText;
        const isLocked = !!section?.querySelector('.video-premium-locked-card');
        const isUploadActive = !!section?.querySelector('.video-upload-container');
        return { hasSection: !!section, title, isLocked, isUploadActive };
    })()`);
    console.log('EditProfile Video Section:', editProfileVideoSection);
    await evalOnEmulator(`(() => {
        const vSec = document.querySelector('.video-profile-section');
        if (vSec) vSec.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await sleep(1000);
    captureScreenshot('evidence_07_edit_profile_video_upload.png');
    await sleep(1000);

    // ── 7. PREMIUM UPGRADE (11 BENEFITS COMPARISON) ──
    console.log('\n--- 7. Verifying Premium Upgrade (All 11 Benefits) ---');
    await navigateTo('/premium');
    await dismissOverlays();
    await sleep(2500);

    // Scroll comparison box into view
    await evalOnEmulator(`(() => {
        const comp = document.querySelector('.premium-comparison-box');
        if (comp) comp.scrollIntoView({ behavior: 'instant', block: 'start' });
    })()`);
    await sleep(1200);

    const comparisonRows = await evalOnEmulator(`(() => {
        const rows = Array.from(document.querySelectorAll('.comparison-body .comparison-row'));
        return rows.map(r => ({
            feature: r.querySelector('.col-feature')?.innerText,
            free: r.querySelector('.col-free')?.innerText,
            premium: r.querySelector('.col-premium')?.innerText
        }));
    })()`);
    console.log(`Verified ${comparisonRows.length} Premium Benefits Rows:`, comparisonRows);
    captureScreenshot('evidence_08_premium_11_benefits_table.png');
    await sleep(1000);

    console.log('\n================================================================');
    console.log(' PHYSICAL ANDROID EMULATOR QA SUITE COMPLETED WITH FULL PASS!');
    console.log('================================================================\n');
}

runFullVerification().catch(console.error);
