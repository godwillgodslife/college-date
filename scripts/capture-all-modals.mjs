import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    const c = await connectEmulatorWebview();

    // ── 1. SCORE STREAK MODAL IN LIGHT & DARK ──
    console.log('Testing Score Streak Modal...');
    await c.navigate('/dashboard');
    await sleep(1500);

    // Set light theme FIRST
    await c.setTheme('light');
    await sleep(500);
    // Click Streak Card
    await c.click('.dashboard-streak-card');
    await sleep(800);
    c.screencap('native_verified_streak_modal_light.png');

    // Switch to dark mode while modal is open
    await c.setTheme('dark');
    await sleep(800);
    c.screencap('native_verified_streak_modal_dark.png');

    // Close modal
    await c.click('.score-streak-close-btn');
    await sleep(500);

    // ── 2. CAMPUS PRIMETIME MYSTERY MATCH MODAL ──
    console.log('Testing Primetime Mystery Match Modal...');
    // Click Speed Date button
    await c.click('.primetime-mystery-btn');
    await sleep(800);
    c.screencap('native_verified_mystery_modal_dark.png');

    await c.setTheme('light');
    await sleep(800);
    c.screencap('native_verified_mystery_modal_light.png');

    // Close modal
    await c.click('.campus-mystery-close-btn, .mystery-match-close, .modal-close');
    await sleep(500);

    c.close();
    console.log('Done capturing modals!');
}

main().catch(console.error);
