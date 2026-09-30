export function normalizeReferralCodeInput(value = '') {
    return String(value)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '')
        .slice(0, 32);
}

export function getReferralMessage(result) {
    const reason = result?.reason || result?.error;
    if (result?.valid || result?.success) {
        const name = result.referrer_name ? ` from ${result.referrer_name}` : '';
        return `Referral code accepted${name}.`;
    }

    switch (reason) {
        case 'empty_code':
            return '';
        case 'not_found':
            return 'That referral code was not found.';
        case 'self_referral':
            return 'You cannot use your own referral code.';
        case 'already_applied':
            return 'A referral code has already been applied to this account.';
        case 'inactive_referrer':
            return 'That referral code is not active right now.';
        case 'profile_missing':
            return 'Your profile is still being prepared. Please try again in a moment.';
        case 'not_authenticated':
            return 'Sign in first so we can apply this referral code.';
        default:
            return 'Could not check that referral code. Please try again.';
    }
}
