import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getReferralMessage,
    normalizeReferralCodeInput,
} from '../src/utils/referralCode.js';

test('normalizes referral codes without blocking an empty optional field', () => {
    assert.equal(normalizeReferralCodeInput(''), '');
    assert.equal(normalizeReferralCodeInput('   '), '');
    assert.equal(normalizeReferralCodeInput(' cd-ab12 '), 'CD-AB12');
    assert.equal(normalizeReferralCodeInput('cd ab_12!'), 'CDAB12');
});

test('caps referral codes to the accepted database input size', () => {
    assert.equal(normalizeReferralCodeInput('a'.repeat(40)).length, 32);
});

test('maps validation and application outcomes to user-facing messages', () => {
    assert.equal(
        getReferralMessage({ valid: true, referrer_name: 'Amaka' }),
        'Referral code accepted from Amaka.'
    );
    assert.equal(
        getReferralMessage({ reason: 'not_found' }),
        'That referral code was not found.'
    );
    assert.equal(
        getReferralMessage({ reason: 'self_referral' }),
        'You cannot use your own referral code.'
    );
    assert.equal(
        getReferralMessage({ reason: 'already_applied' }),
        'A referral code has already been applied to this account.'
    );
    assert.equal(
        getReferralMessage({ reason: 'inactive_referrer' }),
        'That referral code is not active right now.'
    );
    assert.equal(
        getReferralMessage({ reason: 'not_authenticated' }),
        'Sign in first so we can apply this referral code.'
    );
});
