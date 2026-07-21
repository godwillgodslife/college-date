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

export function getProfilePhotos(profile) {
    if (!profile) return [];

    const photos = safeArray(profile.profile_photos);
    if (profile.avatar_url && !photos.includes(profile.avatar_url)) {
        photos.unshift(profile.avatar_url);
    }

    return photos.filter(Boolean);
}
