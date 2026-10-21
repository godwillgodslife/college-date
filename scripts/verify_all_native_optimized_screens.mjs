// scripts/verify_all_native_optimized_screens.mjs
import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    console.log('Connecting to fresh native app on Android emulator...');
    const c = await connectEmulatorWebview();

    console.log('Navigating to /dashboard...');
    await c.navigate('/dashboard');
    await sleep(2000);

    // ── 1. DASHBOARD IN DARK MODE ──
    console.log('Capturing Dashboard in Dark Mode...');
    await c.setTheme('dark');
    await c.evaluate('window.scrollTo(0, 0)');
    await sleep(800);
    c.screencap('v2.2.74_android_dark_01_dashboard_top.png');

    await c.scrollTo('.campus-quests-card');
    await sleep(800);
    c.screencap('v2.2.74_android_dark_02_dashboard_quests.png');

    // ── 2. DASHBOARD IN LIGHT MODE ──
    console.log('Capturing Dashboard in Light Mode...');
    await c.setTheme('light');
    await c.evaluate('window.scrollTo(0, 0)');
    await sleep(800);
    c.screencap('v2.2.74_android_light_01_dashboard_top.png');

    await c.scrollTo('.campus-quests-card');
    await sleep(800);
    c.screencap('v2.2.74_android_light_02_dashboard_quests.png');

    // ── 3. SCORE STREAK MODAL ──
    console.log('Capturing Score Streak Modal...');
    await c.evaluate('window.scrollTo(0, 0)');
    await sleep(500);
    await c.click('.dashboard-streak-card');
    await sleep(1000);
    c.screencap('v2.2.74_android_light_03_streak_modal.png');

    await c.setTheme('dark');
    await sleep(800);
    c.screencap('v2.2.74_android_dark_03_streak_modal.png');

    await c.click('.score-streak-close-btn');
    await sleep(600);

    // ── 4. PRIMETIME MYSTERY MATCH MODAL ──
    console.log('Capturing Primetime Mystery Match Modal...');
    await c.click('.primetime-mystery-btn');
    await sleep(1000);
    c.screencap('v2.2.74_android_dark_04_mystery_modal.png');

    await c.setTheme('light');
    await sleep(800);
    c.screencap('v2.2.74_android_light_04_mystery_modal.png');

    await c.click('.mystery-close-btn');
    await sleep(600);

    // ── 5. CONFESSIONS ──
    console.log('Capturing Confessions Page...');
    await c.navigate('/confessions');
    await sleep(2000);
    await c.setTheme('dark');
    await sleep(800);
    c.screencap('v2.2.74_android_dark_05_confessions.png');

    await c.setTheme('light');
    await sleep(800);
    c.screencap('v2.2.74_android_light_05_confessions.png');

    // ── 6. LEADERBOARD (CLASH OF CAMPUSES) ──
    console.log('Capturing Leaderboard...');
    await c.navigate('/leaderboard');
    await sleep(2000);
    await c.setTheme('dark');
    await sleep(800);
    c.screencap('v2.2.74_android_dark_06_leaderboard.png');

    await c.setTheme('light');
    await sleep(800);
    c.screencap('v2.2.74_android_light_06_leaderboard.png');

    // Click Campuses tab on Leaderboard
    await c.evaluate(`
        (() => {
            const btns = Array.from(document.querySelectorAll('button, .segment-btn, .tab-button'));
            const b = btns.find(btn => btn.innerText.includes('Campuses'));
            if (b) b.click();
        })()
    `);
    await sleep(1200);
    c.screencap('v2.2.74_android_light_06_leaderboard_campuses.png');

    await c.setTheme('dark');
    await sleep(800);
    c.screencap('v2.2.74_android_dark_06_leaderboard_campuses.png');

    // ── 7. PROFILE (WITH VIBE BADGES) ──
    console.log('Capturing Profile...');
    await c.navigate('/profile');
    await sleep(2500);
    await c.setTheme('dark');
    await sleep(800);
    c.screencap('v2.2.74_android_dark_07_profile.png');

    await c.setTheme('light');
    await sleep(800);
    c.screencap('v2.2.74_android_light_07_profile.png');

    c.close();
    console.log('All real Android emulator screenshots successfully captured!');
}

run().catch(err => {
    console.error('Error in verification:', err);
    process.exit(1);
});
