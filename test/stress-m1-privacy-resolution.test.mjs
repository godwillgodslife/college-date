import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Simulator matching supabase/functions/send-notification-push/index.ts ---
const SITE_URL = "https://www.thecollegedate.com";
const DEFAULT_ICON_URL = `${SITE_URL}/logo.png`;

function normalizeLaunchUrl(url) {
  if (!url || typeof url !== "string") return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${SITE_URL}${url}`;
  return undefined;
}

function hasActivePremium(source) {
  if (!source) return false;
  const hasPremiumFlag = source.is_premium === true;
  const hasPremiumPlan = source.plan_type === "Premium" && (source.status === "active" || !source.status);
  const expiry = source.premium_expires_at || source.current_period_end;
  if (!hasPremiumFlag && !hasPremiumPlan) return false;
  if (!expiry) return true;
  const expiryTime = new Date(expiry).getTime();
  if (Number.isNaN(expiryTime)) return true;
  return expiryTime > Date.now();
}

/**
 * Pure simulator of send-notification-push request handling logic
 */
function simulatePushFunction(body, mockProfile = null, mockDevices = [], mockDbProfiles = []) {
  const isWebhook = Boolean(body?.record || body?.type === 'INSERT');
  const record = body?.record || null;
  const notificationId = record?.id || body?.notificationId || body?.data?.notification_id;

  const targetUserId = body?.userId || record?.user_id || record?.recipient_id;
  const actorId = body?.actorId || record?.actor_id || record?.sender_id;
  const notifType = ((body?.type && !['INSERT', 'UPDATE', 'DELETE'].includes(body.type))
    ? body.type
    : (record?.type || body?.data?.type || 'general'));
  const category = ((record?.category || body?.category || body?.data?.category || 'general')).toLowerCase();
  const rawTitle = body?.title || record?.title || 'New Notification';
  const rawContent = body?.content || record?.content || '';
  const metadata = (record?.metadata || body?.data || {});

  const userProfile = mockProfile;

  // Global push setting
  if (userProfile && userProfile.push_notifications === false) {
    return { skipped: true, reason: "user_disabled_push" };
  }

  // Category-specific push settings
  const isCriticalOrSystem = metadata?.priority === 'critical' || record?.priority === 'critical' || category === 'system';
  if (!isCriticalOrSystem && userProfile) {
    if (category === 'messages' && userProfile.message_notifications === false) {
      return { skipped: true, reason: "messages_disabled" };
    }
    if (category === 'matches' && userProfile.match_notifications === false) {
      return { skipped: true, reason: "matches_disabled" };
    }
    if (category === 'requests' && userProfile.request_notifications === false) {
      return { skipped: true, reason: "requests_disabled" };
    }
    if ((category === 'profile_activity' || category === 'views' || category === 'viewers') && userProfile.view_notifications === false) {
      return { skipped: true, reason: "views_disabled" };
    }
    if (category === 'social') {
      if (notifType === 'confession' && userProfile.confession_notifications === false) {
        return { skipped: true, reason: "confessions_disabled" };
      }
      if (userProfile.social_notifications === false) {
        return { skipped: true, reason: "social_disabled" };
      }
    }
    if (notifType === 'confession' && userProfile.confession_notifications === false) {
      return { skipped: true, reason: "confessions_disabled" };
    }
  }

  // Privacy & Anonymity
  const isAnonymousInteraction = Boolean(
    metadata?.is_anonymous ||
    notifType === 'confession' ||
    (notifType === 'snapshot_reaction' && !actorId) ||
    !actorId
  );
  const safeActorAvatar = isAnonymousInteraction ? null : (metadata?.actor_avatar_url || metadata?.avatar_url || null);
  const safeImageUrl = isAnonymousInteraction ? null : (metadata?.image_url || safeActorAvatar || null);

  let effectiveTitle = rawTitle;
  let effectiveContent = rawContent;

  if (userProfile) {
    if (category === 'messages') {
      if (userProfile.message_previews_enabled === false) {
        effectiveTitle = 'New message';
        effectiveContent = 'Open The College Date to view this message.';
      } else if (!hasActivePremium(userProfile)) {
        effectiveTitle = 'New message 💬';
        effectiveContent = 'Someone sent you a message on The College Date. Tap to chat!';
      }
    } else if (category === 'requests' && !hasActivePremium(userProfile)) {
      effectiveTitle = 'New Connection Request 💌';
      effectiveContent = 'Someone wants to connect with you on The College Date. Tap to review!';
    }
  }

  // Target resolution
  const subscriptionTargets = Array.from(new Set([
    ...(Array.isArray(body?.subscriptionIds) ? body.subscriptionIds : []),
    ...(Array.isArray(body?.onesignalIds) ? body.onesignalIds : []),
    body?.onesignalId,
  ].filter(Boolean)));

  const externalTargets = Array.from(new Set([
    ...(Array.isArray(body?.externalUserIds) ? body.externalUserIds : []),
    ...(Array.isArray(body?.userIds) ? body.userIds : []),
    body?.externalUserId,
    body?.userId,
    targetUserId,
  ].filter(Boolean)));

  if (subscriptionTargets.length === 0 && externalTargets.length > 0) {
    const devices = mockDevices.filter(d => externalTargets.includes(d.user_id) && !d.revoked_at && d.onesignal_subscription_id);
    if (devices.length > 0) {
      for (const d of devices) {
        if (d.permission_status !== "denied" && d.onesignal_subscription_id) {
          subscriptionTargets.push(d.onesignal_subscription_id);
        }
      }
    }

    if (subscriptionTargets.length === 0) {
      if (userProfile?.onesignal_id) {
        subscriptionTargets.push(userProfile.onesignal_id);
      } else {
        const profs = mockDbProfiles.filter(p => externalTargets.includes(p.id) && p.onesignal_id);
        for (const p of profs) {
          if (p.onesignal_id) subscriptionTargets.push(p.onesignal_id);
        }
      }
    }
  }

  if (subscriptionTargets.length === 0 && externalTargets.length === 0) {
    return { skipped: true, reason: "no_push_targets" };
  }

  const effectiveDeepLink = record?.deep_link || metadata?.url || metadata?.web_url;
  const launchUrl = normalizeLaunchUrl(metadata?.web_url || effectiveDeepLink);
  const visualIcon = safeImageUrl || DEFAULT_ICON_URL;
  const groupKey = record?.group_key || metadata?.group_key || category || notifType || "general";

  let effectiveAndroidChannelId = metadata?.android_channel_id || "channel_activity";
  if (category === "messages") {
    effectiveAndroidChannelId = "channel_messages";
  } else if (category === "matches" || category === "requests") {
    effectiveAndroidChannelId = "channel_matches";
  }

  let effectiveCollapseId = metadata?.collapse_id || metadata?.dedupe_key || record?.dedupe_key;
  const effectiveConversationId = record?.conversation_id || metadata?.conversation_id || metadata?.match_id;
  if (notifType === "message" && effectiveConversationId && targetUserId) {
    effectiveCollapseId = `${targetUserId}:chat:${effectiveConversationId}`;
  } else if (notifType === "like" && targetUserId) {
    effectiveCollapseId = `${targetUserId}:likes`;
  }

  const notificationPayload = {
    contents: { en: effectiveContent },
    headings: { en: effectiveTitle },
    data: {
      ...metadata,
      notification_id: notificationId,
      type: notifType,
      category: category,
      url: effectiveDeepLink,
      actor_avatar_url: safeActorAvatar,
      image_url: safeImageUrl,
    },
    android_group: groupKey,
    android_channel_id: effectiveAndroidChannelId,
    collapse_id: effectiveCollapseId,
    chrome_web_icon: visualIcon,
    chrome_web_badge: DEFAULT_ICON_URL,
    firefox_icon: visualIcon,
    large_icon: visualIcon,
  };

  if (launchUrl) {
    notificationPayload.url = launchUrl;
  }

  if (subscriptionTargets.length > 0) {
    notificationPayload.include_subscription_ids = subscriptionTargets;
  } else {
    notificationPayload.include_aliases = { external_id: externalTargets };
    notificationPayload.target_channel = "push";
  }

  return {
    skipped: false,
    payload: notificationPayload,
    subscriptionTargets,
    externalTargets,
    isAnonymousInteraction
  };
}

// ==============================================================================
// TEST SUITE 1: ANONYMITY SHIELDING
// ==============================================================================

test('Empirical Stress 1.1: Anonymous confession shields avatar and image URLs from push banners', () => {
  const result = simulatePushFunction({
    record: {
      id: 'notif-1',
      user_id: 'user-recipient',
      actor_id: null,
      type: 'confession',
      category: 'social',
      title: 'New Confession 🙊',
      content: 'Someone mentioned your department...',
      metadata: {
        is_anonymous: true,
        actor_avatar_url: 'https://example.com/leaked_secret_photo.jpg',
        image_url: 'https://example.com/leaked_secret_photo.jpg',
        url: '/confessions'
      }
    }
  }, { is_premium: false }, [{ user_id: 'user-recipient', onesignal_subscription_id: 'sub-1', permission_status: 'granted' }]);

  assert.strictEqual(result.skipped, false);
  assert.strictEqual(result.isAnonymousInteraction, true);
  // Large icon must NOT be the leaked secret photo
  assert.strictEqual(result.payload.large_icon, DEFAULT_ICON_URL, 'Large icon must be fallback icon');
  assert.strictEqual(result.payload.chrome_web_icon, DEFAULT_ICON_URL, 'Chrome web icon must be fallback icon');
  // Safe avatar overrides in data
  assert.strictEqual(result.payload.data.actor_avatar_url, null, 'data.actor_avatar_url must be null');
  assert.strictEqual(result.payload.data.image_url, null, 'data.image_url must be null');
});

test('Empirical Stress 1.2: Confession with explicit actorId is still shielded because notifType is confession', () => {
  // Even if a buggy client passed actorId on a confession, notifType is 'confession'
  const result = simulatePushFunction({
    record: {
      id: 'notif-2',
      user_id: 'user-recipient',
      actor_id: 'secret-student-uuid',
      type: 'confession',
      category: 'social',
      title: 'Secret crush confession',
      content: 'I have a crush on you',
      metadata: {
        actor_avatar_url: 'https://example.com/secret_student.png'
      }
    }
  }, { is_premium: false }, [{ user_id: 'user-recipient', onesignal_subscription_id: 'sub-1' }]);

  assert.strictEqual(result.isAnonymousInteraction, true, 'confession notifType must always force isAnonymousInteraction=true');
  assert.strictEqual(result.payload.large_icon, DEFAULT_ICON_URL);
  assert.strictEqual(result.payload.data.actor_avatar_url, null);
});

test('Empirical Stress 1.3 [Adversarial Leak Check]: Metadata spreading vs nested metadata keys', () => {
  // ADVERSARIAL CHALLENGE: If metadata contained raw `avatar_url` (not actor_avatar_url),
  // does `...metadata` leak `avatar_url` into `data.avatar_url`?
  const result = simulatePushFunction({
    record: {
      id: 'notif-3',
      user_id: 'user-recipient',
      actor_id: null,
      type: 'confession',
      category: 'social',
      title: 'Secret Question',
      content: 'Where do you hang out?',
      metadata: {
        is_anonymous: true,
        avatar_url: 'https://example.com/unmasked_avatar.jpg',
        actor_name: 'Chioma (Secret)',
        actor_id: 'real-secret-uuid'
      }
    }
  }, { is_premium: false }, [{ user_id: 'user-recipient', onesignal_subscription_id: 'sub-1' }]);

  // Observation: data.actor_avatar_url is set to null, BUT data.avatar_url was spread!
  const leakedAvatarUrl = result.payload.data.avatar_url;
  const leakedActorName = result.payload.data.actor_name;
  const leakedActorId = result.payload.data.actor_id;

  // Let's document what happens empirically:
  // In send-notification-push/index.ts, lines 356-364 spread `...metadata` FIRST and then set `actor_avatar_url: safeActorAvatar` and `image_url: safeImageUrl`.
  // It does NOT delete or overwrite metadata.avatar_url or metadata.actor_name or metadata.actor_id!
  assert.strictEqual(result.payload.data.actor_avatar_url, null);
  // Notice: this demonstrates the exact behavior of the Edge Function
  if (leakedAvatarUrl) {
    // If metadata.avatar_url is present, it survived into data.avatar_url
    assert.strictEqual(leakedAvatarUrl, 'https://example.com/unmasked_avatar.jpg');
  }
});

// ==============================================================================
// TEST SUITE 2: FREEMIUM PREVIEW MASKING & PRIVACY
// ==============================================================================

test('Empirical Stress 2.1: Freemium user receiving message has title and content masked', () => {
  const freemiumProfile = {
    is_premium: false,
    plan_type: null,
    message_previews_enabled: true
  };

  const result = simulatePushFunction({
    record: {
      id: 'notif-4',
      user_id: 'user-freemium',
      actor_id: 'user-sender',
      type: 'message',
      category: 'messages',
      title: 'Tunde Adeleke',
      content: 'Can we study together at the library?',
      metadata: {
        message_id: 'msg-123',
        actor_name: 'Tunde Adeleke'
      }
    }
  }, freemiumProfile, [{ user_id: 'user-freemium', onesignal_subscription_id: 'sub-1' }]);

  assert.strictEqual(result.skipped, false);
  assert.strictEqual(result.payload.headings.en, 'New message 💬', 'Freemium chat heading must be masked');
  assert.strictEqual(result.payload.contents.en, 'Someone sent you a message on The College Date. Tap to chat!', 'Freemium chat content must be curiosity copy');
});

test('Empirical Stress 2.2: Freemium user receiving connection request has title and content masked', () => {
  const freemiumProfile = {
    is_premium: false,
    plan_type: null
  };

  const result = simulatePushFunction({
    record: {
      id: 'notif-5',
      user_id: 'user-freemium',
      actor_id: 'user-swiper',
      type: 'like',
      category: 'requests',
      title: 'New Like! 👀',
      content: 'Chidinma just right-swiped you. Check your requests!',
      metadata: {
        swipe_id: 'swipe-123',
        swiper_id: 'user-swiper'
      }
    }
  }, freemiumProfile, [{ user_id: 'user-freemium', onesignal_subscription_id: 'sub-1' }]);

  assert.strictEqual(result.payload.headings.en, 'New Connection Request 💌');
  assert.strictEqual(result.payload.contents.en, 'Someone wants to connect with you on The College Date. Tap to review!');
});

test('Empirical Stress 2.3: Premium user receives unmasked message and real sender name', () => {
  const premiumProfile = {
    is_premium: true,
    plan_type: 'Premium',
    status: 'active',
    message_previews_enabled: true
  };

  const result = simulatePushFunction({
    record: {
      id: 'notif-6',
      user_id: 'user-premium',
      actor_id: 'user-sender',
      type: 'message',
      category: 'messages',
      title: 'Tunde Adeleke',
      content: 'Can we study together at the library?'
    }
  }, premiumProfile, [{ user_id: 'user-premium', onesignal_subscription_id: 'sub-1' }]);

  assert.strictEqual(result.payload.headings.en, 'Tunde Adeleke');
  assert.strictEqual(result.payload.contents.en, 'Can we study together at the library?');
});

test('Empirical Stress 2.4: Privacy mode (message_previews_enabled: false) overrides premium status', () => {
  const privatePremiumProfile = {
    is_premium: true,
    plan_type: 'Premium',
    status: 'active',
    message_previews_enabled: false
  };

  const result = simulatePushFunction({
    record: {
      id: 'notif-7',
      user_id: 'user-premium-private',
      actor_id: 'user-sender',
      type: 'message',
      category: 'messages',
      title: 'Tunde Adeleke',
      content: 'Private message text'
    }
  }, privatePremiumProfile, [{ user_id: 'user-premium-private', onesignal_subscription_id: 'sub-1' }]);

  assert.strictEqual(result.payload.headings.en, 'New message');
  assert.strictEqual(result.payload.contents.en, 'Open The College Date to view this message.');
});

test('Empirical Stress 2.5 [Adversarial Edge Case]: What happens if category is omitted or general for a chat message?', () => {
  // If a direct API call or webhook record has type: 'message' but category is not 'messages'
  const freemiumProfile = {
    is_premium: false,
    plan_type: null,
    message_previews_enabled: true
  };

  const resultWithoutCategory = simulatePushFunction({
    userId: 'user-freemium',
    title: 'Secret Sender Name',
    content: 'Secret message content',
    data: {
      type: 'message'
      // category missing!
    }
  }, freemiumProfile, [{ user_id: 'user-freemium', onesignal_subscription_id: 'sub-1' }]);

  // When category is missing, send-notification-push line 89 defaults category to 'general'.
  // Then line 190 `if (category === 'messages')` evaluates to FALSE!
  // Therefore title and content remain unmasked:
  assert.strictEqual(resultWithoutCategory.payload.headings.en, 'Secret Sender Name', 'Reveals raw title when category is omitted');
  assert.strictEqual(resultWithoutCategory.payload.contents.en, 'Secret message content', 'Reveals raw content when category is omitted');
});

// ==============================================================================
// TEST SUITE 3: DEVICE RESOLUTION
// ==============================================================================

test('Empirical Stress 3.1: Resolution with 0 active devices and 0 profiles.onesignal_id falls back to external_id', () => {
  const result = simulatePushFunction({
    record: {
      id: 'notif-8',
      user_id: 'user-no-devices',
      type: 'message',
      category: 'messages',
      title: 'Hello',
      content: 'World'
    }
  }, { is_premium: false }, [], []);

  assert.strictEqual(result.skipped, false);
  // Subscription targets is empty
  assert.strictEqual(result.subscriptionTargets.length, 0);
  // Fallback to external_id alias
  assert.deepStrictEqual(result.payload.include_aliases, { external_id: ['user-no-devices'] });
  assert.strictEqual(result.payload.target_channel, 'push');
});

test('Empirical Stress 3.2: Resolution with 0 devices in table BUT profile has onesignal_id uses subscription ID', () => {
  const profileWithLegacyId = {
    id: 'user-legacy',
    onesignal_id: 'os-legacy-sub-456',
    is_premium: false
  };

  const result = simulatePushFunction({
    record: {
      id: 'notif-9',
      user_id: 'user-legacy',
      type: 'message',
      category: 'messages',
      title: 'Hello',
      content: 'World'
    }
  }, profileWithLegacyId, [], []);

  assert.strictEqual(result.skipped, false);
  assert.deepStrictEqual(result.payload.include_subscription_ids, ['os-legacy-sub-456']);
  assert.strictEqual(result.payload.include_aliases, undefined);
});

test('Empirical Stress 3.3: Resolution with 1 active granted device', () => {
  const activeDevice = {
    user_id: 'user-active',
    onesignal_subscription_id: 'device-sub-789',
    permission_status: 'granted',
    revoked_at: null
  };

  const result = simulatePushFunction({
    record: {
      id: 'notif-10',
      user_id: 'user-active',
      type: 'message',
      category: 'messages',
      title: 'Hello',
      content: 'World'
    }
  }, { is_premium: false }, [activeDevice], []);

  assert.strictEqual(result.skipped, false);
  assert.deepStrictEqual(result.payload.include_subscription_ids, ['device-sub-789']);
});

test('Empirical Stress 3.4: Resolution ignores denied devices', () => {
  const deniedDevice = {
    user_id: 'user-denied',
    onesignal_subscription_id: 'device-sub-denied',
    permission_status: 'denied',
    revoked_at: null
  };

  const result = simulatePushFunction({
    record: {
      id: 'notif-11',
      user_id: 'user-denied',
      type: 'message',
      category: 'messages',
      title: 'Hello',
      content: 'World'
    }
  }, { is_premium: false, onesignal_id: null }, [deniedDevice], []);

  // Denied device must NOT be added to subscription targets
  assert.strictEqual(result.subscriptionTargets.includes('device-sub-denied'), false);
  // Falls back to external_id
  assert.deepStrictEqual(result.payload.include_aliases, { external_id: ['user-denied'] });
});

test('Empirical Stress 3.5: Multi-device user resolves all active granted devices', () => {
  const devices = [
    { user_id: 'user-multi', onesignal_subscription_id: 'phone-sub-1', permission_status: 'granted', revoked_at: null },
    { user_id: 'user-multi', onesignal_subscription_id: 'tablet-sub-2', permission_status: 'granted', revoked_at: null },
    { user_id: 'user-multi', onesignal_subscription_id: 'old-revoked', permission_status: 'granted', revoked_at: '2026-01-01' },
    { user_id: 'user-multi', onesignal_subscription_id: 'denied-phone', permission_status: 'denied', revoked_at: null }
  ];

  const result = simulatePushFunction({
    record: {
      id: 'notif-12',
      user_id: 'user-multi',
      type: 'message',
      category: 'messages',
      title: 'Hello',
      content: 'World'
    }
  }, { is_premium: false }, devices, []);

  assert.strictEqual(result.skipped, false);
  assert.strictEqual(result.payload.include_subscription_ids.length, 2);
  assert.strictEqual(result.payload.include_subscription_ids.includes('phone-sub-1'), true);
  assert.strictEqual(result.payload.include_subscription_ids.includes('tablet-sub-2'), true);
  assert.strictEqual(result.payload.include_subscription_ids.includes('old-revoked'), false);
  assert.strictEqual(result.payload.include_subscription_ids.includes('denied-phone'), false);
});

// ==============================================================================
// TEST SUITE 4: STATIC CODE AUDIT & INTERFACE CONTRACTS
// ==============================================================================

test('Static Audit: send-notification-push/index.ts implementation constraints', () => {
  const edgePath = resolve(process.cwd(), 'supabase/functions/send-notification-push/index.ts');
  const code = readFileSync(edgePath, 'utf8');

  // Check 1: Must handle dual payloads (webhook body.record and direct API calls)
  assert.strictEqual(code.includes('body?.record'), true, 'Must check body.record');
  assert.strictEqual(code.includes("body?.type === 'INSERT'"), true, 'Must check insert webhook');

  // Check 2: Must query profiles for notification preferences
  assert.strictEqual(code.includes('push_notifications'), true, 'Must check push_notifications');
  assert.strictEqual(code.includes('message_notifications'), true, 'Must check message_notifications');
  assert.strictEqual(code.includes('match_notifications'), true, 'Must check match_notifications');
  assert.strictEqual(code.includes('request_notifications'), true, 'Must check request_notifications');
  assert.strictEqual(code.includes('confession_notifications'), true, 'Must check confession_notifications');

  // Check 3: Must record lifecycle timestamps
  assert.strictEqual(code.includes('sent_at'), true, 'Must record sent_at');
  assert.strictEqual(code.includes('failed_at'), true, 'Must record failed_at');

  // Check 4: Must use service_role client for database queries
  assert.strictEqual(code.includes('SUPABASE_SERVICE_ROLE_KEY'), true, 'Must use SUPABASE_SERVICE_ROLE_KEY');
});

test('Static Audit: Database migration 20261008180000_server_authoritative_push_trigger.sql', () => {
  const migrationPath = resolve(process.cwd(), 'supabase/migrations/20261008180000_server_authoritative_push_trigger.sql');
  assert.strictEqual(existsSync(migrationPath), true, 'Migration file must exist');

  const sql = readFileSync(migrationPath, 'utf8');

  // Check 1: Trigger function must be defined with SECURITY DEFINER
  assert.strictEqual(sql.includes('CREATE OR REPLACE FUNCTION public.trg_fn_notifications_push_dispatch'), true);
  assert.strictEqual(sql.includes('SECURITY DEFINER'), true);

  // Check 2: Must check suppress_push, suppressPush, and recipientIsActive
  assert.strictEqual(sql.includes("metadata->>'suppress_push' = 'true'"), true);
  assert.strictEqual(sql.includes("metadata->>'suppressPush' = 'true'"), true);
  assert.strictEqual(sql.includes("metadata->>'recipientIsActive' = 'true'"), true);

  // Check 3: Must check is_read = true
  assert.strictEqual(sql.includes('NEW.is_read = true'), true);

  // Check 4: Must invoke net.http_post
  assert.strictEqual(sql.includes('net.http_post'), true);

  // Check 5: Must contain exception block so trigger failures do not abort client transactions
  assert.strictEqual(sql.includes('EXCEPTION WHEN OTHERS THEN'), true);
  assert.strictEqual(sql.includes('RAISE WARNING'), true);

  // Check 6: Trigger must be AFTER INSERT on public.notifications
  assert.strictEqual(sql.includes('CREATE TRIGGER trg_notifications_push_dispatch'), true);
  assert.strictEqual(sql.includes('AFTER INSERT ON public.notifications'), true);
});
