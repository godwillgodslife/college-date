import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Contextual Premium Trial: trialService module contracts', async () => {
    const trialServicePath = path.join(rootDir, 'src', 'services', 'trialService.js');
    assert.ok(fs.existsSync(trialServicePath), 'trialService.js must exist');
    const content = fs.readFileSync(trialServicePath, 'utf8');

    // Exported helpers & functions
    assert.ok(content.includes('export async function getDeviceFingerprint'), 'Must export getDeviceFingerprint');
    assert.ok(content.includes('export function canShowTrialOffer'), 'Must export canShowTrialOffer');
    assert.ok(content.includes('export function recordTrialOfferImpression'), 'Must export recordTrialOfferImpression');
    assert.ok(content.includes('export function recordTrialOfferDismissed'), 'Must export recordTrialOfferDismissed');
    assert.ok(content.includes('export async function checkTrialEligibility'), 'Must export checkTrialEligibility');
    assert.ok(content.includes('export async function claimPremiumTrial'), 'Must export claimPremiumTrial');

    // 14-day cool-down and session frequency caps
    assert.ok(content.includes('DISMISSAL_COOLDOWN_DAYS = 14'), 'Must enforce 14-day cool-down');
    assert.ok(content.includes('cd_trial_dismissed_until'), 'Must track trial dismissal timestamp');
    assert.ok(content.includes('cd_trial_shown_session'), 'Must track session impression flag');
    assert.ok(content.includes('sessionStorage'), 'Must use sessionStorage for session frequency caps');
});

test('Contextual Premium Trial: ContextualPaywallSheet component & transparent UX', async () => {
    const sheetJsxPath = path.join(rootDir, 'src', 'components', 'ContextualPaywallSheet.jsx');
    const sheetCssPath = path.join(rootDir, 'src', 'components', 'ContextualPaywallSheet.css');
    assert.ok(fs.existsSync(sheetJsxPath), 'ContextualPaywallSheet.jsx must exist');
    assert.ok(fs.existsSync(sheetCssPath), 'ContextualPaywallSheet.css must exist');

    const jsxContent = fs.readFileSync(sheetJsxPath, 'utf8');
    const cssContent = fs.readFileSync(sheetCssPath, 'utf8');

    // Touchpoint configs
    assert.ok(jsxContent.includes('viewers_list:'), 'Must configure viewers_list copy');
    assert.ok(jsxContent.includes('swipe_wall:'), 'Must configure swipe_wall copy');
    assert.ok(jsxContent.includes('video_upload:'), 'Must configure video_upload copy');

    // Transparency & pricing disclosures
    assert.ok(jsxContent.includes('Free for 3 Days') || jsxContent.includes('Start 3-Day Free Trial'), 'Must state 3 Days Free');
    assert.ok(jsxContent.includes('₦2,400'), 'Must disclose quarterly rate (₦2,400/mo)');
    assert.ok(jsxContent.includes('7,200'), 'Must disclose quarterly upfront total (₦7,200)');
    assert.ok(jsxContent.includes('Cancel anytime'), 'Must feature clear cancel anytime disclosure');

    // Integration with trialService and payment gateways
    assert.ok(jsxContent.includes('checkTrialEligibility'), 'Must call checkTrialEligibility');
    assert.ok(jsxContent.includes('recordTrialOfferDismissed'), 'Must call recordTrialOfferDismissed on close');
    assert.ok(jsxContent.includes('claimPremiumTrial'), 'Must call claimPremiumTrial on trial start');
    assert.ok(jsxContent.includes('startPaystackPayment'), 'Must support Paystack payment for web');

    // CSS styling
    assert.ok(cssContent.includes('.paywall-sheet-backdrop'), 'Must define paywall-sheet-backdrop');
    assert.ok(cssContent.includes('.paywall-sheet-container'), 'Must define paywall-sheet-container');
    assert.ok(cssContent.includes('.trial-timeline'), 'Must style trial timeline');
});

