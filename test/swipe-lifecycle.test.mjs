import assert from 'node:assert/strict';
import test from 'node:test';
import {
    completeVisualSwipe,
    createSwipeCompletionRegistry,
    getSwipeStackEntries,
    removeProfileById,
    resolveSwipeDirection,
    shouldCheckMutualLike,
    SWIPE_THRESHOLD,
    VELOCITY_THRESHOLD
} from '../src/utils/swipeLifecycle.js';

const profileA = { id: 'profile-a', full_name: 'A' };
const profileB = { id: 'profile-b', full_name: 'B' };
const profileC = { id: 'profile-c', full_name: 'C' };

test('drag below threshold resolves to no direction and leaves stack intact', () => {
    assert.equal(resolveSwipeDirection({ offsetX: 42, velocityX: 120 }), null);
    const stack = [profileA, profileB];
    assert.equal(removeProfileById(stack, null), stack);
});

test('drag above right threshold completes one like', async () => {
    const calls = [];
    const ref = { current: false };

    const result = await completeVisualSwipe({
        profile: profileA,
        direction: resolveSwipeDirection({ offsetX: 140, velocityX: 0 }),
        swipeInProgressRef: ref,
        animateExit: async () => calls.push('visual'),
        onVisualComplete: (direction, profile, type) => calls.push(`${direction}:${profile.id}:${type}`)
    });

    assert.equal(result.status, 'completed');
    assert.deepEqual(calls, ['visual', 'right:profile-a:standard']);
});

test('drag above left threshold completes one pass', async () => {
    const calls = [];
    const ref = { current: false };

    const result = await completeVisualSwipe({
        profile: profileA,
        direction: resolveSwipeDirection({ offsetX: -140, velocityX: 0 }),
        swipeInProgressRef: ref,
        animateExit: async () => calls.push('visual'),
        onVisualComplete: (direction, profile, type) => calls.push(`${direction}:${profile.id}:${type}`)
    });

    assert.equal(result.status, 'completed');
    assert.deepEqual(calls, ['visual', 'left:profile-a:standard']);
});

test('button like and pass use the same visual completion path', async () => {
    const calls = [];

    await completeVisualSwipe({
        profile: profileA,
        direction: 'right',
        source: 'button',
        swipeInProgressRef: { current: false },
        animateExit: async () => calls.push('button-like-visual'),
        onVisualComplete: direction => calls.push(direction)
    });

    await completeVisualSwipe({
        profile: profileB,
        direction: 'left',
        source: 'button',
        swipeInProgressRef: { current: false },
        animateExit: async () => calls.push('button-pass-visual'),
        onVisualComplete: direction => calls.push(direction)
    });

    assert.deepEqual(calls, ['button-like-visual', 'right', 'button-pass-visual', 'left']);
});

test('duplicate completion calls are ignored by the parent registry', () => {
    const registry = createSwipeCompletionRegistry();

    assert.equal(registry.completeOnce('profile-a', 'right', 'standard'), true);
    assert.equal(registry.completeOnce('profile-a', 'right', 'standard'), false);
    assert.equal(registry.size, 1);
});

test('card removal occurs once and preserves the next card identity', () => {
    const stack = [profileA, profileB, profileC];
    const once = removeProfileById(stack, 'profile-a');
    const twice = removeProfileById(once, 'profile-a');

    assert.deepEqual(once.map(profile => profile.id), ['profile-b', 'profile-c']);
    assert.equal(once[0], profileB);
    assert.equal(twice, once);
});

test('backend work starts after visual completion', async () => {
    const order = [];

    await completeVisualSwipe({
        profile: profileA,
        direction: 'right',
        swipeInProgressRef: { current: false },
        animateExit: async () => {
            order.push('visual-start');
            await Promise.resolve();
            order.push('visual-done');
        },
        onVisualComplete: () => order.push('backend-queued')
    });

    assert.deepEqual(order, ['visual-start', 'visual-done', 'backend-queued']);
});

test('pass cannot create a match while like may check for a match', () => {
    assert.equal(shouldCheckMutualLike('left'), false);
    assert.equal(shouldCheckMutualLike('right'), true);
});

test('like can create only one match path per profile and direction', () => {
    const registry = createSwipeCompletionRegistry();
    let matchCreates = 0;

    if (registry.completeOnce('profile-a', 'right', 'standard')) matchCreates += 1;
    if (registry.completeOnce('profile-a', 'right', 'standard')) matchCreates += 1;

    assert.equal(matchCreates, 1);
});

test('stable keys remain tied to profile IDs and only top card receives pointer input', () => {
    const entries = getSwipeStackEntries([profileA, profileB, profileC], 3);

    assert.deepEqual(entries.map(entry => entry.key), ['profile-c', 'profile-b', 'profile-a']);
    assert.deepEqual(entries.map(entry => entry.stackPosition), [2, 1, 0]);
    assert.deepEqual(entries.map(entry => entry.isTop), [false, false, true]);
    assert.deepEqual(entries.map(entry => entry.pointerEvents), ['none', 'none', 'auto']);
});

test('preflight denial releases the ref lock and does not complete the visual swipe', async () => {
    const calls = [];
    const ref = { current: false };

    const result = await completeVisualSwipe({
        profile: profileA,
        direction: 'right',
        swipeInProgressRef: ref,
        canStartSwipe: () => false,
        animateExit: async () => calls.push('visual'),
        onVisualComplete: () => calls.push('complete'),
        onCancel: (_profileId, reason) => calls.push(reason)
    });

    assert.equal(result.status, 'denied');
    assert.equal(ref.current, false);
    assert.deepEqual(calls, ['preflight-denied']);
});

test('calibrated swipe and velocity thresholds resolve correctly for 1:1 physics', () => {
    assert.equal(SWIPE_THRESHOLD, 85);
    assert.equal(VELOCITY_THRESHOLD, 320);

    // Below distance and below velocity -> null
    assert.equal(resolveSwipeDirection({ offsetX: 70, velocityX: 250 }), null);
    assert.equal(resolveSwipeDirection({ offsetX: -70, velocityX: -250 }), null);

    // Above distance threshold (85) -> resolves direction even with 0 velocity
    assert.equal(resolveSwipeDirection({ offsetX: 86, velocityX: 0 }), 'right');
    assert.equal(resolveSwipeDirection({ offsetX: -86, velocityX: 0 }), 'left');

    // Natural flick above velocity threshold (320) -> resolves even with moderate distance
    assert.equal(resolveSwipeDirection({ offsetX: 45, velocityX: 360 }), 'right');
    assert.equal(resolveSwipeDirection({ offsetX: -45, velocityX: -360 }), 'left');
});
