import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    const c = await connectEmulatorWebview();

    // Click Campuses tab
    console.log('Clicking Campuses tab...');
    await c.evaluate(`
        (() => {
            const btns = Array.from(document.querySelectorAll('button, .tab-button, .segment-btn'));
            const campusBtn = btns.find(b => b.innerText.includes('Campuses'));
            if (campusBtn) campusBtn.click();
        })()
    `);
    await sleep(1500);

    // Capture in Light mode
    c.screencap('native_screen_leaderboard_campuses_light.png');

    // Switch to Dark mode
    console.log('Switching to Dark mode...');
    await c.setTheme('dark');
    await sleep(1000);
    c.screencap('native_screen_leaderboard_campuses_dark.png');

    // Switch back to Most Wanted in Dark mode
    await c.evaluate(`
        (() => {
            const btns = Array.from(document.querySelectorAll('button, .tab-button, .segment-btn'));
            const wantedBtn = btns.find(b => b.innerText.includes('Most Wanted'));
            if (wantedBtn) wantedBtn.click();
        })()
    `);
    await sleep(1000);
    c.screencap('native_screen_leaderboard_mostwanted_dark.png');

    c.close();
}

main().catch(console.error);
