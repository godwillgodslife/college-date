export function isEliteUltra(source) {
    if (!source) return false;
    if (!hasActivePremium(source)) return false;

    const plan = String(source.plan_type || source.tier || source.product_id || '').toLowerCase();
    if (plan.includes('ultra') || source.is_ultra === true) return true;

    if (typeof window !== 'undefined' && source.id) {
        try {
            const raw = localStorage.getItem(`cd_ultra_sub_${source.id}`) || localStorage.getItem(`cd_local_ultra_sub_${source.id}`);
            if (raw) {
                const sub = JSON.parse(raw);
                const subPlan = String(sub.plan_type || sub.tier || sub.product_id || '').toLowerCase();
                return subPlan.includes('ultra') || sub.is_ultra === true;
            }
        } catch {
            // Ignore
        }
    }

    return false;
}

export function getSubscriptionTier(source) {
    if (!source || !hasActivePremium(source)) return 'free';
    if (isEliteUltra(source)) return 'ultra';
    return 'premium';
}

export function getProfilePhotoLimit(source) {
    if (!source || !hasActivePremium(source)) return 4;
    return 6;
}

export function getProfileVideoDurationLimit(source) {
    if (!source || !hasActivePremium(source)) return 0;
    if (isEliteUltra(source)) return 30;
    return 10;
}

export function canUploadProfileVideo(source) {
    return hasActivePremium(source);
}

export function getMatchPhotoLimit(profile, viewerProfile = null) {
    // The objective is to let eligible Premium users display more of their uploaded photos in Match.
    // If the displayed profile is an eligible Premium member (Elite Premium or Elite Ultra), show up to 6.
    // Also grant 6 if the viewer is previewing their own profile with active premium.
    const isEligible = hasActivePremium(profile) || (viewerProfile && profile?.id === viewerProfile?.id && hasActivePremium(viewerProfile));
    return isEligible ? 6 : 3;
}

export function hasActivePremium(source) {
    if (!source) return false;

    const plan = String(source.plan_type || source.tier || '').toLowerCase();
    const hasPremiumFlag = source.is_premium === true || source.is_ultra === true;
    const hasPremiumPlan = (plan === 'premium' || plan === 'ultra' || plan === 'elite ultra') && source.status === 'active';
    const expiry = source.premium_expires_at || source.current_period_end;

    if (hasPremiumFlag || hasPremiumPlan) {
        if (!expiry) return true;
        const expiryTime = new Date(expiry).getTime();
        if (Number.isNaN(expiryTime)) return true;
        if (expiryTime > Date.now()) return true;
    }

    // Local-safe resilience: check if user has local Ultra subscription
    if (typeof window !== 'undefined' && source.id) {
        try {
            const raw = localStorage.getItem(`cd_ultra_sub_${source.id}`) || localStorage.getItem(`cd_local_ultra_sub_${source.id}`);
            if (raw) {
                const sub = JSON.parse(raw);
                const subExpiry = sub.premium_expires_at || sub.current_period_end;
                if (!subExpiry || new Date(subExpiry).getTime() > Date.now()) {
                    return true;
                }
            }
        } catch {
            // Ignore
        }
    }

    return false;
}

