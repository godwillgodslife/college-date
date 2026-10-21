import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

async function main() {
    const c = await connectEmulatorWebview();
    const info = await c.evaluate(`
        (() => {
            const bridge = document.querySelector('.profile-yt-bridge-btn');
            const completion = document.querySelector('.profile-completion');
            const card = document.querySelector('.dashboard-card');
            return {
                htmlClass: document.documentElement.className,
                dataTheme: document.documentElement.getAttribute('data-theme'),
                bodyClass: document.body.className,
                bridgeBg: bridge ? window.getComputedStyle(bridge).backgroundColor : null,
                bridgeColor: bridge ? window.getComputedStyle(bridge).color : null,
                titleColor: document.querySelector('.profile-yt-bridge-title') ? window.getComputedStyle(document.querySelector('.profile-yt-bridge-title')).color : null,
                completionBg: completion ? window.getComputedStyle(completion).backgroundColor : null,
                cardBg: card ? window.getComputedStyle(card).backgroundColor : null
            };
        })()
    `);
    console.log('DOM Theme Info:', info);
    c.close();
}

main().catch(console.error);
