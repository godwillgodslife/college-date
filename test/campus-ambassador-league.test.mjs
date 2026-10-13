import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getCampusBadgeText, TOP_CAMPUS_CONNECTORS, getReferralMilestone } from '../src/utils/ambassadorLeague.js';

test('Campus Ambassador League: getCampusBadgeText formats tertiary institution labels accurately', () => {
    assert.equal(getCampusBadgeText({ university: 'University of Lagos' }), 'UNILAG • University of Lagos');
    assert.equal(getCampusBadgeText({ campus: 'unilag akoka' }), 'UNILAG • University of Lagos');
    assert.equal(getCampusBadgeText({ university: 'University of Ibadan' }), 'UI • University of Ibadan');
    assert.equal(getCampusBadgeText({ university: 'Obafemi Awolowo University' }), 'OAU • Obafemi Awolowo University');
    assert.equal(getCampusBadgeText({ university: 'Lagos State University' }), 'LASU • Lagos State University');
    assert.equal(getCampusBadgeText({ university: 'University of Benin' }), 'UNIBEN • University of Benin');
    assert.equal(getCampusBadgeText({ university: 'Covenant University' }), 'CU • Covenant University');
    assert.equal(getCampusBadgeText({ university: 'Ahmadu Bello University' }), 'Ahmadu Bello University');
    assert.equal(getCampusBadgeText(null), 'UNILAG • University of Lagos');
});

test('Campus Ambassador League: TOP_CAMPUS_CONNECTORS contains authentic podium ranking metadata', () => {
    assert.equal(TOP_CAMPUS_CONNECTORS.length, 3);

    const leader = TOP_CAMPUS_CONNECTORS.find(c => c.rank === 1);
    assert.ok(leader, 'Leader at rank 1 must exist');
    assert.equal(leader.name, 'Tunde A.');
    assert.equal(leader.students, 42);
    assert.equal(leader.isLeader, true);
    assert.equal(leader.avatarKey, 'tunde');

    const second = TOP_CAMPUS_CONNECTORS.find(c => c.rank === 2);
    assert.ok(second);
    assert.equal(second.name, 'Blessing O.');
    assert.equal(second.students, 35);
    assert.equal(second.avatarKey, 'amaka');

    const third = TOP_CAMPUS_CONNECTORS.find(c => c.rank === 3);
    assert.ok(third);
    assert.equal(third.name, 'Chioma K.');
    assert.equal(third.students, 28);
    assert.equal(third.avatarKey, 'zainab');
});

test('Campus Ambassador League: getReferralMilestone calculates progress and unlocks accurately', () => {
    const m0 = getReferralMilestone(0);
    assert.equal(m0.progress, 0);
    assert.equal(m0.remaining, 5);
    assert.equal(m0.percent, 0);
    assert.equal(m0.isUnlocked, false);
    assert.equal(m0.title, '0 of 5 Friends Joined');
    assert.match(m0.subtitle, /5 more invites to unlock 3 Days Free Elite/);

    const m3 = getReferralMilestone(3);
    assert.equal(m3.progress, 3);
    assert.equal(m3.remaining, 2);
    assert.equal(m3.percent, 60);
    assert.equal(m3.isUnlocked, false);
    assert.equal(m3.title, '3 of 5 Friends Joined');
    assert.match(m3.subtitle, /2 more invites to unlock 3 Days Free Elite/);

    const m5 = getReferralMilestone(5);
    assert.equal(m5.progress, 5);
    assert.equal(m5.remaining, 0);
    assert.equal(m5.percent, 100);
    assert.equal(m5.isUnlocked, true);
    assert.equal(m5.title, '5 of 5 Friends Joined');
    assert.match(m5.subtitle, /Milestone Unlocked: 3 Days Free Elite Active/);
});

test('Campus Ambassador League: Referrals.jsx renders milestone card, podium cards, and WhatsApp CTA', () => {
    const jsxContent = readFileSync(resolve('src/pages/Referrals.jsx'), 'utf8');

    assert.match(jsxContent, /Campus Ambassador League/);
    assert.match(jsxContent, /Your Referral Milestone/);
    assert.match(jsxContent, /milestone-progress-track/);
    assert.match(jsxContent, /milestone-crown-badge/);
    assert.match(jsxContent, /Top Campus Connectors/);
    assert.match(jsxContent, /connectors-podium-row/);
    assert.match(jsxContent, /connector-podium-card/);
    assert.match(jsxContent, /leader-floating-crown/);
    assert.match(jsxContent, /ambassador-whatsapp-btn/);
    assert.match(jsxContent, /Share on WhatsApp Status & Groups/);
    assert.match(jsxContent, /whatsapp-code-pill/);
});

test('Campus Ambassador League: Referrals.css provides responsive podium and Light Theme design tokens', () => {
    const cssContent = readFileSync(resolve('src/pages/Referrals.css'), 'utf8');

    assert.match(cssContent, /\.ambassador-header/);
    assert.match(cssContent, /\.campus-identity-pill/);
    assert.match(cssContent, /\.referral-milestone-card/);
    assert.match(cssContent, /\.milestone-crown-badge/);
    assert.match(cssContent, /\.connectors-podium-row/);
    assert.match(cssContent, /\.connector-podium-card/);
    assert.match(cssContent, /\.connector-podium-card\.is-leader/);
    assert.match(cssContent, /\.leader-floating-crown/);
    assert.match(cssContent, /\.ambassador-whatsapp-btn/);
    assert.match(cssContent, /\.whatsapp-code-pill/);

    // Light Theme Overrides
    assert.match(cssContent, /html\[data-theme="light"\]\s+\.ambassador-title/);
    assert.match(cssContent, /html\[data-theme="light"\]\s+\.campus-identity-pill/);
    assert.match(cssContent, /html\[data-theme="light"\]\s+\.referral-milestone-card/);
    assert.match(cssContent, /html\[data-theme="light"\]\s+\.connector-podium-card/);
});
