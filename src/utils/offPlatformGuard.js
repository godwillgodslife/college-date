/**
 * Off-Platform Contact Guard
 * ----------------------------------------------------------------------------
 * Keeps conversations inside TheCollegeDate by detecting messages that try to
 * exchange phone numbers, social media handles, emails, external messaging
 * links, or that explicitly ask to "move" the chat to another app.
 *
 * Pure & dependency-free so it can run in the browser, in Capacitor Android
 * and in Node tests. The database trigger
 * (supabase/migrations/20261013030000_block_off_platform_contact_sharing.sql)
 * enforces a simpler server-side backstop so a modified client can't bypass it.
 *
 * Evasion tricks handled:
 *  - Separators between digits:        0803 123 4567, 0803-123-4567, 0.8.0.3...
 *  - Spelled-out digits (EN/Yoruba/Igbo/Hausa): "zero eight one...", "odo eejo..."
 *  - "double"/"triple" digit shorthand: "zero eight double one..."
 *  - Letter lookalikes inside numbers:  o8o3l234567  (o->0, l/I/|->1)
 *  - Unicode digits: fullwidth, circled ①, keycap 0️⃣, Arabic-Indic, superscript
 *  - Splitting a number across several messages ("0803" ... "123" ... "4567")
 *  - Leetspeak & homoglyphs:            wh4ts4pp, 1nstagram, Cyrillic "аpp"
 *  - Spaced / dotted / reversed names:  w h a t s a p p, i.g, ppastahw
 *  - Emoji stand-ins:                    👻 (Snapchat), 📞/📱/☎️ (phone)
 *  - Obfuscated emails & links:          amaka (at) gmail (dot) com, wa dot me
 *  - Nigerian slang:                     "flash me", "beep me", "you dey IG?"
 */

import { isEliteUltra } from './premium.js';

export const OFF_PLATFORM_BLOCK_CODE = 'OFF_PLATFORM_CONTACT_BLOCKED';

/**
 * Checks if a user has active Elite Ultra VIP subscription (₦15,000/mo)
 * which gives complete exemption to ask any question and exchange contacts
 * without safeguards.
 */
export function canBypassOffPlatformSafeguard(sender) {
    return Boolean(isEliteUltra(sender));
}

export const OFF_PLATFORM_CATEGORIES = {
    PHONE: 'phone',
    SOCIAL: 'social',
    EMAIL: 'email',
    LINK: 'link',
    OFF_APP: 'off_app'
};

export const OFF_PLATFORM_COPY = {
    phone: {
        title: 'Phone numbers can’t be shared',
        body: 'For everyone’s safety, sharing or asking for phone numbers (including WhatsApp numbers) isn’t allowed in chats.'
    },
    social: {
        title: 'Social handles aren’t allowed',
        body: 'Sharing or asking for Instagram, Snapchat, TikTok, Telegram, X, Facebook or any other username isn’t allowed in chats.'
    },
    email: {
        title: 'Email addresses can’t be shared',
        body: 'Sharing or asking for email addresses isn’t allowed in chats.'
    },
    link: {
        title: 'External contact links are blocked',
        body: 'Links to WhatsApp, Telegram, Instagram, Snapchat, TikTok, link-in-bio pages and link shorteners can’t be sent in chats.'
    },
    off_app: {
        title: 'Let’s keep it on TheCollegeDate',
        body: 'Asking to move the conversation to another app isn’t allowed. Voice notes, calls, photos and live location are all available right here.'
    }
};

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

const KEYCAP_REGEX = /[\uFE0F\u20E3]/g;

/** Map non-ASCII decimal digits (Arabic-Indic, Persian, Devanagari, Bengali) to ASCII. */
function asciiDigits(text) {
    return text.replace(/[\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF]/g, (ch) => {
        const cp = ch.codePointAt(0);
        if (cp >= 0x0660 && cp <= 0x0669) return String(cp - 0x0660);
        if (cp >= 0x06F0 && cp <= 0x06F9) return String(cp - 0x06F0);
        if (cp >= 0x0966 && cp <= 0x096F) return String(cp - 0x0966);
        return String(cp - 0x09E6);
    });
}

