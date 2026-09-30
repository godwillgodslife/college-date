import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    OFFICIAL_CATEGORIES,
    FALLBACK_OFFICIAL_POSTS,
    VALID_ACTION_DEEP_LINKS,
    isValidDeepLink,
} from '../src/services/officialService.js';

test('Official Service: categories contain all core pillars', () => {
    const ids = OFFICIAL_CATEGORIES.map(c => c.id);
    assert.ok(ids.includes('all'));
    assert.ok(ids.includes('getting_started'));
    assert.ok(ids.includes('swiping'));
    assert.ok(ids.includes('requests'));
    assert.ok(ids.includes('chat'));
    assert.ok(ids.includes('premium'));
    assert.ok(ids.includes('wallet'));
    assert.ok(ids.includes('confessions'));
    assert.strictEqual(ids.length, 8);
});

test('Official Service: fallback posts contain 6 verified tutorials matching reality', () => {
    assert.strictEqual(FALLBACK_OFFICIAL_POSTS.length, 6);

    for (const post of FALLBACK_OFFICIAL_POSTS) {
        assert.ok(post.id, 'Post must have a valid id');
        assert.strictEqual(post.post_type, 'tutorial');
        assert.ok(post.title && post.title.length > 5, 'Post must have descriptive title');
        assert.ok(post.caption && post.caption.length > 20, 'Post must have educational caption');
        assert.ok(post.thumbnail_url, 'Post must have thumbnail poster');
        assert.strictEqual(post.aspect_ratio, '9:16');
        assert.ok(post.duration_seconds > 0, 'Duration must be positive integer');
        assert.ok(post.action_label, 'Action label must be present');
        assert.ok(post.action_deep_link, 'Action deep link must be present');
        assert.ok(isValidDeepLink(post.action_deep_link), `Deep link ${post.action_deep_link} must be valid`);
    }
});

test('Official Service: deep link validation blocks external or malicious protocols', () => {
    assert.strictEqual(isValidDeepLink('/match'), true);
    assert.strictEqual(isValidDeepLink('/requests'), true);
    assert.strictEqual(isValidDeepLink('/chat'), true);
    assert.strictEqual(isValidDeepLink('/premium'), true);
    assert.strictEqual(isValidDeepLink('/wallet'), true);
    assert.strictEqual(isValidDeepLink('/confessions'), true);

    // Malicious or unwhitelisted
    assert.strictEqual(isValidDeepLink('https://evil.com/phish'), false);
    assert.strictEqual(isValidDeepLink('javascript:alert(1)'), false);
    assert.strictEqual(isValidDeepLink('/admin/secret'), false);
    assert.strictEqual(isValidDeepLink(''), false);
    assert.strictEqual(isValidDeepLink(null), false);
});

test('Official Database Migration: contains table, RLS policies, RPCs, and indexes', () => {
    const migration = readFileSync(
        resolve('supabase/migrations/20260919100000_official_the_college_date_system.sql'),
        'utf8'
    ).toLowerCase();

    // Table definition
    assert.match(migration, /create table if not exists public\.official_posts/);
    assert.match(migration, /aspect_ratio text default '9:16'/);
    assert.match(migration, /is_pinned boolean default false/);
    assert.match(migration, /view_count integer default 0/);

    // Indices
    assert.match(migration, /idx_official_posts_listing/);
    assert.match(migration, /idx_official_posts_category/);

    // RLS & security
    assert.match(migration, /alter table public\.official_posts enable row level security/);
    assert.match(migration, /official posts are viewable by anyone/);
    assert.match(migration, /admins can insert official posts/);
    assert.match(migration, /admins can update official posts/);
    assert.match(migration, /admins can delete official posts/);

    // Bucket
    assert.match(migration, /official-media/);

    // RPCs
    assert.match(migration, /create or replace function public\.get_official_posts/);
    assert.match(migration, /create or replace function public\.increment_official_post_view/);
    assert.match(migration, /security definer/);
    assert.match(migration, /grant execute on function public\.get_official_posts/);
    assert.match(migration, /grant execute on function public\.increment_official_post_view/);
});
