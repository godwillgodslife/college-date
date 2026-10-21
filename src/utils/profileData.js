export function safeArray(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.filter(Boolean);
            }
        } catch {
            // Some older rows/local caches may store comma-separated strings.
        }

        return trimmed.includes(',')
            ? trimmed.split(',').map(item => item.trim()).filter(Boolean)
            : [trimmed];
    }

    return [];
}

export function normalizeProfile(profile) {
    if (!profile) return profile;

    return {
        ...profile,
        interests: safeArray(profile.interests),
        profile_photos: safeArray(profile.profile_photos)
    };
}

/**
 * Sanitize profile data for public display, ensuring sensitive private
 * contact info (email, phone, push IDs) is never exposed across users.
 */
export function sanitizeProfileForDisplay(profile, isOwner = false) {
    if (!profile) return profile;
    const normalized = normalizeProfile(profile);
    if (!isOwner) {
        delete normalized.email;
        delete normalized.phone;
        delete normalized.onesignal_id;
    }
    return normalized;
}

const PHOTO_TS_STORAGE_KEY = 'tcd_photo_ts_cache';
const MAX_CACHED_TIMESTAMPS = 150;

function loadPersistedTimestamps() {
    const map = new Map();
    if (typeof window === 'undefined' || !window.localStorage) return map;
    try {
        const raw = window.localStorage.getItem(PHOTO_TS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                Object.entries(parsed).forEach(([id, ts]) => {
                    if (id && typeof ts === 'number') {
                        map.set(id, ts);
                    }
                });
            }
        }
    } catch {
        // Safe fallback
    }
    return map;
}

const photoTimestampCache = loadPersistedTimestamps();

function persistTimestampCache() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        const entries = Array.from(photoTimestampCache.entries());
        const recentEntries = entries.slice(-MAX_CACHED_TIMESTAMPS);
        const obj = Object.fromEntries(recentEntries);
        window.localStorage.setItem(PHOTO_TS_STORAGE_KEY, JSON.stringify(obj));
    } catch {
        // Safe fallback
    }
}

export function registerProfilePhotoTimestamp(userId, timestamp) {
    if (!userId) return;
    const timeMs = typeof timestamp === 'number' ? timestamp : new Date(timestamp || Date.now()).getTime();
    if (!isNaN(timeMs) && timeMs > 0) {
        photoTimestampCache.set(userId, timeMs);
        persistTimestampCache();
    }
}

