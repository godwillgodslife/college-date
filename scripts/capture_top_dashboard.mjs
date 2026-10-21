import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    const c = await connectEmulatorWebview();
    await c.navigate('/dashboard');
    await sleep(1500);

    // Scroll to top
    await c.evaluate('window.scrollTo(0, 0)');
    await sleep(600);

    // 1. Light theme top
    await c.setTheme('light');
    await sleep(600);
    c.screencap('native_screen_dashboard_top_light.png');

    // 2. Dark theme top
    await c.setTheme('dark');
    await sleep(600);
    c.screencap('native_screen_dashboard_top_dark.png');

    c.close();
}

main().catch(console.error);
