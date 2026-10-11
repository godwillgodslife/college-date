import { Capacitor } from '@capacitor/core';

let cachedBadgeCount = 0;
let nativePluginInstance = null;
const STORAGE_KEY = 'tcd_app_badge_count';

// Initialize from local storage if available
if (typeof window !== 'undefined') {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
            const parsed = parseInt(stored, 10);
            if (Number.isFinite(parsed) && parsed >= 0) {
                cachedBadgeCount = parsed;
            }
        }
    } catch {
        // ignore
    }
}

/**
 * Normalizes any count input into a valid non-negative integer.
 * Never returns NaN, negative, or undefined.
 */
export function normalizeBadgeCount(value) {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    if (!Number.isFinite(num) || isNaN(num) || num <= 0) return 0;
    return Math.floor(num);
}

/**
 * Formats a badge count for in-app UI display:
 * - 0 or negative -> ''
 * - 1 to 99 -> exact string (e.g. '1', '42')
 * - > 99 -> '99+'
 */
export function formatBadgeCount(value) {
    const count = normalizeBadgeCount(value);
    if (count <= 0) return '';
    if (count > 99) return '99+';
    return String(count);
}

/**
 * Authoritative Launcher Badge Calculation:
 * Launcher badge = unread general notifications + unread incoming messages (deduplicating where appropriate).
 * 
 * If message notifications are tracked inside generalUnreadCount,
 * we deduplicate so they are not double-counted with chatUnreadCount.
 */
export function calculateLauncherBadgeCount({
    generalUnreadCount = 0,
    chatUnreadCount = 0,
    messageNotificationsCount = 0
} = {}) {
    const cleanGeneral = normalizeBadgeCount(generalUnreadCount);
    const cleanChat = normalizeBadgeCount(chatUnreadCount);
    const cleanMsgNotifs = normalizeBadgeCount(messageNotificationsCount);

    // Subtract message notifications already included in generalUnreadCount
    const generalExcludingMessages = Math.max(0, cleanGeneral - cleanMsgNotifs);
    const total = generalExcludingMessages + cleanChat;

    return Math.max(0, total);
}

async function getNativeBadgePlugin() {
    if (!Capacitor.isNativePlatform()) return null;
    if (nativePluginInstance) return nativePluginInstance;

    try {
        const { registerPlugin } = await import('@capacitor/core');
        nativePluginInstance = registerPlugin('AppBadge');
        return nativePluginInstance;
    } catch (err) {
        console.warn('[appBadgeService] Could not resolve native AppBadge plugin:', err);
        return null;
    }
}

/**
 * Sets the badge count on the launcher app icon and web PWA badge.
 * Gracefully handles Android 8.0+ / Samsung / Xiaomi launcher capabilities.
 */
export async function setAppBadge(count) {
    const normalized = normalizeBadgeCount(count);
    cachedBadgeCount = normalized;

    // Cache locally
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, String(normalized));
        } catch {
            // ignore
        }
        window.dispatchEvent(new CustomEvent('tcd:app-badge-updated', {
            detail: { count: normalized, formatted: formatBadgeCount(normalized) }
        }));
    }

    // 1. Web Badging API (PWA / Chrome / Edge / modern browsers)
    if (typeof navigator !== 'undefined') {
        try {
            if (normalized > 0 && 'setAppBadge' in navigator) {
                await navigator.setAppBadge(normalized);
            } else if (normalized === 0 && 'clearAppBadge' in navigator) {
                await navigator.clearAppBadge();
            }
        } catch {
            // Gracefully ignore web badge rejection (e.g. permissions or unsupported context)
        }
    }

    // 2. Android Native Badging via Capacitor AppBadgePlugin
    if (Capacitor.isNativePlatform()) {
        try {
            const plugin = await getNativeBadgePlugin();
            if (plugin) {
                if (normalized > 0) {
                    await plugin.set({ count: normalized });
                } else {
                    await plugin.clear();
                }
            }
        } catch (err) {
            console.warn('[appBadgeService] Native badge sync error:', err);
        }
    }

    return normalized;
}

/**
 * Clears the app icon badge (sets count to 0).
 */
export async function clearAppBadge() {
    return await setAppBadge(0);
}

/**
 * Retrieves current active badge count.
 */
export function getAppBadge() {
    return cachedBadgeCount;
}

/**
 * Checks if badging is supported on the current platform/device.
 */
export async function isAppBadgeSupported() {
    if (Capacitor.isNativePlatform()) {
        try {
            const plugin = await getNativeBadgePlugin();
            if (plugin?.isSupported) {
                const res = await plugin.isSupported();
                return Boolean(res?.isSupported);
            }
        } catch {
            return true;
        }
        return true;
    }

    if (typeof navigator !== 'undefined') {
        return 'setAppBadge' in navigator;
    }

    return false;
}
