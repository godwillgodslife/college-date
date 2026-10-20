/**
 * Evaluates whether a user is genuinely a first-time newcomer who should see the introductory app tour.
 * An account that is months or days old, or has an established profile / activity,
 * is an experienced student and must NEVER be subjected to an introductory beginner tour.
 */
export function isUserEligibleForTour(userProfile, currentUser) {
    if (!currentUser || !userProfile) return false;

    // 1. Authoritative DB flag: user already saw or completed the tour
    if (userProfile.has_seen_tour === true) return false;

    // 2. Client-side persistence (both generic & user-scoped)
    if (typeof window !== 'undefined' && window.localStorage) {
        if (window.localStorage.getItem('hasSeenAppTour') === 'true') return false;
        if (currentUser.id && window.localStorage.getItem(`hasSeenAppTour_${currentUser.id}`) === 'true') return false;
    }

    // 3. Account Age Heuristic:
    // If the account was created > 24 hours ago, this is an established user returning to the app!
    if (userProfile.created_at) {
        const createdAtTime = new Date(userProfile.created_at).getTime();
        if (!Number.isNaN(createdAtTime)) {
            const ageHours = (Date.now() - createdAtTime) / (1000 * 60 * 60);
            if (ageHours > 24) {
                return false;
            }
        }
    }

    // 4. Profile Establishment & Activity Heuristic:
    // If user has a bio, avatar, photos, completion score >= 30, verified status, or swiped cards,
    // they are an experienced student who does not need a welcome tour.
    const hasBio = Boolean(userProfile.bio && userProfile.bio.trim().length > 0);
    const hasAvatar = Boolean(userProfile.avatar_url && userProfile.avatar_url.trim().length > 0);
    const hasPhotos = (Array.isArray(userProfile.profile_photos) && userProfile.profile_photos.filter(Boolean).length > 0) ||
                      (Array.isArray(userProfile.photos) && userProfile.photos.filter(Boolean).length > 0);
    const hasCompletion = (userProfile.completion_score || 0) >= 30;
    const hasSwiped = (userProfile.free_swipes_remaining !== undefined && userProfile.free_swipes_remaining < 3) || (userProfile.free_swipes || 0) > 0;
    const isVerifiedOrOptimized = Boolean(userProfile.is_verified || userProfile.is_optimised);

    if (hasBio || hasAvatar || hasPhotos || hasCompletion || hasSwiped || isVerifiedOrOptimized) {
        return false;
    }

    // Brand new user with an untouched profile created within last 24 hours
    return true;
}
