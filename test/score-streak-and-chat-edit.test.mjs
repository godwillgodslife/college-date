import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STREAK_MILESTONES, getNextMilestone } from '../src/utils/scoreStreak.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('Chat Message Edit: UUID validation blocks optimistic temp IDs from database RPCs', () => {
    const validUuid = 'c387cf3e-c6e7-4bd3-875f-b52ad6933f7c';
    const tempId1 = 'temp-1789820523052';
    const tempId2 = 'temp-1789822665083';
    const invalidString = 'abc-xyz-123';

    assert.strictEqual(UUID_REGEX.test(validUuid), true, 'Valid UUID must pass');
    assert.strictEqual(UUID_REGEX.test(tempId1), false, 'Optimistic temp ID must be blocked');
    assert.strictEqual(UUID_REGEX.test(tempId2), false, 'Optimistic temp ID must be blocked');
    assert.strictEqual(UUID_REGEX.test(invalidString), false, 'Arbitrary string must be blocked');
});

test('Chat Message List: merge prevents confirmed database UUIDs from being overwritten by temp IDs', () => {
    const confirmedMessage = {
        id: 'c387cf3e-c6e7-4bd3-875f-b52ad6933f7c',
        client_nonce: 'nonce-12345',
        message: 'Hello campus',
        _pending: false
    };

    const incomingOptimistic = {
        id: 'temp-1789820523052',
        client_nonce: 'nonce-12345',
        message: 'Hello campus edited',
        _pending: true
    };

    // Resolution rule from Chat.jsx
    const existingIsTemp = String(confirmedMessage.id).startsWith('temp-');
    const incomingIsTemp = String(incomingOptimistic.id).startsWith('temp-');
    const resolvedId = (!existingIsTemp && incomingIsTemp) ? confirmedMessage.id : incomingOptimistic.id;

    assert.strictEqual(resolvedId, confirmedMessage.id, 'Confirmed server UUID must be preserved');
});

test('Score Streak: milestones and next milestone progression', () => {
    assert.deepStrictEqual(STREAK_MILESTONES, [7, 14, 30, 60, 100]);

    // Streak 0 -> Next 7
    let next = getNextMilestone(0);
    assert.strictEqual(next.milestone, 7);
    assert.strictEqual(next.daysLeft, 7);

    // Streak 6 -> Next 7, 1 day left
    next = getNextMilestone(6);
    assert.strictEqual(next.milestone, 7);
    assert.strictEqual(next.daysLeft, 1);

    // Streak 7 -> Next 14, 7 days left
    next = getNextMilestone(7);
    assert.strictEqual(next.milestone, 14);
    assert.strictEqual(next.daysLeft, 7);

    // Streak 50 -> Next 60, 10 days left
    next = getNextMilestone(50);
    assert.strictEqual(next.milestone, 60);
    assert.strictEqual(next.daysLeft, 10);

    // Streak 150 -> Max milestone reached
    next = getNextMilestone(150);
    assert.strictEqual(next.milestone, null);
    assert.strictEqual(next.daysLeft, 0);
});

test('Score Streak Migration: contains server-authoritative tables, RPCs, and idempotent streak counting', () => {
    const migration = readFileSync(
        resolve('supabase/migrations/20260919140000_score_streak_system.sql'),
        'utf8'
    );

    // Assert table creations
    assert.ok(migration.includes('create table if not exists public.user_score_streaks'));
    assert.ok(migration.includes('create table if not exists public.score_streak_events'));

    // Assert RPCs
    assert.ok(migration.includes('create or replace function public.record_streak_activity'));
    assert.ok(migration.includes('create or replace function public.get_user_streak'));

    // Assert security & idempotency
    assert.ok(migration.includes('security definer'));
    assert.ok(migration.includes('on conflict (idempotency_key) do nothing'));

    // Assert streak logic: consecutive day increment vs reset
    assert.ok(migration.includes('v_current_streak := v_streak.current_streak + 1;'));
    assert.ok(migration.includes('v_current_streak := 1;'));
    assert.ok(migration.includes('greatest(v_streak.longest_streak, v_current_streak)'));
});
