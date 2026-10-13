import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CONFESSIONS_JSX = fs.readFileSync(path.join(rootDir, 'src/pages/Confessions.jsx'), 'utf-8');
const INBOX_MODAL_JSX = fs.readFileSync(path.join(rootDir, 'src/components/AnonymousInboxModal.jsx'), 'utf-8');
const DRAWER_JSX = fs.readFileSync(path.join(rootDir, 'src/components/ConfessionDrawer.jsx'), 'utf-8');
const CONFESSION_SERVICE_JS = fs.readFileSync(path.join(rootDir, 'src/services/confessionService.js'), 'utf-8');

describe('Confessions Anonymous Q&A and Unique View Count Deduplication', () => {
  it('Confessions.jsx does not render raw ask url snippet on screen', () => {
    assert.strictEqual(
      CONFESSIONS_JSX.includes('ngl-url-snippet'),
      false,
      'Confessions.jsx should not contain ngl-url-snippet rendering raw url on screen'
    );
    assert.strictEqual(
      CONFESSIONS_JSX.includes('<span className="ngl-url-snippet">'),
      false,
      'Confessions.jsx should not render raw askUrl string under the headline'
    );
  });

  it('AnonymousInboxModal.jsx replaces raw url snippet with friendly subtext', () => {
    assert.strictEqual(
      INBOX_MODAL_JSX.includes('inbox-link-text'),
      false,
      'AnonymousInboxModal.jsx should not render raw url in inbox-link-text'
    );
    assert.strictEqual(
      INBOX_MODAL_JSX.includes('Share with friends to get questions'),
      true,
      'AnonymousInboxModal.jsx should render friendly helper text instead of raw url'
    );
  });

  it('ConfessionDrawer.jsx renders unique view count badge in thread footer', () => {
    assert.strictEqual(
      DRAWER_JSX.includes('post.viewCount || 0'),
      true,
      'ConfessionDrawer.jsx should display post view count in thread footer'
    );
  });

  it('confessionService.js enforces persistent per-user unique view tracking', () => {
    assert.ok(
      CONFESSION_SERVICE_JS.includes('tcd_viewed_confessions_${userId || \'guest\'}'),
      'Must use per-user persistent key in localStorage'
    );
    assert.ok(
      CONFESSION_SERVICE_JS.includes('getStoredViewedConfessions'),
      'Must define getStoredViewedConfessions helper'
    );
    assert.ok(
      CONFESSION_SERVICE_JS.includes('markConfessionViewedInStorage'),
      'Must define markConfessionViewedInStorage helper'
    );
    assert.ok(
      CONFESSION_SERVICE_JS.includes('increment_confession_view'),
      'Must call increment_confession_view RPC only on fresh views'
    );
    assert.ok(
      CONFESSION_SERVICE_JS.includes('if (storedSet.has(confessionId))'),
      'Must guard against previously stored views to prevent artificial inflation'
    );
  });
});

describe('Universal Profile Photo Cache-Busting and Timestamp Synchronization', () => {
  it('registerProfilePhotoTimestamp updates photo timestamp and getFreshAvatarUrl appends cache-buster', async () => {
    const {
      registerProfilePhotoTimestamp,
      getFreshAvatarUrl,
      getAvatarUrl,
    } = await import('../src/utils/profileData.js');

    const rawUrl = 'https://supabase.co/storage/v1/object/public/avatars/user-999.jpg';
    const profile = {
      id: 'user-999',
      avatar_url: rawUrl,
      avatar_updated_at: 1700000000000,
    };

    const freshUrl1 = getFreshAvatarUrl(rawUrl, profile);
    assert.ok(freshUrl1.includes('t=1700000000000'), 'Should contain profile timestamp query parameter');

    // User updates their avatar
    const newTimestamp = 1700000055555;
    registerProfilePhotoTimestamp('user-999', newTimestamp);

    const freshUrl2 = getFreshAvatarUrl(rawUrl, { id: 'user-999' });
    assert.ok(
      freshUrl2.includes(`t=${newTimestamp}`),
      'getFreshAvatarUrl should reflect registered timestamp'
    );

    const standardAvatarUrl = getAvatarUrl({ id: 'user-999', avatar_url: rawUrl });
    assert.ok(
      standardAvatarUrl.includes(`t=${newTimestamp}`),
      'getAvatarUrl should automatically inject registered timestamp'
    );
  });

  it('getFreshAvatarUrl strips older timestamp parameters before appending freshest timestamp', async () => {
    const { getFreshAvatarUrl } = await import('../src/utils/profileData.js');

    const staleUrl = 'https://supabase.co/storage/v1/object/public/avatars/user-123.jpg?t=1600000000000';
    const freshUrl = getFreshAvatarUrl(staleUrl, 1700000099999);

    assert.ok(!freshUrl.includes('1600000000000'), 'Old timestamp parameter should be stripped');
    assert.ok(freshUrl.includes('t=1700000099999'), 'Newest timestamp parameter should be present');
  });
});
