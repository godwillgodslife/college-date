/**
 * ── Campus Primetime (8:00 PM Collegiate Matching Hour) ─────────
 * Computes live collegiate primetime activity window (20:00 - 22:00 WAT).
 */

export function getCampusPrimetimeStatus() {
    const now = new Date();
    // West Africa Time is UTC+1. Compute hours in WAT
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const watHours = (utcHours + 1) % 24;

    const currentMinutesOfDay = watHours * 60 + utcMinutes;
    const primetimeStartMinutes = 20 * 60; // 20:00 (8:00 PM)
    const primetimeEndMinutes = 22 * 60;   // 22:00 (10:00 PM)

    const isLive = currentMinutesOfDay >= primetimeStartMinutes && currentMinutesOfDay < primetimeEndMinutes;

    if (isLive) {
        const remainingMinutes = primetimeEndMinutes - currentMinutesOfDay;
        const h = Math.floor(remainingMinutes / 60);
        const m = remainingMinutes % 60;
        const countdownStr = h > 0 ? `${h}h ${m}m left` : `${m}m left`;

        return {
            isLive: true,
            label: 'LIVE NOW ⚡',
            headline: 'Campus Primetime Hour',
            description: 'Matching activity is surging! 3x more students active right now.',
            countdown: countdownStr,
            badge: '🔥 3x Surge'
        };
    } else {
        // Calculate minutes until next 20:00
        let minutesUntil = primetimeStartMinutes - currentMinutesOfDay;
        if (minutesUntil < 0) {
            minutesUntil += 24 * 60; // next day
        }
        const h = Math.floor(minutesUntil / 60);
        const m = minutesUntil % 60;
        const countdownStr = h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;

        return {
            isLive: false,
            label: 'Tonight 8:00 PM',
            headline: 'Campus Primetime',
            description: 'Daily speed-matching hour across all universities starts tonight.',
            countdown: countdownStr,
            badge: '🌙 Daily 8 PM'
        };
    }
}
