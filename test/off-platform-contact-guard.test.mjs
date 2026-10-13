import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    detectOffPlatformContact,
    detectOffPlatformContactWithHistory,
    isOffPlatformBlockError,
    recordOffPlatformAttempt,
    canBypassOffPlatformSafeguard,
    OFF_PLATFORM_BLOCK_CODE
} from '../src/utils/offPlatformGuard.js';

const ROOT_DIR = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT_DIR, p), 'utf-8');

const SHOULD_BLOCK = {
    phone: [
        '08031234567',
        'my number is 0803 123 4567',
        '+234 803 123 4567',
        '0803-123-4567',
        '0.8.0.3.1.2.3.4.5.6.7',
        'o8o3l234567',
        'zero eight zero three one two three four five six seven',
        'zero eight double one two three four five six seven',
        '０８０３１２３４５６７',
        '0️⃣8️⃣0️⃣3️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣',
        'odo eejo odo eeta ookan eeji eeta eerin aarun eefa eeje',
        '0803',
        'can I get your number?',
        'drop your digits',
        "what's your phone number",
        'send me your whatsapp number',
        'flash me',
        'beep me when you reach',
        'call me on my line',
        '📞 08031234567',
        'drop your opay number',
        'send your palmpay'
    ],
    social: [
        'add me on snap',
        'my ig is amaka_23',
        'follow me on instagram',
        'IG: kingtee',
        'snap: kingtee01',
        'are you on tiktok?',
        'you dey ig?',
        'do you have telegram',
        'whatsapp me',
        'what is your snapchat',
        '@amaka_23',
        'w h a t s a p p',
        'wh4tsapp me',
        'i.n.s.t.a.g.r.a.m',
        'ppastahw',
        'my tiktok handle is kingtee',
        'hmu on x',
        '👻 kingtee_01',
        'my snap',
        'whatsapp?',
        'search me on ig',
        'find me on tiktok',
        'check my bio for my number',
        'my number is in my bio'
    ],
    email: [
        'amaka@gmail.com',
        'amaka (at) gmail (dot) com',
        'amaka at gmail dot com',
        'send me your email'
    ],
    link: [
        'wa.me/2348031234567',
        'https://chat.whatsapp.com/abc',
        't.me/kingtee',
        'instagram.com/amaka',
        'linktr.ee/amaka',
        'bit.ly/3xyz',
        'wa dot me slash 234'
    ],
    off_app: [
        "let's move this chat off this app",
        'this app is slow, let us use another app',
        "let's talk somewhere else",
        "I rarely open this app, message me on whatsapp",
        "this app dey lag, let's talk elsewhere"
    ]
};

const SHOULD_ALLOW = [
    'hey how are you doing today?',
    'I scored 70 in CSC 201',
    'meet me at the library by 4:30pm',
    'see you @ the cafeteria',
    'it costs ₦5,000',
    '8000',
    'my phone died last night',
    'you are my number one fan',
    'I have a number of questions about the course',
    'I saw a funny video on tiktok yesterday',
    'my network signal is bad',
    "I'm from Imo state",
    "let's meet somewhere else, the cafe is crowded",
    'we chat every day haha',
    'oh snap that is crazy',
    'send me a snap of your outfit',
    'I am in 300 level, room 204',
    'class is from 10:00 to 12:00 on 12/10/2026',
    'lol 😂😂',
    'what is up?',
    'the outlook for exams looks good',
    'my brother is not a yahoo boy',
    'I watch tele with my roommate',
    'you no dey hear word',
    'my matric number is not out yet'
];

for (const [category, messages] of Object.entries(SHOULD_BLOCK)) {
    test(`Off-platform guard blocks ${category} attempts for standard users`, () => {
        for (const msg of messages) {
            const res = detectOffPlatformContact(msg);
            assert.equal(res.blocked, true, `Expected BLOCK for: "${msg}"`);
            assert.ok(res.title && res.body, `Expected copy for: "${msg}"`);
        }
    });
}

test('Off-platform guard allows normal campus conversation', () => {
    for (const msg of SHOULD_ALLOW) {
        const res = detectOffPlatformContact(msg);
        assert.equal(res.blocked, false, `Expected ALLOW for: "${msg}" (got ${res.category}: ${res.matched})`);
    }
});

test('Off-platform guard catches numbers split across several bubbles', () => {
    const res = detectOffPlatformContactWithHistory('4567', ['803', '123']);
    assert.equal(res.blocked, true);
    assert.equal(res.category, 'phone');
    assert.equal(res.split, true);

    const word = detectOffPlatformContactWithHistory('app', ['add me on whats']);
    assert.equal(word.blocked, true);

    const fine = detectOffPlatformContactWithHistory('haha same', ['I scored 70', 'and 80']);
    assert.equal(fine.blocked, false);
});

