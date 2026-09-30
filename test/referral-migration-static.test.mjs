import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
    resolve('supabase/migrations/20260725130000_secure_referral_code_flow.sql'),
    'utf8'
).toLowerCase();

test('referral migration exposes validation without allowing anonymous application', () => {
    assert.match(migration, /create or replace function public\.validate_referral_code/);
    assert.match(migration, /create or replace function public\.apply_referral_code/);
    assert.match(migration, /grant execute on function public\.validate_referral_code\(text\) to anon, authenticated/);
    assert.match(migration, /grant execute on function public\.apply_referral_code\(text\) to authenticated/);
});

test('referral migration is server-authoritative and idempotent', () => {
    assert.match(migration, /auth\.uid\(\)/);
    assert.match(migration, /for update/);
    assert.match(migration, /on conflict \(referred_id\) do nothing/);
    assert.match(migration, /profiles_no_self_referral/);
    assert.match(migration, /referrals_no_self_referral/);
    assert.match(migration, /referrals_referred_id_unique/);
    assert.match(migration, /profiles_referral_code_lower_unique/);
});

test('referral migration rejects inactive referrers and preserves the existing reward trigger path', () => {
    assert.match(migration, /is_banned/);
    assert.match(migration, /is_shadow_banned/);
    assert.match(migration, /create trigger tr_sync_referral/);
    assert.match(migration, /insert into public\.referrals/);
});
