/**
 * Placeholder service stubs for future features.
 * Each function follows the { data, error } return pattern.
 * Replace the stubs with real Supabase calls when implementing each feature.
 */

// ─── Swipes ──────────────────────────────────────────────
// TODO: Connect to `swipes` table in Supabase
export async function getDiscoverProfiles(/* userId, filters */) {
    return { data: [], error: null };
}

export async function recordSwipe(/* swiperId, swipedId, direction */) {
    return { data: null, error: null };
}

export async function getMatches(/* userId */) {
    return { data: [], error: null };
}

// ─── Conversations / Chat ────────────────────────────────
// TODO: Connect to `conversations` and `messages` tables
export async function getConversations(/* userId */) {
    return { data: [], error: null };
}

export async function getMessages(/* conversationId */) {
    return { data: [], error: null };
}

export async function sendMessage(/* conversationId, senderId, content */) {
    return { data: null, error: null };
}

// ─── Status Updates ──────────────────────────────────────
// TODO: Connect to `status_updates` table (image-only, 5-hour expiry)
export async function getStatusUpdates(/* userId */) {
    return { data: [], error: null };
}

export async function createStatusUpdate(/* userId, imageUrl */) {
    return { data: null, error: null };
}

// ─── Snapshots ───────────────────────────────────────────
// TODO: Connect to `snapshots` table (24-hour ephemeral)
export async function getSnapshots(/* userId */) {
    return { data: [], error: null };
}

export async function createSnapshot(/* userId, mediaUrl, caption */) {
    return { data: null, error: null };
}

// ─── Referrals ───────────────────────────────────────────
// TODO: Connect to `referrals` table
export async function getReferralStats(/* userId */) {
    return { data: { referralCode: null, referralCount: 0, coins: 0 }, error: null };
}

export async function applyReferralCode(/* userId, code */) {
    return { data: null, error: null };
}
