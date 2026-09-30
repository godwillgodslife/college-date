import { hasActivePremium } from '../utils/premium';

/**
 * Central Feature Entitlement & Permission Service
 */

export function canSendLiveLocation(userProfile) {
    return hasActivePremium(userProfile);
}

export function canSendAttachments(userProfile) {
    if (!userProfile) return false;
    return !userProfile.is_banned && !userProfile.is_blocked;
}

export function canSendGift(userProfile, coinBalance, giftCost) {
    if (!userProfile) return false;
    if (userProfile.is_banned || userProfile.is_blocked) return false;
    return (coinBalance ?? userProfile.coins ?? 0) >= giftCost;
}

export function canCreateServiceDeal(userProfile) {
    if (!userProfile) return false;
    return !userProfile.is_banned && !userProfile.is_blocked;
}

export function canPurchaseCoins(userProfile) {
    if (!userProfile) return false;
    return !userProfile.is_banned;
}

export function isUserBlocked(blockedList, targetUserId) {
    if (!Array.isArray(blockedList) || !targetUserId) return false;
    return blockedList.some(item => item.id === targetUserId || item.blocked_id === targetUserId);
}

export { hasActivePremium };
