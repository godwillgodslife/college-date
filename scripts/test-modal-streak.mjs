import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    const c = await connectEmulatorWebview();
    await c.navigate('/dashboard');
    await sleep(1500);

    console.log('Clicking Score Streak card...');
    await c.click('.dashboard-streak-card');
    await sleep(1000);

    // Light Theme screencap
    await c.setTheme('light');
    await sleep(500);
    c.screencap('native_screen_modal_streak_light.png');

    // Dark Theme screencap
    await c.setTheme('dark');
    await sleep(500);
    c.screencap('native_screen_modal_streak_dark.png');

    // Close modal
    await c.click('.score-streak-close-btn');
    await sleep(500);

    c.close();
}

main().catch(console.error);