test('Elite Ultra VIP (₦15k) members bypass all contact-sharing safeguards', () => {
    const ultraUser = {
        id: 'usr_ultra_001',
        is_premium: true,
        is_ultra: true,
        plan_type: 'ultra',
        status: 'active'
    };

    const regularUser = {
        id: 'usr_reg_002',
        is_premium: false,
        is_ultra: false
    };

    const premiumOnlyUser = {
        id: 'usr_prem_003',
        is_premium: true,
        plan_type: 'premium',
        is_ultra: false,
        status: 'active'
    };

    assert.equal(canBypassOffPlatformSafeguard(ultraUser), true, 'Ultra user must bypass');
    assert.equal(canBypassOffPlatformSafeguard(regularUser), false, 'Regular user must not bypass');
    assert.equal(canBypassOffPlatformSafeguard(premiumOnlyUser), false, 'Standard premium user must not bypass');

    // Elite Ultra user sending phone number
    const ultraResPhone = detectOffPlatformContact('my number is 08031234567', ultraUser);
    assert.equal(ultraResPhone.blocked, false, 'Ultra user phone must not be blocked');
    assert.equal(ultraResPhone.exempt, true);

    // Elite Ultra user asking for Instagram
    const ultraResSocial = detectOffPlatformContact('drop your IG username', ultraUser);
    assert.equal(ultraResSocial.blocked, false, 'Ultra user social request must not be blocked');

    // Elite Ultra user in history check
    const ultraResHistory = detectOffPlatformContactWithHistory('4567', ['803', '123'], ultraUser);
    assert.equal(ultraResHistory.blocked, false);
    assert.equal(ultraResHistory.exempt, true);

    // Standard user is blocked on the same message
    const stdRes = detectOffPlatformContact('my number is 08031234567', regularUser);
    assert.equal(stdRes.blocked, true);
});

test('Off-platform guard recognises server block errors & escalates attempts', () => {
    assert.equal(isOffPlatformBlockError({ message: `${OFF_PLATFORM_BLOCK_CODE}: phone` }), true);
    assert.equal(isOffPlatformBlockError(OFF_PLATFORM_BLOCK_CODE), true);
    assert.equal(isOffPlatformBlockError({ message: 'network error' }), false);

    const store = new Map();
    const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
    assert.equal(recordOffPlatformAttempt('u1', storage), 1);
    assert.equal(recordOffPlatformAttempt('u1', storage), 2);
    assert.equal(recordOffPlatformAttempt('u2', storage), 1);
});

test('Chat wiring: send, edit & offline queue paths run the guard and show the modal', () => {
    const chat = read('src/pages/Chat.jsx');
    assert.match(chat, /detectOffPlatformContactWithHistory/);
    assert.match(chat, /<OffPlatformBlockedModal/);
    assert.match(chat, /isOffPlatformBlockError/);
    assert.match(chat, /isEliteUltra/);
    assert.match(chat, /isUltraSender/);

    const service = read('src/services/chatService.js');
    assert.match(service, /detectOffPlatformContact\(/);
    assert.match(service, /OFF_PLATFORM_BLOCK_CODE/);
    assert.match(service, /isUltraSender/);

    const modal = read('src/components/OffPlatformBlockedModal.jsx');
    assert.match(modal, /createPortal/);
    assert.match(modal, /ELITE ULTRA VIP/);
    assert.match(modal, /15,000/);
});

test('Server-side trigger enforces the block on messages insert & edit', () => {
    const files = fs.readdirSync(path.join(ROOT_DIR, 'supabase/migrations'));
    const file = files.find((f) => f.includes('block_off_platform_contact_sharing'));
    assert.ok(file, 'migration exists');
    const sql = read(`supabase/migrations/${file}`);
    assert.match(sql, /OFF_PLATFORM_CONTACT_BLOCKED/);
    assert.match(sql, /before insert or update of content on public\.messages/i);
    assert.match(sql, /is_ultra/i);
});

test('sanitizeBioForDisplay protects public profile views from rogue contacts', async () => {
    const { sanitizeBioForDisplay } = await import('../src/utils/offPlatformGuard.js');

    const cleanBio = 'Law student at UNILAG. Passionate about debate and afrobeat.';
    assert.equal(sanitizeBioForDisplay(cleanBio, false), cleanBio);

    const bioWithPhone = 'HMU: 08031234567, text me anytime!';
    const sanitizedPhone = sanitizeBioForDisplay(bioWithPhone, false);
    assert.ok(!sanitizedPhone.includes('08031234567'), 'Phone must not appear in non-Ultra bio');
    assert.ok(sanitizedPhone.includes('[🔒 contact locked]'));

    const bioWithSocial = 'Follow me on IG @queen_amaka for more photos';
    const sanitizedSocial = sanitizeBioForDisplay(bioWithSocial, false);
    assert.ok(!sanitizedSocial.includes('@queen_amaka'), 'Social handle must not appear in non-Ultra bio');
    assert.ok(sanitizedSocial.includes('[🔒 handle locked]'));

    // Ultra users retain full contact display
    const ultraBio = 'Call or WhatsApp: 08031234567 or IG: @ultra_king';
    assert.equal(sanitizeBioForDisplay(ultraBio, true), ultraBio, 'Ultra user bio must not be masked');
    assert.equal(sanitizeBioForDisplay(ultraBio, { is_ultra: true }), ultraBio);
});

test('EditProfile, Confessions & PremiumUpgrade wiring safeguards all campus surfaces', () => {
    const editProfile = read('src/pages/EditProfile.jsx');
    assert.match(editProfile, /detectOffPlatformContact\(formData\.bio\)/);
    assert.match(editProfile, /Elite Ultra VIP \(₦15,000\/mo\)/);

    const confessions = read('src/pages/Confessions.jsx');
    assert.match(confessions, /detectOffPlatformContact\(newConfession\)/);

    const premium = read('src/pages/PremiumUpgrade.jsx');
    assert.match(premium, /Unrestricted Contact Sharing/);

    const chat = read('src/pages/Chat.jsx');
    assert.match(chat, /chat-composer-safeguard-hint/);
    assert.match(chat, /chat-safety-reminder-bar/);
});
