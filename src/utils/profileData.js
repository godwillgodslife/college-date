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

const photoTimestampCache = new Map();

export function registerProfilePhotoTimestamp(userId, timestamp) {
    if (!userId) return;
    const timeMs = typeof timestamp === 'number' ? timestamp : new Date(timestamp || Date.now()).getTime();
    if (!isNaN(timeMs) && timeMs > 0) {
        photoTimestampCache.set(userId, timeMs);
    }
}

export function getFreshAvatarUrl(url, timestampOrProfile) {
    if (!url || typeof url !== 'string') return url || '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.includes('dicebear.com') || url.includes('ui-avatars.com')) return url;
    if (!timestampOrProfile) return url;

    let timestamp = timestampOrProfile;
    if (typeof timestampOrProfile === 'object') {
        const p = timestampOrProfile;
        timestamp = p.photo_updated_at || p.avatar_updated_at || p.updated_at || (p.id ? photoTimestampCache.get(p.id) : null);
        if (p.id && timestamp) {
            registerProfilePhotoTimestamp(p.id, timestamp);
        }
    }

    if (!timestamp) return url;

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
    const timestamp = profile.photo_updated_at || profile.updated_at || (profile.id ? photoTimestampCache.get(profile.id) : null);
    if (profile.id && timestamp) {
        registerProfilePhotoTimestamp(profile.id, timestamp);
    }
    return getFreshAvatarUrl(raw, timestamp);
}

export function getProfilePhotos(profile) {
    if (!profile) return [];

    const photos = safeArray(profile.profile_photos).filter(Boolean);
    const timestamp = profile.photo_updated_at || profile.updated_at || (profile.id ? photoTimestampCache.get(profile.id) : null);
    if (profile.id && timestamp) {
        registerProfilePhotoTimestamp(profile.id, timestamp);
    }
    if (photos.length > 0) {
        return photos.map(p => getFreshAvatarUrl(p, timestamp));
    }

    // Fall back to avatar_url only when profile_photos is empty
    if (profile.avatar_url) {
        return [getFreshAvatarUrl(profile.avatar_url, timestamp)];
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