test('Contextual Premium Trial: Database Migration integrity', async () => {
    const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20261001200000_contextual_premium_trial_system.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration SQL must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Tables and security constraints
    assert.ok(sql.includes('create table if not exists public.device_trial_fingerprints'), 'Must create device_trial_fingerprints');
    assert.ok(sql.includes('create table if not exists public.premium_trials'), 'Must create premium_trials');
    assert.ok(sql.includes('fingerprint_hash text primary key'), 'fingerprint_hash must be primary key');
    assert.ok(sql.includes('unique (user_id)'), 'user_id in premium_trials must be unique (1 trial per user)');

    // Authoritative RPCs
    assert.ok(sql.includes('check_trial_eligibility'), 'Must declare check_trial_eligibility RPC');
    assert.ok(sql.includes('claim_premium_trial'), 'Must declare claim_premium_trial RPC');
    assert.ok(sql.includes('security definer'), 'RPCs must be security definer to verify entitlements securely');
});

test('Contextual Premium Trial: High-Intent Touchpoint Integrations (Viewers.jsx & Match.jsx)', async () => {
    const viewersPath = path.join(rootDir, 'src', 'pages', 'Viewers.jsx');
    const matchPath = path.join(rootDir, 'src', 'pages', 'Match.jsx');

    const viewersContent = fs.readFileSync(viewersPath, 'utf8');
    const matchContent = fs.readFileSync(matchPath, 'utf8');

    // Viewers.jsx checks
    assert.ok(viewersContent.includes("import ContextualPaywallSheet from '../components/ContextualPaywallSheet'"), 'Viewers must import ContextualPaywallSheet');
    assert.ok(viewersContent.includes('triggerSource="viewers_list"'), 'Viewers must pass viewers_list triggerSource');
    assert.ok(viewersContent.includes('paywallOpen'), 'Viewers must manage paywallOpen state');
    assert.ok(viewersContent.includes('setPaywallOpen(true)'), 'Viewers must open paywall on click');

    // Match.jsx checks
    assert.ok(matchContent.includes("import ContextualPaywallSheet from '../components/ContextualPaywallSheet'"), 'Match must import ContextualPaywallSheet');
    assert.ok(matchContent.includes('triggerSource="swipe_wall"'), 'Match must pass swipe_wall triggerSource');
    assert.ok(matchContent.includes('paywallOpen'), 'Match must manage paywallOpen state');
    assert.ok(matchContent.includes('setPaywallOpen(true)'), 'Match must open paywall on limit reached');
});

test('Contextual Premium Trial: Trigger 3 (Video Profile) & Trigger 4 (Repeated Visits)', async () => {
    const editProfilePath = path.join(rootDir, 'src', 'pages', 'EditProfile.jsx');
    const premiumUpgradePath = path.join(rootDir, 'src', 'pages', 'PremiumUpgrade.jsx');

    const editProfileContent = fs.readFileSync(editProfilePath, 'utf8');
    const premiumUpgradeContent = fs.readFileSync(premiumUpgradePath, 'utf8');

    // Trigger 3: EditProfile.jsx
    assert.ok(editProfileContent.includes("import ContextualPaywallSheet from '../components/ContextualPaywallSheet'"), 'EditProfile must import ContextualPaywallSheet');
    assert.ok(editProfileContent.includes('triggerSource="video_upload"'), 'EditProfile must specify triggerSource="video_upload"');
    assert.ok(editProfileContent.includes('setPaywallOpen(true)'), 'EditProfile must open paywall when non-premium user attempts video upload');

    // Trigger 4: PremiumUpgrade.jsx
    assert.ok(premiumUpgradeContent.includes("import ContextualPaywallSheet from '../components/ContextualPaywallSheet'"), 'PremiumUpgrade must import ContextualPaywallSheet');
    assert.ok(premiumUpgradeContent.includes('recordPremiumPageVisit'), 'PremiumUpgrade must track visits via recordPremiumPageVisit');
    assert.ok(premiumUpgradeContent.includes('repeated_premium_visits'), 'PremiumUpgrade must support repeated_premium_visits trigger');
    assert.ok(premiumUpgradeContent.includes('premium-trial-banner'), 'PremiumUpgrade must render student 3-day free trial banner');
});
