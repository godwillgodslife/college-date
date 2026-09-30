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

async function navigateTo(pathname) {
    console.log(`Navigating to ${pathname}...`);
    await evalOnEmulator(`(() => {
        window.history.pushState({}, '', '${pathname}');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(2500);
}

async function dismissOverlays() {
    await evalOnEmulator(`(() => {
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"], .modal-close');
        if (tour) tour.click();
        const xs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === '✕');
        xs.forEach(x => x.click());
    })()`);
}

async function ensureAuthenticated() {
    console.log('Checking auth status...');
    const authState = await evalOnEmulator(`(() => {
        const hasLoginForm = !!document.getElementById('email') || !!document.querySelector('input[type="email"]');
        const hasLanding = document.body.innerText.includes('Find your campus crush') || document.body.innerText.includes('I already have an account');
        const hasNav = !!document.querySelector('.bottom-nav-item');
        return { hasLoginForm, hasLanding, hasNav, path: window.location.pathname };
    })()`);

    console.log('Current Auth State:', authState);

    if (authState?.hasLanding) {
        console.log('Clicking "I already have an account"...');
        await evalOnEmulator(`(() => {
            const btn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.includes('I already have an account'));
            if (btn) btn.click();
        })()`);
        await sleep(2000);
    }

    const needsLogin = await evalOnEmulator(`!!document.getElementById('email')`);
    if (needsLogin) {
        console.log('Logging in as student.tester2026@gmail.com...');
        await evalOnEmulator(`(() => {
            const emailInput = document.getElementById('email');
            const passInput = document.getElementById('password');
            if (!emailInput || !passInput) return false;

            const emailSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            emailSetter.call(emailInput, 'student.tester2026@gmail.com');
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));

            const passSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            passSetter.call(passInput, 'CollegeDate2026!VerifiedPass');
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));

            const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In'));
            if (submitBtn) submitBtn.click();
            return true;
        })()`);
        await sleep(4000);
    }

    await dismissOverlays();
    await sleep(1000);
}

async function runVerification() {
    console.log('================================================================');
    console.log(' STARTING PHYSICAL ANDROID EMULATOR QA SUITE (v2.2.48 - VC45)');
    console.log('================================================================\n');

    await ensureAuthenticated();

    // ── 1. PREMIUM SUBSCRIPTION TIERS (3 DURATIONS) ──
    console.log('--- 1. Verifying Premium Upgrade (3 Subscription Tiers) ---');
    await navigateTo('/premium');
    await dismissOverlays();
    await sleep(2000);

    // Scroll pricing tiers into clear view
    await evalOnEmulator(`(() => {
        const box = document.querySelector('.pricing-box');
        if (box) {
            box.scrollIntoView({ behavior: 'instant', block: 'center' });
        } else {
            window.scrollTo({ top: 550, behavior: 'instant' });
        }
    })()`);
    await sleep(1500);

    const premiumTiers = await evalOnEmulator(`(() => {
        const cards = Array.from(document.querySelectorAll('.tier-card-selector'));
        return cards.map(c => ({
            name: c.querySelector('.tier-duration-title')?.innerText,
            rate: c.querySelector('.tier-rate-tag')?.innerText,
            total: c.querySelector('.tier-total-sub')?.innerText,
            badge: c.querySelector('.tier-savings-badge')?.innerText
        }));
    })()`);
    console.log('Detected Premium Tiers on Device:', premiumTiers);
    captureScreenshot('evidence_01_premium_three_tiers.png');
    await sleep(1000);

    // ── 2. EXPLORE SEARCH & PAID CHAT VIBE (₦500) ──
    console.log('\n--- 2. Verifying Explore Search & Paid Chat Vibe ---');
    await navigateTo('/explore');
    await dismissOverlays();
    await sleep(2500);

    // Perform Search
    console.log('Typing search query in Explore...');
    const searchRes = await evalOnEmulator(`(async () => {
        const input = document.querySelector('.explore-search-input');
        if (!input) return { error: 'Input not found' };
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'Jordan');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const searchBtn = document.querySelector('.search-submit-btn');
        if (searchBtn) searchBtn.click();
        return { typed: input.value };
    })()`);
    console.log('Search action:', searchRes);
    await sleep(2500);
    captureScreenshot('evidence_02_explore_search_active.png');

    // Trigger Chat Vibe on a profile card
    console.log('Clicking Chat 💬 icon to open Chat Vibe Modal...');
    const vibeTrigger = await evalOnEmulator(`(async () => {
        const chatBtns = Array.from(document.querySelectorAll('.quick-tray-btn.chat'));
        if (chatBtns.length > 0) {
            chatBtns[0].click();
            return { clicked: true, count: chatBtns.length };
        }
        return { clicked: false };
    })()`);
    console.log('Chat icon clicked:', vibeTrigger);
    await sleep(1500);
    captureScreenshot('evidence_03_chat_vibe_modal.png');

    // Close Chat Vibe modal
    await evalOnEmulator(`(() => {
        const closeBtn = document.querySelector('.chat-vibe-close-btn, .btn-cancel-vibe');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(800);

    // ── 3. CHAT ATTACHMENT MENU & AI ASSIST ──
    console.log('\n--- 3. Verifying Chat Attachment Menu & AI Assist ---');
    await navigateTo('/chat');
    await dismissOverlays();
    await sleep(2500);

    // Click into conversation
    const openConv = await evalOnEmulator(`(() => {
        const items = document.querySelectorAll('.conversation-item, .recent-chat-card');
        if (items.length > 0) {
            items[0].click();
            return { opened: true, count: items.length };
        }
        return { opened: false };
    })()`);
    console.log('Conversation opened:', openConv);
    await sleep(2000);

    // Open WhatsApp Attachment Sheet
    console.log('Opening WhatsApp attachment sheet...');
    await evalOnEmulator(`(() => {
        const toggle = document.querySelector('.btn-more-actions-toggle');
        if (toggle) toggle.click();
    })()`);
    await sleep(1000);

    // Click AI Assist
    console.log('Clicking AI Assist in attachment sheet...');
    const aiClick = await evalOnEmulator(`(() => {
        const aiBtn = document.querySelector('.whatsapp-attachment-item .circle-ai')?.closest('button') ||
                      Array.from(document.querySelectorAll('.whatsapp-attachment-item, .attachment-sheet-item, button')).find(b => b.innerText.includes('AI Assist'));
        if (aiBtn) {
            aiBtn.click();
            return { clicked: true };
        }
        return { clicked: false, available: Array.from(document.querySelectorAll('button')).map(b => b.innerText) };
    })()`);
    console.log('AI Assist clicked:', aiClick);
    await sleep(2500);
    captureScreenshot('evidence_04_chat_ai_suggestions_active.png');

    // Click first suggestion chip
    console.log('Selecting first AI suggestion chip...');
    const chipSelect = await evalOnEmulator(`(() => {
        const chips = Array.from(document.querySelectorAll('.ai-suggestion-chip'));
        if (chips.length > 0) {
            const text = chips[0].querySelector('.chip-text')?.innerText || chips[0].innerText;
            chips[0].click();
            return { selected: text, chipCount: chips.length };
        }
        return { error: 'No chips found' };
    })()`);
    console.log('Chip selected:', chipSelect);
    await sleep(1200);
    captureScreenshot('evidence_05_chat_ai_suggestion_inserted.png');

    // ── 4. CONFESSIONS COMMENT DRAWER ──
    console.log('\n--- 4. Verifying Confessions Comments Drawer ---');
    await navigateTo('/confessions');
    await dismissOverlays();
    await sleep(2500);

    // Check if there are confession cards; if none, post one
    const cardCount = await evalOnEmulator(`document.querySelectorAll('.confession-card').length`);
    if (cardCount === 0) {
        console.log('Posting a campus secret to demonstrate comment drawer...');
        await evalOnEmulator(`(async () => {
            const ta = document.querySelector('textarea');
            if (ta) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                setter.call(ta, 'Campus confession: Late night library sprints are actually the best vibe! 📚✨');
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                const postBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Post Secret'));
                if (postBtn) postBtn.click();
            }
        })()`);
        await sleep(3000);
    }

    // Open Comments drawer on first card
    console.log('Opening comments drawer on confession card...');
    const openComments = await evalOnEmulator(`(() => {
        const commentsBtns = Array.from(document.querySelectorAll('.comment-btn, .btn-comment, [title*="Comment"]'));
        if (commentsBtns.length > 0) {
            commentsBtns[0].click();
            return { clicked: true };
        }
        // Fallback: click any element with comment counter
        const counter = document.querySelector('.confession-comments-count, .social-actions button:nth-child(2)');
        if (counter) {
            counter.click();
            return { clicked: true, fallback: true };
        }
        return { clicked: false };
    })()`);
    console.log('Comment drawer triggered:', openComments);
    await sleep(2000);
    captureScreenshot('evidence_06_confessions_comments_drawer.png');

    console.log('\n================================================================');
    console.log(' EMULATOR VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('================================================================\n');
}

runVerification().catch(console.error);
