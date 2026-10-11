/**
 * =============================================================================
 * THE COLLEGE DATE (CD2.0) — CONTEXTUAL PREMIUM TRIAL SERVICE
 * Manages 3-Day Free Trial Eligibility, Intent Triggers, and Anti-Abuse Gating
 * =============================================================================
 */

import { supabase } from '../lib/supabase';
import { isNative, getNativePlatform, getRevenueCatPackages, purchaseRevenueCatPackage } from './paymentService';

export const TRIGGER_CONFIGS = {
    viewers_list: 'viewers_list',
    swipe_wall: 'swipe_wall',
    video_upload: 'video_upload',
    repeated_premium_visits: 'repeated_premium_visits',
    match_surge: 'match_surge'
};

const TRIAL_STORAGE_KEYS = {
    DISMISSED_UNTIL: 'cd_trial_dismissed_until',
    SESSION_SHOWN: 'cd_trial_shown_session',
    DEVICE_FINGERPRINT: 'cd_device_fingerprint',
    ELIGIBILITY_CACHE: 'cd_trial_eligibility_cache',
    PREMIUM_VISITS_COUNT: 'cd_premium_visits_count'
};

const DISMISSAL_COOLDOWN_DAYS = 14;

/**
 * Get or generate a persistent hardware fingerprint for the device.
 */
export async function getDeviceFingerprint() {
    try {
        let storedId = localStorage.getItem(TRIAL_STORAGE_KEYS.DEVICE_FINGERPRINT);
        if (!storedId) {
            storedId = 'cd_dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
            localStorage.setItem(TRIAL_STORAGE_KEYS.DEVICE_FINGERPRINT, storedId);
        }
        return storedId;
    } catch {
        return 'cd_dev_fallback_' + Date.now().toString(36);
    }
}

/**
 * Check whether the trial offer can be shown right now based on frequency capping.
 * - Max 1 offer impression per session
 * - 14-day cool-down after explicit user dismissal
 */
export function canShowTrialOffer() {
    try {
        // 1. Check session frequency cap
        if (sessionStorage.getItem(TRIAL_STORAGE_KEYS.SESSION_SHOWN) === 'true') {
            return false;
        }

        // 2. Check 14-day cool-down after dismissal
        const dismissedUntil = localStorage.getItem(TRIAL_STORAGE_KEYS.DISMISSED_UNTIL);
        if (dismissedUntil) {
            const untilDate = new Date(dismissedUntil);
            if (untilDate > new Date()) {
                return false;
            }
        }

        return true;
    } catch {
        return true;
    }
}

/**
 * Mark that a trial offer was presented in this session.
 */
export function recordTrialOfferImpression(triggerSource) {
    try {
        sessionStorage.setItem(TRIAL_STORAGE_KEYS.SESSION_SHOWN, 'true');
        console.log(`[TrialService] Offer impression recorded for trigger: ${triggerSource}`);
    } catch (e) {
        console.warn('[TrialService] Error recording impression:', e);
    }
}

/**
 * Mark that a trial offer was dismissed by the user (starts 14-day cool-down).
 */
export function recordTrialOfferDismissed(triggerSource) {
    try {
        const cooldownDate = new Date();
        cooldownDate.setDate(cooldownDate.getDate() + DISMISSAL_COOLDOWN_DAYS);
        localStorage.setItem(TRIAL_STORAGE_KEYS.DISMISSED_UNTIL, cooldownDate.toISOString());
        sessionStorage.setItem(TRIAL_STORAGE_KEYS.SESSION_SHOWN, 'true');
        console.log(`[TrialService] Offer dismissed for ${triggerSource}. Cooldown until: ${cooldownDate.toISOString()}`);
    } catch (e) {
        console.warn('[TrialService] Error recording dismissal:', e);
    }
}

/**
 * Record a visit to the Premium page and determine if repeated visit trial nudge should fire.
 * Returns true if visits >= 3 and cooldown/frequency capping passes.
 */
export function recordPremiumPageVisit() {
    try {
        const visitsKey = TRIAL_STORAGE_KEYS.PREMIUM_VISITS_COUNT;
        const currentVisits = parseInt(localStorage.getItem(visitsKey) || '0', 10) + 1;
        localStorage.setItem(visitsKey, currentVisits.toString());

        if (currentVisits >= 3 && canShowTrialOffer()) {
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Check authoritative trial eligibility from server RPC.
 */
export async function checkTrialEligibility(userId) {
    if (!userId) return { eligible: false, reason: 'unauthenticated' };

    try {
        const deviceId = await getDeviceFingerprint();

        const { data, error } = await supabase.rpc('check_trial_eligibility', {
            p_user_id: userId,
            p_device_fingerprint: deviceId
        });

        if (error) {
            console.warn('[TrialService] check_trial_eligibility RPC error:', error);
            return { eligible: false, reason: 'rpc_error', error: error.message };
        }

        return data || { eligible: false, reason: 'unknown' };
    } catch (err) {
        console.warn('[TrialService] Eligibility evaluation exception:', err);
        return { eligible: false, reason: 'exception', error: err.message };
    }
}

/**
 * Claim the 3-day premium trial.
 * If running on Android Native, executes through RevenueCat/Google Play Billing first.
 */
export async function claimPremiumTrial({ userId, triggerSource, rcPackage = null }) {
    if (!userId) throw new Error('User authentication required.');

    const platform = getNativePlatform();
    const deviceId = await getDeviceFingerprint();
    let transactionId = null;

    // 1. If on native Android and RevenueCat package is provided, initiate trial via Google Play Billing
    if (isNative() && rcPackage) {
        try {
            console.log('[TrialService] Initiating native Google Play introductory free trial...');
            const { success, customerInfo, error } = await purchaseRevenueCatPackage(rcPackage, {
                requiredEntitlement: 'Premium',
                requireEntitlement: false // In trial, entitlement activates via RPC or RC webhook
            });

            if (customerInfo?.originalAppUserId) {
                transactionId = customerInfo.originalPurchaseDate || customerInfo.originalAppUserId;
            }
        } catch (rcError) {
            if (rcError.userCancelled) {
                return { success: false, userCancelled: true };
            }
            console.warn('[TrialService] Native trial purchase warning, falling back to server grant:', rcError);
        }
    }

    // 2. Authoritative server claim
    const { data, error } = await supabase.rpc('claim_premium_trial', {
        p_user_id: userId,
        p_source: triggerSource,
        p_platform: platform,
        p_device_fingerprint: deviceId,
        p_transaction_id: transactionId
    });

    if (error) {
        console.error('[TrialService] claim_premium_trial RPC error:', error);
        throw new Error(error.message || 'Could not claim trial.');
    }

    if (!data?.success) {
        throw new Error(data?.error || 'Trial activation was not successful.');
    }

    // Reset dismissal records so user is recognized as trialist
    localStorage.removeItem(TRIAL_STORAGE_KEYS.DISMISSED_UNTIL);

    return data;
}
