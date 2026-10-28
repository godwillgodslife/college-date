export const SWIPE_THRESHOLD = 85;
export const VELOCITY_THRESHOLD = 320;
export const MIN_EXIT_DISTANCE = 520;
export const MIN_FLICK_OFFSET = 28;

export function resolveSwipeDirection({
    offsetX = 0,
    velocityX = 0,
    offsetY = 0,
    velocityY = 0,
    threshold = SWIPE_THRESHOLD,
    velocityThreshold = VELOCITY_THRESHOLD,
    minFlickOffset = MIN_FLICK_OFFSET
} = {}) {
    if (offsetX > threshold) return 'right';
    if (offsetX < -threshold) return 'left';

    const horizontalDominant = Math.abs(velocityX) >= Math.abs(velocityY);
    if (horizontalDominant && offsetX >= minFlickOffset && velocityX > velocityThreshold) return 'right';
    if (horizontalDominant && offsetX <= -minFlickOffset && velocityX < -velocityThreshold) return 'left';
    return null;
}

export function getSwipeExitTarget(direction, viewportWidth = 0, minDistance = MIN_EXIT_DISTANCE) {
    const safeWidth = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : minDistance;
    const distance = Math.max(minDistance, safeWidth * 1.35);
    return direction === 'right' ? distance : -distance;
}

export function getSwipeCompletionKey(profileId, direction, type = 'standard') {
    return `${profileId}:${direction}:${type}`;
}

export function shouldCheckMutualLike(direction) {
    return direction === 'right';
}

export function removeProfileById(profiles, profileId) {
    if (!profileId || !Array.isArray(profiles)) return profiles;
    if (!profiles.some(profile => profile?.id === profileId)) return profiles;
    return profiles.filter(profile => profile?.id !== profileId);
}

export function getSwipeStackEntries(profiles, limit = 3) {
    const visible = Array.isArray(profiles) ? profiles.slice(0, limit) : [];
    return [...visible].reverse().map((profile, index, stack) => {
        const stackPosition = stack.length - 1 - index;
        const isTop = stackPosition === 0;
        return {
            profile,
            key: profile?.id,
            isTop,
            stackPosition,
            pointerEvents: isTop ? 'auto' : 'none'
        };
    });
}

export function createSwipeCompletionRegistry() {
    const completed = new Set();

    return {
        completeOnce(profileId, direction, type = 'standard') {
            const key = getSwipeCompletionKey(profileId, direction, type);
            if (completed.has(key)) return false;
            completed.add(key);
            return true;
        },
        has(profileId, direction, type = 'standard') {
            return completed.has(getSwipeCompletionKey(profileId, direction, type));
        },
        get size() {
            return completed.size;
        }
    };
}

export async function completeVisualSwipe({
    profile,
    direction,
    type = 'standard',
    source = 'drag',
    velocityX = 0,
    swipeInProgressRef,
    canStartSwipe,
    animateExit,
    onVisualComplete,
    onCancel,
    getViewportWidth = () => (typeof window !== 'undefined' ? window.innerWidth : MIN_EXIT_DISTANCE)
} = {}) {
    if (!profile?.id || !direction || !swipeInProgressRef || swipeInProgressRef.current) {
        return { status: 'ignored' };
    }

    swipeInProgressRef.current = true;

    let allowed = true;
    try {
        const preflightResult = canStartSwipe?.(direction, type, profile);
        allowed = (preflightResult && typeof preflightResult.then === 'function')
            ? await preflightResult
            : preflightResult;
    } catch (error) {
        swipeInProgressRef.current = false;
        onCancel?.(profile.id, 'preflight-error');
        return { status: 'denied', error };
    }

    if (allowed === false) {
        swipeInProgressRef.current = false;
        onCancel?.(profile.id, 'preflight-denied');
        return { status: 'denied' };
    }

    const targetX = getSwipeExitTarget(direction, getViewportWidth());

    try {
        await animateExit(targetX, direction, type, source, velocityX);
        onVisualComplete?.(direction, profile, type);
        return { status: 'completed', targetX };
    } catch (error) {
        swipeInProgressRef.current = false;
        onCancel?.(profile.id, 'animation-error');
        return { status: 'cancelled', error };
    }
}
