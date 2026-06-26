export function hasActivePremium(source) {
    if (!source) return false;

    const hasPremiumFlag = source.is_premium === true;
    const hasPremiumPlan = source.plan_type === 'Premium' && source.status === 'active';
    const expiry = source.premium_expires_at || source.current_period_end;

    if (!hasPremiumFlag && !hasPremiumPlan) return false;
    if (!expiry) return true;

    const expiryTime = new Date(expiry).getTime();
    if (Number.isNaN(expiryTime)) return true;

    return expiryTime > Date.now();
}
