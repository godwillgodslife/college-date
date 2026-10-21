// scripts/diagnose_real_screens.mjs
import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    console.log('Connecting to real Android emulator app...');
    const controller = await connectEmulatorWebview();

    console.log('Connected! Checking current route...');
    const curUrl = await controller.evaluate('window.location.href');
    console.log('Current URL:', curUrl);

    // 1. Visit /dashboard
    console.log('--- Navigating to /dashboard ---');
    await controller.navigate('/dashboard');
    await sleep(2000);

    // Dark Mode Dashboard
    await controller.setTheme('dark');
    await sleep(800);
    controller.screencap('native_screen_01_dashboard_dark.png');

    // Light Mode Dashboard
    await controller.setTheme('light');
    await sleep(800);
    controller.screencap('native_screen_01_dashboard_light.png');

    // 2. Visit /confessions
    console.log('--- Navigating to /confessions ---');
    await controller.navigate('/confessions');
    await sleep(2000);

    // Dark Mode Confessions
    await controller.setTheme('dark');
    await sleep(800);
    controller.screencap('native_screen_02_confessions_dark.png');

    // Light Mode Confessions
    await controller.setTheme('light');
    await sleep(800);
    controller.screencap('native_screen_02_confessions_light.png');

    // 3. Visit /leaderboard
    console.log('--- Navigating to /leaderboard ---');
    await controller.navigate('/leaderboard');
    await sleep(2000);

    // Dark Mode Leaderboard
    await controller.setTheme('dark');
    await sleep(800);
    controller.screencap('native_screen_03_leaderboard_dark.png');

    // Light Mode Leaderboard
    await controller.setTheme('light');
    await sleep(800);
    controller.screencap('native_screen_03_leaderboard_light.png');

    // 4. Visit /chat
    console.log('--- Navigating to /chat ---');
    await controller.navigate('/chat');
    await sleep(2000);

    // Dark Mode Chat
    await controller.setTheme('dark');
    await sleep(800);
    controller.screencap('native_screen_04_chat_dark.png');

    // Light Mode Chat
    await controller.setTheme('light');
    await sleep(800);
    controller.screencap('native_screen_04_chat_light.png');

    // 5. Visit /profile
    console.log('--- Navigating to /profile ---');
    await controller.navigate('/profile');
    await sleep(2000);

    // Dark Mode Profile
    await controller.setTheme('dark');
    await sleep(800);
    controller.screencap('native_screen_05_profile_dark.png');

    // Light Mode Profile
    await controller.setTheme('light');
    await sleep(800);
    controller.screencap('native_screen_05_profile_light.png');

    // 6. Return to /match
    console.log('--- Navigating to /match ---');
    await controller.navigate('/match');
    await sleep(1500);
    await controller.setTheme('dark');
    controller.screencap('native_screen_06_match_dark.png');
    await controller.setTheme('light');
    controller.screencap('native_screen_06_match_light.png');

    controller.close();
    console.log('Completed diagnostics!');
}

run().catch(err => {
    console.error('Diagnostic error:', err);
    process.exit(1);
});