/** NFKC turns fullwidth, circled (①), superscript and math-styled digits/letters into ASCII. */
function baseNormalize(input) {
    let text = String(input || '');
    try {
        text = text.normalize('NFKC');
    } catch (_) {
        // very old engines: ignore
    }
    text = text.replace(KEYCAP_REGEX, '');
    text = asciiDigits(text);
    // Zero-width characters are a classic filter-evasion trick.
    text = text.replace(/[\u200B-\u200D\u2060\u00AD]/g, '');
    return text;
}

const NUMBER_WORDS = {
    // English
    zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
    // Yoruba
    odo: '0', ookan: '1', okan: '1', eeji: '2', meji: '2', eeta: '3', meta: '3', eerin: '4', merin: '4',
    aarun: '5', marun: '5', eefa: '6', mefa: '6', eeje: '7', meje: '7', eejo: '8', mejo: '8', eesan: '9', mesan: '9',
    // Igbo
    efu: '0', otu: '1', abuo: '2', ato: '3', ano: '4', ise: '5', isii: '6', asaa: '7', asato: '8', itoolu: '9', toolu: '9',
    // Hausa
    sifiri: '0', daya: '1', biyu: '2', uku: '3', hudu: '4', biyar: '5', shida: '6', bakwai: '7', takwas: '8', tara: '9'
};

const NUMBER_WORD_REGEX = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join('|')})\\b`, 'gi');

/** Text prepared for phone-number scanning (number words -> digits, double/triple expanded). */
function digitForm(text) {
    let out = text.replace(NUMBER_WORD_REGEX, (w) => NUMBER_WORDS[w.toLowerCase()]);
    out = out.replace(/\b(double|triple)[\s\-]*(\d)/gi, (_, kind, d) => (kind.toLowerCase() === 'double' ? d + d : d + d + d));
    return out;
}

const DIGIT_SEPARATORS = new Set([' ', '\t', '\n', '\r', '.', '-', '–', '—', '_', '(', ')', ',', '*', '+', '#', '~', '\'', '"', '`', '[', ']', '{', '}', '=', '•', '·']);
const DIGIT_LOOKALIKES = { o: '0', O: '0', l: '1', I: '1', '|': '1' };

/**
 * Splits text into "digit runs": stretches of digits joined only by separators
 * or digit lookalike letters. Returns the digit strings.
 */
export function extractDigitRuns(text) {
    const runs = [];
    let current = [];

    const flush = () => {
        // Trim leading/trailing lookalikes & separators so "hello 0803" doesn't absorb "llo".
        while (current.length && current[0].kind !== 'digit') current.shift();
        while (current.length && current[current.length - 1].kind !== 'digit') current.pop();
        const realDigits = current.filter((c) => c.kind === 'digit').length;
        if (realDigits > 0) {
            const digits = current
                .filter((c) => c.kind !== 'sep')
                .map((c) => (c.kind === 'look' ? DIGIT_LOOKALIKES[c.ch] : c.ch))
                .join('');
            // Lookalikes only count when the run is clearly numeric.
            runs.push(realDigits >= 5 ? digits : current.filter((c) => c.kind === 'digit').map((c) => c.ch).join(''));
        }
        current = [];
    };

    for (const ch of text) {
        if (ch >= '0' && ch <= '9') {
            current.push({ ch, kind: 'digit' });
        } else if (DIGIT_LOOKALIKES[ch] !== undefined) {
            current.push({ ch, kind: 'look' });
        } else if (DIGIT_SEPARATORS.has(ch)) {
            if (current.length) current.push({ ch, kind: 'sep' });
        } else {
            flush();
        }
    }
    flush();
    return runs;
}

const NG_MOBILE_PARTIAL = /^(?:234|0)[789][01]/;

function isPhoneLikeDigits(digits) {
    if (!digits) return false;
    if (digits.length >= 10) return true; // NG mobile (11), intl numbers, 10-digit bank NUBANs
    return false;
}

const HOMOGLYPHS = {
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd',
    'ɡ': 'g', 'к': 'k', 'м': 'm', 'н': 'h', 'т': 't', 'в': 'b', 'ο': 'o', 'α': 'a', 'ι': 'i', 'κ': 'k', 'ν': 'v',
    'τ': 't', 'ρ': 'p', 'ε': 'e', 'ѡ': 'w', 'ա': 'w'
};
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '$': 's', '@': 'a', '!': 'i', '€': 'e' };

