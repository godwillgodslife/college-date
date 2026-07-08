let hapticsModule = null;

/**
 * Triggers a subtle native haptic feedback (impact style light) on Capacitor platforms.
 * Safely falls back on web-only platforms and respects native environments.
 */
export async function triggerLightHaptic() {
    if (typeof window === 'undefined') return;
    
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    const hasNativePreview = typeof document !== 'undefined' && document.documentElement?.classList.contains('is-native-app');
    
    if (isNative || hasNativePreview) {
        try {
            if (!hapticsModule) {
                hapticsModule = await import('@capacitor/haptics');
            }
            const { Haptics, ImpactStyle } = hapticsModule;
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (err) {
            console.error('[Haptics] Failed to trigger native haptic:', err);
            // Fallback to standard vibration if supported
            if (window.navigator?.vibrate) {
                window.navigator.vibrate(15);
            }
        }
    }
}