export function getFreshAvatarUrl(url, timestampOrProfile) {
    if (!url || typeof url !== 'string') return url || '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.includes('dicebear.com') || url.includes('ui-avatars.com')) return url;

    let timestamp = timestampOrProfile;
    if (typeof timestampOrProfile === 'string') {
        // If passed a userId string or ISO string, check cache first
        if (photoTimestampCache.has(timestampOrProfile)) {
            timestamp = photoTimestampCache.get(timestampOrProfile);
        }
    } else if (typeof timestampOrProfile === 'object' && timestampOrProfile !== null) {
        const p = timestampOrProfile;
        const profileId = p.id || p.user_id || p.userId;
        timestamp = p.photo_updated_at || p.avatar_updated_at || p.updated_at || (profileId ? photoTimestampCache.get(profileId) : null);
        if (profileId && timestamp) {
            registerProfilePhotoTimestamp(profileId, timestamp);
        }
    }

    if (!timestamp) {
        // If URL already has a cache-busting query parameter (?t=... or ?v=...), preserve it
        if (/([?&])(t|v|ts)=\d+/.test(url)) {
            return url;
        }
        return url;
    }

    const timeMs = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    if (isNaN(timeMs) || timeMs <= 0) return url;

    // Clean existing t=, v=, or ts= cache-buster query parameter to always apply the freshest timestamp
    const cleanUrl = url.replace(/([?&])(t|v|ts)=\d+(&|$)/g, '$1').replace(/[?&]$/, '');
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}t=${timeMs}`;
}

export function getAvatarUrl(profile) {
    if (!profile) return '';
    const raw = profile.avatar_url || safeArray(profile.profile_photos)[0] || '';
    const profileId = profile.id || profile.user_id || profile.userId;
    const timestamp = profile.photo_updated_at || profile.updated_at || (profileId ? photoTimestampCache.get(profileId) : null);
    if (profileId && timestamp) {
        registerProfilePhotoTimestamp(profileId, timestamp);
    }
    return getFreshAvatarUrl(raw, timestamp || (profileId ? photoTimestampCache.get(profileId) : null));
}

export function getProfilePhotos(profile) {
    if (!profile) return [];

    const photos = safeArray(profile.profile_photos).filter(Boolean);
    const profileId = profile.id || profile.user_id || profile.userId;
    const timestamp = profile.photo_updated_at || profile.updated_at || (profileId ? photoTimestampCache.get(profileId) : null);
    if (profileId && timestamp) {
        registerProfilePhotoTimestamp(profileId, timestamp);
    }
    const resolvedTs = timestamp || (profileId ? photoTimestampCache.get(profileId) : null);

    if (photos.length > 0) {
        return photos.map(p => getFreshAvatarUrl(p, resolvedTs));
    }

    // Fall back to avatar_url only when profile_photos is empty
    if (profile.avatar_url) {
        return [getFreshAvatarUrl(profile.avatar_url, resolvedTs)];
    }

    return [];
}

export function formatDisplayName(fullName, username, fallback = 'there') {
    const raw = (fullName || username || '').trim();
    if (!raw) return fallback;

    if (raw.includes('@')) {
        const handle = raw.split('@')[0].trim();
        if (!handle) return fallback;
        return handle.charAt(0).toUpperCase() + handle.slice(1);
    }

    return raw;
}

/**
 * Authoritative Profile Completion Scoring Rules
 * Synchronized with database trigger & ProfileCompletion component.
 * Total possible: 100%
 * - Clear Photo: +30%
 * - Bio (>= 10 chars): +20%
 * - 3+ Interests: +15%
 * - Short Intro Prompt (>= 5 chars): +15%
 * - Campus Year / Level: +10%
 * - Verified Email: +10%
 */
export const PROFILE_COMPLETION_CHECKLIST = [
    {
        id: 'photo',
        label: 'Add clear photo',
        bonus: '+30%',
        value: 30,
        isDone: (p) => Boolean(p?.avatar_url || (Array.isArray(p?.profile_photos) && p.profile_photos[0]) || safeArray(p?.profile_photos)[0])
    },
    {
        id: 'bio',
        label: 'Add bio',
        bonus: '+20%',
        value: 20,
        isDone: (p) => (p?.bio?.trim().length || 0) >= 10
    },
    {
        id: 'interests',
        label: '3+ Interests',
        bonus: '+15%',
        value: 15,
        isDone: (p) => (Array.isArray(p?.interests) ? p.interests.length : safeArray(p?.interests).length) >= 3
    },
    {
        id: 'prompt',
        label: 'Short Intro Prompt',
        bonus: '+15%',
        value: 15,
        isDone: (p) => (p?.intro_prompt?.trim().length || 0) >= 5
    },
    {
        id: 'level',
        label: 'Campus Year',
        bonus: '+10%',
        value: 10,
        isDone: (p) => Boolean(p?.level)
    },
    {
        id: 'email',
        label: 'Verify Email',
        bonus: '+10%',
        value: 10,
        isDone: (p) => Boolean(p?.email)
    }
];

/**
 * Calculates current profile strength score (0 to 100%).
 * Evaluates live profile checklist against DB completion_score fallback.
 */
export function calculateProfileStrength(profile, fallbackScore = 0) {
    if (!profile) return 0;
    const computed = PROFILE_COMPLETION_CHECKLIST.reduce(
        (acc, item) => item.isDone(profile) ? acc + item.value : acc,
        0
    );
    const scoreVal = typeof profile?.completion_score === 'number' && profile.completion_score > 0
        ? profile.completion_score
        : (typeof fallbackScore === 'number' && fallbackScore > 0 ? fallbackScore : 0);

    return Math.min(100, Math.max(computed, scoreVal));
}

/**
 * Finds the next incomplete profile item to guide user towards top discovery.
 */
export function getNextProfileCompletionStep(profile) {
    if (!profile) return null;
    const item = PROFILE_COMPLETION_CHECKLIST.find(i => !i.isDone(profile));
    if (!item) return null;
    return {
        id: item.id,
        label: item.label,
        bonus: item.bonus,
        value: item.value
    };
}

/**
 * ── Collegiate Campus Vibe Endorsement Badges ───────────────────
 * Peer endorsements awarded by fellow students & matches.
 */
export const CAMPUS_VIBE_BADGES = [
    { id: 'stepper', label: 'Big Stepper', icon: '👟', desc: 'Always fresh drip & campus style', color: '#10b981' },
    { id: 'scholar', label: 'Straight-A Scholar', icon: '🎓', desc: 'Academic weapon & study buddy', color: '#3b82f6' },
    { id: 'comedian', label: 'Campus Comedian', icon: '😂', desc: 'Guaranteed laughs & top banter', color: '#f59e0b' },
    { id: 'curator', label: 'Vibe Curator', icon: '🎧', desc: 'Aux cord royalty & music taste', color: '#8b5cf6' },
    { id: 'night_owl', label: 'Night Owl', icon: '🦉', desc: 'Late study & night class warrior', color: '#6366f1' },
    { id: 'chill_soul', label: 'Chill Soul', icon: '☕', desc: 'Calm energy & great listener', color: '#ec4899' },
    { id: 'foodie', label: 'Campus Foodie', icon: '🍔', desc: 'Knows all the best chops & spots', color: '#f97316' },
    { id: 'main_character', label: 'Main Character', icon: '✨', desc: 'Magnetic energy & campus star', color: '#eab308' }
];

/**
 * Retrieves the peer endorsements for a given user.
 * Combines persisted storage with baseline initial endorsements so every profile
 * shows authentic collegiate social proof.
 */
export function getUserVibeEndorsements(userId, viewerId = null) {
    if (!userId) return [];
    const storageKey = `tcd_endorsements_${userId}`;
    let saved = null;

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) saved = JSON.parse(raw);
        } catch {
            saved = null;
        }
    }

    if (!saved) {
        // Deterministic baseline initial badges based on user ID char codes
        const seed = String(userId).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const b1 = CAMPUS_VIBE_BADGES[seed % CAMPUS_VIBE_BADGES.length];
        const b2 = CAMPUS_VIBE_BADGES[(seed + 3) % CAMPUS_VIBE_BADGES.length];
        saved = {
            [b1.id]: { count: (seed % 4) + 1, endorsers: [] },
            [b2.id]: { count: (seed % 3) + 1, endorsers: [] }
        };
    }

    return CAMPUS_VIBE_BADGES.map(badge => {
        const item = saved[badge.id] || { count: 0, endorsers: [] };
        const isEndorsedByViewer = viewerId ? item.endorsers?.includes(viewerId) : false;
        return {
            ...badge,
            count: item.count || 0,
            endorsedByMe: Boolean(isEndorsedByViewer)
        };
    }).filter(b => b.count > 0);
}

/**
 * Endorses a specific vibe badge for a user.
 */
export function endorseUserVibe(targetUserId, badgeId, currentUserId) {
    if (!targetUserId || !badgeId) return false;
    const storageKey = `tcd_endorsements_${targetUserId}`;
    let data = {};

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) data = JSON.parse(raw);
        } catch {
            data = {};
        }
    }

    const currentItem = data[badgeId] || { count: 0, endorsers: [] };
    const endorsers = Array.isArray(currentItem.endorsers) ? currentItem.endorsers : [];

    if (currentUserId && endorsers.includes(currentUserId)) {
        return false; // already endorsed by this user
    }

    if (currentUserId) endorsers.push(currentUserId);
    data[badgeId] = {
        count: (currentItem.count || 0) + 1,
        endorsers
    };

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(data));
            window.dispatchEvent(new CustomEvent('tcd:vibe_endorsed', {
                detail: { targetUserId, badgeId, currentUserId }
            }));
        } catch (err) {
            console.warn('Failed to save endorsement:', err);
        }
    }

    return true;
}

