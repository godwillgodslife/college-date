import { supabase } from '../lib/supabase';
import { getReferralMessage, normalizeReferralCodeInput } from '../utils/referralCode';

const REFERRAL_STORAGE_KEY = 'referral_code';

export { getReferralMessage, normalizeReferralCodeInput };

export function getStoredReferralCode() {
    if (typeof window === 'undefined') return '';
    return normalizeReferralCodeInput(window.localStorage.getItem(REFERRAL_STORAGE_KEY) || '');
}

export function rememberReferralCode(code) {
    if (typeof window === 'undefined') return '';
    const normalized = normalizeReferralCodeInput(code);
    if (normalized) {
        window.localStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
    }
    return normalized;
}

export function clearStoredReferralCode() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
}

export async function validateReferralCode(code) {
    const normalized = normalizeReferralCodeInput(code);
    if (!normalized) {
        return { data: { valid: false, reason: 'empty_code', code: '' }, error: null };
    }

    const { data, error } = await supabase.rpc('validate_referral_code', {
        p_code: normalized,
    });

    return { data: data || null, error };
}

export async function applyReferralCode(code) {
    const normalized = normalizeReferralCodeInput(code);
    if (!normalized) {
        return { data: { success: true, skipped: true, reason: 'empty_code' }, error: null };
    }

    const { data, error } = await supabase.rpc('apply_referral_code', {
        p_code: normalized,
    });

    return { data: data || null, error };
}

export async function applyStoredReferralCode() {
    const storedCode = getStoredReferralCode();
    if (!storedCode) {
        return { data: { success: true, skipped: true, reason: 'empty_code' }, error: null };
    }

    const result = await applyReferralCode(storedCode);
    if (!result.error && (result.data?.success || result.data?.already_applied)) {
        clearStoredReferralCode();
    }

    return result;
}
