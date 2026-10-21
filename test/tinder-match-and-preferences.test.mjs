import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Tinder Feature 1: DiscoveryPreferencesModal exposes full recommendation feedback and granular filters', () => {
    const code = fs.readFileSync(path.resolve('src/components/DiscoveryPreferencesModal.jsx'), 'utf-8');
    
    // 1. Recommendation feedback card
    assert.match(code, /How are your recommendations lately\?/);
    assert.match(code, /✓ Good/);
    assert.match(code, /✕ Not good/);
    assert.match(code, /tcd_discovery_rec_feedback/);

    // 2. Campus Location & Nigerian universities search
    assert.match(code, /Campus Location/);
    assert.match(code, /NIGERIAN_UNIVERSITIES/);

    // 3. Distance & Fallback
    assert.match(code, /Maximum Distance/);
    assert.match(code, /fallbackNearby/);
    assert.match(code, /Show people further away if I run out of profiles to see/);

    // 4. Gender Segmented Control
    assert.match(code, /Women/);
    assert.match(code, /Men/);
    assert.match(code, /Everyone/);

    // 5. Age Range & Tolerance
    assert.match(code, /Age Range/);
    assert.match(code, /fallbackAge/);
    assert.match(code, /Show people slightly out of my preferred range/);

    // 6. Premium Discovery (Gold)
    assert.match(code, /Premium Discovery/);
    assert.match(code, /Minimum Number of Photos/);
    assert.match(code, /Has a Bio/);
    assert.match(code, /Faculty \/ Discipline/);
    assert.match(code, /Looking For/);
    assert.match(code, /Zodiac Sign/);
});

test('Tinder Feature 2: PromptReplyModal allows icebreaker attached to likes and super swipes', () => {
    const code = fs.readFileSync(path.resolve('src/components/PromptReplyModal.jsx'), 'utf-8');

    // 1. Quoted prompt preview
    assert.match(code, /reply-prompt-preview/);
    assert.match(code, /targetPrompt/);

    // 2. Textarea with character count
    assert.match(code, /reply-textarea/);
    assert.match(code, /240/);

    // 3. Quick collegiate suggestion chips
    assert.match(code, /QUICK_SUGGESTIONS/);
    assert.match(code, /What's your favorite campus spot\?/);

    // 4. Dual action triggers (Like and Super)
    assert.match(code, /❤️ Like & Send/);
    assert.match(code, /⭐ Super/);
});

test('Tinder Feature 3: SwipeCard renders modular cards and persistent floating action dock', () => {
    const code = fs.readFileSync(path.resolve('src/components/SwipeCard.jsx'), 'utf-8');

    // 1. Modular profile scroll & collapse button
    assert.match(code, /modular-profile-scroll/);
    assert.match(code, /modular-btn-collapse/);

    // 2. Modular card sections
    assert.match(code, /Looking for/);
    assert.match(code, /About me/);
    assert.match(code, /Campus Essentials/);
    assert.match(code, /Campus Prompts/);
    assert.match(code, /Basics/);
    assert.match(code, /Interests/);
    assert.match(code, /formatInterestWithEmoji/);

    // 3. Inline Reply buttons
    assert.match(code, /modular-card-reply-btn/);
    assert.match(code, /onOpenPromptReply/);

    // 4. Action & Safety buttons
    assert.match(code, /btn-modular-share/);
    assert.match(code, /btn-modular-block/);
    assert.match(code, /btn-modular-report/);

    // 5. Persistent floating action dock
    assert.match(code, /persistent-floating-dock/);
    assert.match(code, /action-nope/);
    assert.match(code, /action-like/);
});

test('Tinder Feature 4: Match.jsx connects Discovery Preferences, Prompt Replies, and Safety', () => {
    const code = fs.readFileSync(path.resolve('src/pages/Match.jsx'), 'utf-8');

    // 1. Component imports
    assert.match(code, /import DiscoveryPreferencesModal from '\.\.\/components\/DiscoveryPreferencesModal'/);
    assert.match(code, /import PromptReplyModal from '\.\.\/components\/PromptReplyModal'/);
    assert.match(code, /import ReportModal from '\.\.\/components\/ReportModal'/);
    assert.match(code, /import \{ blockUser \} from '\.\.\/services\/blockService'/);

    // 2. Preference button in top rail
    assert.match(code, /discover-prefs-btn/);
    assert.match(code, /⚙️ Preferences/);

    // 3. Handlers
    assert.match(code, /handleShareProfile/);
    assert.match(code, /handleBlockProfile/);
    assert.match(code, /handleSendPromptReply/);

    // 4. Modals wired in JSX
    assert.match(code, /<DiscoveryPreferencesModal/);
    assert.match(code, /<PromptReplyModal/);
    assert.match(code, /<ReportModal/);
});

test('Tinder Feature 5: In-Chat and Requests Quote Bubbles parse prompt reply icebreakers', () => {
    const chatCode = fs.readFileSync(path.resolve('src/pages/Chat.jsx'), 'utf-8');
    const requestsCode = fs.readFileSync(path.resolve('src/pages/Requests.jsx'), 'utf-8');

    // 1. Chat.jsx parses Replied to prompts into quotes
    assert.match(chatCode, /message-prompt-reply-wrap/);
    assert.match(chatCode, /chat-prompt-reply-quote/);
    assert.match(chatCode, /chat-prompt-reply-tag/);
    assert.match(chatCode, /✈ Replied to/);

    // 2. Requests.jsx renders incoming prompt teasers with stylized chips
    assert.match(requestsCode, /request-prompt-reply/);
    assert.match(requestsCode, /request-prompt-category/);
    assert.match(requestsCode, /request-prompt-body/);
});
