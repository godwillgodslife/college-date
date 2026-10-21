import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

async function main() {
    const c = await connectEmulatorWebview();
    const state = await c.evaluate(`
        JSON.stringify({
            href: window.location.href,
            title: document.title,
            bodySnippet: document.body.innerText.slice(0, 300),
            hasLoader: Boolean(document.querySelector('.loading-screen, .loading-spinner, .app-loader')),
            headings: Array.from(document.querySelectorAll('h1, h2, h3, nav, button')).map(el => (el.innerText || el.className).trim()).filter(Boolean).slice(0, 15)
        })
    `);
    console.log('Current state:', JSON.parse(state));
    c.screencap('native_screen_current_state.png');
    c.close();
}

main().catch(console.error);