/** Lowercase, accent-free, homoglyph-free text (digits kept). */
function plainLower(text) {
    let out = text.toLowerCase();
    try {
        out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (_) { /* ignore */ }
    return out.replace(/[^\x00-\x7F]/g, (ch) => HOMOGLYPHS[ch] ?? ch);
}

/** Emoji stand-ins for platforms / phone. */
function replaceEmojiStandIns(text) {
    return text
        .replace(/👻/g, ' snapchat ')
        .replace(/[📞📱☎📲]/gu, ' phone ');
}

/** Leet-decoded, letters-only token list. Consecutive single letters are merged ("i g" -> "ig"). */
function tokenize(lowerText) {
    const leet = lowerText.replace(/[013457$@!€]/g, (ch) => LEET[ch] ?? ch);
    const raw = leet.replace(/[^a-z]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    const merged = [];
    let singles = '';
    for (const tok of raw) {
        if (tok.length === 1) {
            singles += tok;
            continue;
        }
        if (singles) {
            merged.push(singles);
            singles = '';
        }
        merged.push(tok);
    }
    if (singles) merged.push(singles);
    return merged;
}

/** Letters only, repeated letters collapsed ("whaaatsssapp" -> "whatsap"). */
function squash(lowerText) {
    const leet = lowerText.replace(/[013457$@!€]/g, (ch) => LEET[ch] ?? ch);
    return leet.replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
}

const collapse = (w) => w.replace(/(.)\1+/g, '$1');

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** Unambiguous platform names — searched inside squashed text (catches spacing, dots, repeats, reversal). */
const SQUASH_PLATFORMS = [
    'whatsapp', 'watsapp', 'whatsap', 'instagram', 'snapchat', 'telegram', 'tiktok', 'facebook',
    'twitter', 'linkedin', 'linktree', 'truecaller', 'messenger'
].map(collapse);

/** Unambiguous platform tokens — any intent word nearby is enough. */
const STRONG_PLATFORM_TOKENS = new Set([
    'whatsapp', 'whatsap', 'watsapp', 'watsap', 'whatapp', 'whatsapps', 'wapp',
    'instagram', 'insta', 'instagran', 'ig', 'instag',
    'snapchat', 'snapchats', 'snp',
    'tiktok', 'tiktk', 'tictoc', 'tictok',
    'telegram', 'telegran',
    'facebook', 'fb', 'messenger',
    'twitter', 'tweeter',
    'discord', 'viber', 'wechat', 'skype', 'botim', 'kik', 'bereal', 'linkedin', 'onlyfans',
    'linktree', 'linktr', 'truecaller', 'hangouts', 'zangi',
    'gmail', 'hotmail', 'icloud', 'email', 'emails'
]);

/**
 * Ambiguous platform tokens — need a strong "contact" intent next to them.
 * ("imo" is also a Nigerian state, "tele" is TV slang, "wa" is Yoruba for "come".)
 */
const WEAK_PLATFORM_TOKENS = new Set(['snap', 'sc', 'gram', 'tt', 'tg', 'x', 'threads', 'mail', 'line', 'wa', 'imo', 'tele', 'inst']);

/** Words that, near a platform name, reveal an attempt to connect elsewhere. */
const INTENT_TOKENS = new Set([
    'add', 'follow', 'followme', 'dm', 'inbox', 'message', 'msg', 'text', 'chat', 'call', 'reach', 'find', 'search',
    'hmu', 'holla', 'link', 'connect', 'send', 'drop', 'give', 'share', 'gimme', 'my', 'your', 'ur', 'yr', 'yur',
    'handle', 'username', 'usernames', 'user', 'id', 'account', 'acct', 'acc', 'page', 'profile', 'number', 'num',
    'numba', 'nomba', 'contact', 'details', 'abeg', 'join', 'sub', 'subscribe', 'socials', 'addy', 'name', 'is', 'na'
]);

/** Stronger subset used for ambiguous platform words like "snap" or "x". */
const STRONG_INTENT_TOKENS = new Set([
    'add', 'follow', 'my', 'your', 'ur', 'yr', 'yur', 'handle', 'username', 'user', 'id', 'account', 'acct', 'acc',
    'number', 'num', 'contact', 'hmu', 'dm', 'socials', 'addy'
]);

const POSSESSIVE_TOKENS = new Set(['my', 'your', 'ur', 'yr', 'yur', 'ya']);
const POSSESSIVE = '(?:my|your|ur|yr|yur|ya|his|her)';
const NUMBER_WORD = 'numbers?(?!\\s+(?:one|two|three|four|five|of|plate|plates)\\b)';
const CONTACT_NOUNS = `(?:whatsapp|whatsap|watsapp|wa|digits|${NUMBER_WORD}|numba|nomba|num|contact|contacts|handle|handles|username|usernames|ig|insta|instagram|snap|snapchat|sc|tiktok|tt|telegram|tg|twitter|fb|facebook|socials|social media|email|e mail|mail|gmail|addy|line|details)`;

const SHORT_PLATFORM_ALT = '(?:whatsapp|whatsap|watsapp|wa|ig|insta|instagram|gram|snap|snapchat|sc|tiktok|tt|telegram|tg|twitter|x|fb|facebook|imo|discord|threads|messenger)';

const OFF_APP_PATTERNS = [
    // "your number", "ur digits", "my snap", "my whatsapp"
    new RegExp(`\\b${POSSESSIVE}\\s+${CONTACT_NOUNS}\\b`),
    // "phone number", "whatsapp number", "contact details", "phone no"
    /\b(?:phone|mobile|cell|whatsapp|whatsap|watsapp|wa|telegram|tg|contact|personal)\s+(?:number|numbers|num|no|digits|line|details|info)\b/,
    // "drop your digits", "send me your contact", "can I get your number"
    new RegExp(`\\b(?:drop|send|give|share|gimme|text|tell|whats|what s|wats|get|have|collect|exchange|swap|trade)\\b(?:\\s+\\w+){0,3}\\s+(?:${NUMBER_WORD}|digits|contacts?|handles?|usernames?|socials|email|addy)\\b`),
    // Move-the-chat phrases
    /\b(?:off|outside|out of|leave|leaving)\s+(?:of\s+)?(?:this|the|dis|dat|that)?\s*(?:app|platform|site|application)\b/,
    /\b(?:another|other|different|better|real)\s+(?:app|apps|platform|platforms)\b/,
    /\b(?:move|continue|talk|chat|link|connect|switch)\b(?:\s+\w+){0,3}\s+(?:elsewhere|somewhere else|privately outside)\b/,
    // Nigerian missed-call slang
    /\b(?:flash|beep|buzz)\s+(?:me|mi|my\s+line)\b/,
    // "call/text/ring me on <digits>" is caught by digit scan; "call me on my line"
    /\b(?:call|text|ring|sms|whatsapp)\s+(?:me|mi)\s+(?:on|via|through)\s+(?:my\s+)?(?:line|number|digits|cell|mobile)\b/,
    // "📞/📱 me"
    /\bphone\s+(?:me|mi)\b/,
    // Nigerian mobile fintech account proxy (OPay/PalmPay/Moniepoint accounts match phone numbers)
    /\b(?:opay|palmpay|palm pay|moniepoint|monie point)\s+(?:number|numbers|num|no|details|acct|account)\b/,
    /\b(?:drop|send|give|share|whats|what s)\b(?:\s+\w+){0,3}\s+(?:opay|palmpay|palm pay)\b/,
    // "search me on IG / find me on TikTok / look me up on Snap"
    new RegExp(`\\b(?:search|find|look|check)\\s+(?:for\\s+)?(?:me|my name|my handle|my page)\\s+(?:on|in)\\s+${SHORT_PLATFORM_ALT}\\b`),
    new RegExp(`\\b(?:type|search)\\s+(?:my name)\\s+(?:on|in)\\s+${SHORT_PLATFORM_ALT}\\b`),
    // App dissatisfaction / excuse ploy to force chatting elsewhere
    /\b(?:rarely|hardly|barely|not|dont|don t)\s+(?:active|online|use|open|check)\s+(?:here|this app|on here)\b/,
    /\b(?:delete|deleting|leaving|uninstalling)\s+this\s+app\b/,
    /\b(?:this app|the app)\s+(?:dey\s+lag|is slow|keeps freezing)\b/,
    // Contact-in-bio referrals
    /\b(?:my\s+)?(?:bio|status)\s+(?:has|for|got)\s+(?:my\s+)?(?:number|digits|contact|whatsapp|ig|snap|link)\b/,
    /\b(?:check|see|look at)\s+(?:my\s+)?(?:bio|profile)\b(?:\s+\w+){0,3}\s+(?:number|digits|whatsapp|ig|snap|handle|link)\b/
];

/** "add me on snap", "are you on ig", "you dey whatsapp?", "do you have snap", "u use telegram" */
const ON_PLATFORM_PATTERNS = [
    new RegExp(`\\b(?:me|mi|you|u|ya|we|us|im|am|r|are|dey|meet|chat|talk|continue|move|reach|find|add|follow|hmu|up|message|text|dm)\\s+(?:on|for|via|thru|through)\\s+(?:the\\s+)?${SHORT_PLATFORM_ALT}\\b`),
    new RegExp(`\\b(?:do|does|d)\\s+(?:you|u|ya)\\s+(?:have|use|get|got)\\s+(?:a\\s+|an\\s+)?${SHORT_PLATFORM_ALT}\\b`),
    new RegExp(`\\b(?:you|u|ya)\\s+(?:get|dey|dey on|use|got|have)\\s+${SHORT_PLATFORM_ALT}\\b`),
    new RegExp(`\\b${SHORT_PLATFORM_ALT}\\s+(?:me|mi)\\b`) // "whatsapp me", "snap me", "dm me"? (dm handled below)
];

const BLOCKED_DOMAINS = [
    'wa.me', 'chat.whatsapp.com', 'api.whatsapp.com', 'whatsapp.com', 'wa.link',
    't.me', 'telegram.me', 'telegram.org', 'telegram.dog',
    'instagram.com', 'instagr.am', 'ig.me',
    'snapchat.com', 'snap.com',
    'tiktok.com', 'vm.tiktok.com',
    'facebook.com', 'fb.com', 'fb.me', 'm.me', 'messenger.com',
    'x.com', 'twitter.com', 't.co',
    'discord.gg', 'discord.com', 'discordapp.com',
    'threads.net', 'signal.me', 'signal.group', 'imo.im', 'viber.com', 'wechat.com', 'linkedin.com', 'onlyfans.com',
    'linktr.ee', 'linktree.com', 'beacons.ai', 'lnk.bio', 'bio.link', 'campsite.bio', 'taplink.cc', 'allmylinks.com',
    'bit.ly', 'tinyurl.com', 'cutt.ly', 'rebrand.ly', 'shorturl.at', 'is.gd', 'rb.gy', 'ow.ly', 'tiny.cc', 'goo.gl',
    'calendly.com', 'zoom.us', 'meet.google.com', 'truecaller.com'
];

const HANDLE_STOPWORDS = new Set([
    'home', 'the', 'school', 'library', 'lib', 'hostel', 'class', 'night', 'noon', 'campus', 'church', 'mosque', 'cafe',
    'caf', 'lecture', 'hall', 'gym', 'work', 'all', 'everyone', 'here', 'there', 'least', 'last', 'first', 'once'
]);

// ---------------------------------------------------------------------------
// Detectors
// ---------------------------------------------------------------------------

function detectPhone(base) {
    const runs = extractDigitRuns(digitForm(base));
    for (const run of runs) {
        if (isPhoneLikeDigits(run)) return { category: 'phone', matched: run };
    }

    // Standalone partial number (first part of a number split across messages):
    // "0803", "+234 81", "0703 44". Requires a leading 0/234 so prices like "8000" pass.
    const letters = base.replace(/[^a-zA-Z]/g, '');
    if (letters.length <= 3 && runs.length) {
        if (runs.some((run) => run.length >= 4 && NG_MOBILE_PARTIAL.test(run))) return { category: 'phone', matched: runs.join('') };
        const joined = runs.join('');
        if (joined.length >= 7) return { category: 'phone', matched: joined };
    }
    return null;
}

/** Turns "amaka (at) gmail (dot) com" / "wa dot me" into canonical form. */
function deobfuscateLinks(lower) {
    return lower
        .replace(/\s*(?:\(|\[|\{|<)\s*(?:at)\s*(?:\)|\]|\}|>)\s*/g, '@')
        .replace(/\s+at\s+(?=(?:gmail|googlemail|yahoo|ymail|outlook|hotmail|icloud|live|aol|proton|protonmail|mail)\b)/g, '@')
        .replace(/\s*(?:\(|\[|\{|<)\s*dot\s*(?:\)|\]|\}|>)\s*/g, '.')
        .replace(/\s+dot\s+/g, '.')
        .replace(/\s*\.\s*/g, '.')
        .replace(/\s*\/\s*/g, '/');
}

function detectEmail(lower) {
    const text = deobfuscateLinks(lower);
    const match = text.match(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|ng|edu|co|io|me|uk|us|info|biz|live|mail|app|xyz)\b/);
    return match ? { category: 'email', matched: match[0] } : null;
}

function detectLink(lower) {
    const text = deobfuscateLinks(lower);
    for (const domain of BLOCKED_DOMAINS) {
        const escaped = domain.replace(/\./g, '\\.');
        const re = new RegExp(`(?:^|[^a-z0-9-])(?:[a-z0-9-]+\\.)*${escaped}(?:$|[^a-z0-9-])`);
        if (re.test(text)) return { category: 'link', matched: domain };
    }
    return null;
}

function detectHandle(lower) {
    const re = /(?:^|[^a-z0-9._%+-])@([a-z_][a-z0-9._]{2,29})/g;
    let m;
    while ((m = re.exec(lower)) !== null) {
        const handle = m[1].replace(/[._]+$/, '');
        if (handle.length >= 3 && !HANDLE_STOPWORDS.has(handle)) return { category: 'social', matched: `@${handle}` };
    }
    // "@ amaka_23" / "@ king.tee" — spaced evasion, only when it looks like a username (digit, _ or .)
    const spaced = lower.match(/(?:^|\s)@\s+([a-z_][a-z0-9]*[._0-9][a-z0-9._]*)/);
    if (spaced && spaced[1].length >= 3) return { category: 'social', matched: `@${spaced[1]}` };
    return null;
}

function detectSocial(lower, tokens, squashed) {
    // 1) Phrase patterns ("add me on snap", "you dey ig?")
    const tokenText = ` ${tokens.join(' ')} `;
    for (const re of ON_PLATFORM_PATTERNS) {
        const m = tokenText.match(re);
        if (m) return { category: 'social', matched: m[0].trim() };
    }

    // 2) Platform token + intent word nearby
    //    strong platforms: any intent word within ±5 tokens
    //    weak platforms ("snap", "x", "line"): possessive right before it, or a strong intent within ±2
    for (let i = 0; i < tokens.length; i += 1) {
        const tok = tokens[i];
        const strong = STRONG_PLATFORM_TOKENS.has(tok) || STRONG_PLATFORM_TOKENS.has(collapse(tok));
        const weak = !strong && WEAK_PLATFORM_TOKENS.has(tok);
        if (!strong && !weak) continue;

        if (strong) {
            const from = Math.max(0, i - 5);
            const to = Math.min(tokens.length - 1, i + 5);
            for (let j = from; j <= to; j += 1) {
                if (j !== i && INTENT_TOKENS.has(tokens[j])) return { category: 'social', matched: `${tok} … ${tokens[j]}` };
            }
        } else {
            if (i > 0 && POSSESSIVE_TOKENS.has(tokens[i - 1])) return { category: 'social', matched: `${tokens[i - 1]} ${tok}` };
            const from = Math.max(0, i - 2);
            const to = Math.min(tokens.length - 1, i + 2);
            for (let j = from; j <= to; j += 1) {
                if (j !== i && STRONG_INTENT_TOKENS.has(tokens[j]) && !POSSESSIVE_TOKENS.has(tokens[j])) {
                    return { category: 'social', matched: `${tok} … ${tokens[j]}` };
                }
            }
        }

        // Platform followed by "handle-like" value: "snap: kingtee", "ig - amaka.x", "👻 kingtee_01"
        const handleAfter = new RegExp(`\\b${tok}\\b\\s*(?::|=|->|-|—|=>)\\s*@?[a-z0-9._]{3,}`);
        const usernameAfter = new RegExp(`\\b${tok}\\b\\s+@?[a-z][a-z0-9]*[._0-9][a-z0-9._]*`);
        if (handleAfter.test(lower) || usernameAfter.test(lower)) return { category: 'social', matched: tok };

        // Strong platform asked as a question: "whatsapp?", "telegram??"
        if (strong && new RegExp(`\\b${tok}\\s*\\?`).test(lower)) return { category: 'social', matched: `${tok}?` };
    }

    // 3) Squashed / reversed brand names ("w h a t s a p p", "insta.gram", "ppastahw") + any intent
    const reversed = squashed.split('').reverse().join('');
    const hiddenBrand = SQUASH_PLATFORMS.find((p) => squashed.includes(p) || reversed.includes(p));
    if (hiddenBrand) {
        const plainWords = lower.replace(/[^a-z]+/g, ' ').trim().split(/\s+/).map(collapse);
        const brandIsVisible = plainWords.some((w) => w.includes(hiddenBrand));
        // Deliberately obfuscated brand names (spaced, dotted, leet, reversed) are blocked outright.
        // Plain mentions were already evaluated with the intent window above.
        if (!brandIsVisible) return { category: 'social', matched: hiddenBrand };
    }
    return null;
}

function detectOffApp(tokens) {
    const tokenText = ` ${tokens.join(' ')} `;
    for (const re of OFF_APP_PATTERNS) {
        const m = tokenText.match(re);
        if (m) {
            const phrase = m[0].trim();
            const category = /\b(?:phone|number|numbers|num|digits|numba|nomba|cell|mobile|line|flash|beep|buzz)\b/.test(phrase)
                ? 'phone'
                : /\b(?:email|mail|gmail|addy)\b/.test(phrase) ? 'email'
                    : /\b(?:app|apps|platform|platforms|site|application|elsewhere|somewhere)\b/.test(phrase) ? 'off_app'
                        : 'social';
            return { category, matched: phrase };
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Inspect a single message.
 * @param {string} content
 * @param {object|null} sender - Optional sender profile to check for Elite Ultra VIP bypass
 * @returns {{ blocked: boolean, category?: string, matched?: string, title?: string, body?: string, exempt?: boolean, tier?: string }}
 */
export function detectOffPlatformContact(content, sender = null) {
    if (sender && canBypassOffPlatformSafeguard(sender)) {
        return { blocked: false, exempt: true, tier: 'ultra' };
    }
    if (!content || typeof content !== 'string' || !content.trim()) return { blocked: false };

    const base = replaceEmojiStandIns(baseNormalize(content));
    const lower = plainLower(base);
    const tokens = tokenize(lower);
    const squashed = squash(lower);

    const hit = detectLink(lower)
        || detectEmail(lower)
        || detectPhone(base)
        || detectHandle(lower)
        || detectOffApp(tokens)
        || detectSocial(lower, tokens, squashed);

    if (!hit) return { blocked: false };
    const copy = OFF_PLATFORM_COPY[hit.category] || OFF_PLATFORM_COPY.off_app;
    return { blocked: true, category: hit.category, matched: hit.matched, title: copy.title, body: copy.body };
}

/**
 * Inspect a message together with the sender's recent messages in the same chat
 * to catch numbers / names split across several bubbles.
 * @param {string} content - The message about to be sent.
 * @param {string[]} recentSenderMessages - Sender's previous text messages (oldest -> newest), last few minutes.
 * @param {object|null} sender - Optional sender profile to check for Elite Ultra VIP bypass
 */
export function detectOffPlatformContactWithHistory(content, recentSenderMessages = [], sender = null) {
    if (sender && canBypassOffPlatformSafeguard(sender)) {
        return { blocked: false, exempt: true, tier: 'ultra' };
    }
    const single = detectOffPlatformContact(content, sender);
    if (single.blocked) return single;

    const history = (recentSenderMessages || []).filter((m) => typeof m === 'string' && m.trim()).slice(-4);
    if (!history.length) return single;

    // Digits split across bubbles: "0803" / "123" / "4567"
    const currentDigits = extractDigitRuns(digitForm(baseNormalize(content))).join('');
    if (currentDigits.length) {
        let combinedDigits = currentDigits;
        for (let i = history.length - 1; i >= 0; i -= 1) {
            const msg = baseNormalize(history[i]);
            const letters = msg.replace(/[^a-zA-Z]/g, '').length;
            const digits = extractDigitRuns(digitForm(msg)).join('');
            if (!digits || letters > 12) break; // only chain short, mostly-numeric bubbles
            combinedDigits = digits + combinedDigits;
            if (combinedDigits.length >= 10) {
                const copy = OFF_PLATFORM_COPY.phone;
                return { blocked: true, category: 'phone', matched: combinedDigits, split: true, title: copy.title, body: copy.body };
            }
        }
    }

    // Words split across bubbles: "whats" / "app" or "my ig" / "is" / "amaka"
    const joinedPrev = history.join(' ');
    const prevResult = detectOffPlatformContact(joinedPrev);
    const joinedAll = detectOffPlatformContact(`${joinedPrev} ${content}`);
    const joinedTight = detectOffPlatformContact(`${history.join('')}${content}`);
    const combined = joinedAll.blocked ? joinedAll : joinedTight;
    if (combined.blocked && !prevResult.blocked) return { ...combined, split: true };

    return single;
}

/** Normalise any error returned from the server trigger / guard into a boolean. */
export function isOffPlatformBlockError(error) {
    if (!error) return false;
    const text = typeof error === 'string' ? error : `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${error.code || ''}`;
    return text.includes(OFF_PLATFORM_BLOCK_CODE);
}

const ATTEMPT_STORAGE_KEY = 'tcd_off_platform_attempts';

/** Tracks blocked attempts locally so the warning escalates for repeat offenders. Returns the new count (24h window). */
export function recordOffPlatformAttempt(userId, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return 1;
    const key = `${ATTEMPT_STORAGE_KEY}_${userId || 'anon'}`;
    const now = Date.now();
    let list = [];
    try {
        list = JSON.parse(storage.getItem(key) || '[]');
    } catch (_) {
        list = [];
    }
    list = (Array.isArray(list) ? list : []).filter((t) => now - t < 24 * 60 * 60 * 1000);
    list.push(now);
    try {
        storage.setItem(key, JSON.stringify(list.slice(-20)));
    } catch (_) { /* quota */ }
    return list.length;
}

/**
 * Sanitizes or masks off-platform contact details (phone numbers, social handles,
 * links, emails) in a public profile bio unless the profile owner is an Elite Ultra VIP member.
 *
 * @param {string} bio - The raw bio text
 * @param {boolean|object} isOwnerUltra - True or owner profile if the profile owner is an Elite Ultra VIP
 * @returns {string} Sanitized bio safe for public display
 */
export function sanitizeBioForDisplay(bio, isOwnerUltra = false) {
    if (!bio || typeof bio !== 'string') return bio;
    const isUltra = typeof isOwnerUltra === 'object' ? canBypassOffPlatformSafeguard(isOwnerUltra) : Boolean(isOwnerUltra);
    if (isUltra) return bio;

    const check = detectOffPlatformContact(bio);
    if (!check.blocked) return bio;

    let sanitized = bio;
    // Mask phone numbers (sequences of numbers/separators of 7+ digits)
    sanitized = sanitized.replace(/(?:\+?\d[\d\s\-().]{5,}\d)/g, '[🔒 contact locked]');

    // Mask social handles (@handle)
    sanitized = sanitized.replace(/(@[a-zA-Z0-9._]{2,30})/g, '[🔒 handle locked]');

    // Mask links / domains
    sanitized = sanitized.replace(/(https?:\/\/[^\s]+|wa\.me\/[^\s]+|t\.me\/[^\s]+|instagram\.com\/[^\s]+)/gi, '[🔒 link locked]');

    // Mask emails
    sanitized = sanitized.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[🔒 email locked]');

    // If still blocked after replacement, replace the exact matched pattern if available
    const recheck = detectOffPlatformContact(sanitized);
    if (recheck.blocked && recheck.matched) {
        sanitized = sanitized.replace(recheck.matched, '[🔒 contact details locked • Elite Ultra VIP]');
    }

    return sanitized;
}
