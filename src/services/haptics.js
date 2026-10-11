let hapticsModule = null;

async function getHapticsPlugin() {
    if (!hapticsModule) {
        hapticsModule = await import('@capacitor/haptics');
    }
    return hapticsModule;
}

function shouldTriggerHaptic() {
    if (typeof window === 'undefined') return false;
    const isNative = Boolean(window.Capacitor && window.Capacitor.isNativePlatform());
    const hasNativePreview = Boolean(typeof document !== 'undefined' && document.documentElement?.classList.contains('is-native-app'));
    return isNative || hasNativePreview;
}

/**
 * Triggers a subtle native haptic feedback (impact style light) on Capacitor platforms.
 * Safely falls back on web-only platforms and respects native environments.
 */
export async function triggerLightHaptic() {
    if (!shouldTriggerHaptic()) {
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate(15);
        }
        return;
    }
    
    try {
        const { Haptics, ImpactStyle } = await getHapticsPlugin();
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch (err) {
        console.warn('[Haptics] Failed to trigger native light haptic:', err);
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate(15);
        }
    }
}

/**
 * Triggers a medium native haptic feedback for user-initiated confirm actions.
 */
export async function triggerMediumHaptic() {
    if (!shouldTriggerHaptic()) {
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate(25);
        }
        return;
    }

    try {
        const { Haptics, ImpactStyle } = await getHapticsPlugin();
        await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (err) {
        console.warn('[Haptics] Failed to trigger native medium haptic:', err);
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate(25);
        }
    }
}

/**
 * Triggers a success notification pattern (e.g. mark-all-read, match celebration).
 */
export async function triggerSuccessHaptic() {
    if (!shouldTriggerHaptic()) {
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate([15, 50, 20]);
        }
        return;
    }

    try {
        const { Haptics, NotificationType } = await getHapticsPlugin();
        await Haptics.notification({ type: NotificationType.Success });
    } catch (err) {
        console.warn('[Haptics] Failed to trigger native success haptic:', err);
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate([15, 50, 20]);
        }
    }
}

/**
 * Triggers a warning notification pattern (e.g. destructive action, validation error).
 */
export async function triggerWarningHaptic() {
    if (!shouldTriggerHaptic()) {
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate([30, 40, 30]);
        }
        return;
    }

    try {
        const { Haptics, NotificationType } = await getHapticsPlugin();
        await Haptics.notification({ type: NotificationType.Warning });
    } catch (err) {
        console.warn('[Haptics] Failed to trigger native warning haptic:', err);
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
            window.navigator.vibrate([30, 40, 30]);
        }
    }
}

export const haptics = {
    light: triggerLightHaptic,
    medium: triggerMediumHaptic,
    success: triggerSuccessHaptic,
    warning: triggerWarningHaptic
};

export default haptics;
