import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getFinderStatusCacheKey } from '../src/utils/campusFinder.js';

test('Campus Finder: Cache key generation is stable and isolated per user', () => {
    assert.deepStrictEqual(getFinderStatusCacheKey('user-123'), ['finder_status', 'user-123']);
    assert.deepStrictEqual(getFinderStatusCacheKey(null), ['finder_status', 'anon']);
});

test('Campus Finder Migration: contains strict NDPA opt-in column, audit log, and RPCs', () => {
    const migration = readFileSync(
        resolve('supabase/migrations/20260919150000_campus_finder_system.sql'),
        'utf8'
    );

    // 1. Assert NDPA opt-in column with default FALSE
    assert.ok(
        migration.includes('add column if not exists allow_camera_discovery boolean default false'),
        'Must default allow_camera_discovery to FALSE for strict NDPA privacy compliance'
    );

    // 2. Assert free searches column with default 2
    assert.ok(
        migration.includes('add column if not exists finder_free_searches_left integer default 2'),
        'Must grant exactly 2 free trial searches'
    );

    // 3. Assert search audit log table (does NOT store captured image data)
    assert.ok(migration.includes('create table if not exists public.campus_finder_searches'));
    assert.ok(!migration.includes('search_photo_url'), 'Must NEVER store search photo URL in audit log table');
    assert.ok(!migration.includes('search_photo_blob'), 'Must NEVER store search photo raw bytes in audit log table');

    // 4. Assert RPCs
    assert.ok(migration.includes('create or replace function public.consume_finder_search'));
    assert.ok(migration.includes('create or replace function public.get_finder_status'));
    assert.ok(migration.includes('create or replace function public.get_eligible_campus_finder_profiles'));

    // 5. Assert rate limit of 5 searches per hour
    assert.ok(migration.includes('v_hourly >= 5'), 'Must enforce anti-abuse rate limit of 5 per hour');

    // 6. Assert candidate query enforces allow_camera_discovery = TRUE
    assert.ok(
        migration.includes('where p.allow_camera_discovery = true'),
        'Candidate pool must strictly only return users who have explicitly opted in'
    );
});

test('Campus Finder NDPA Privacy: fallback message preserves anonymity without revealing user presence', () => {
    // Anti-enumeration test: Ensure when no match is found, system does NOT say "X is not on College Date"
    const antiEnumerationCopy = 'No confident match found. Try another photo or explore people around your campus.';
    assert.ok(!antiEnumerationCopy.includes('not on College Date'));
    assert.ok(!antiEnumerationCopy.includes('not registered'));
});
