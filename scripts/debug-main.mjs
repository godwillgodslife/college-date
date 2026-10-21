import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

async function main() {
    const c = await connectEmulatorWebview();
    const info = await c.evaluate(`
        JSON.stringify({
            mainHtml: document.querySelector('main')?.innerHTML?.slice(0, 500) || 'no main',
            mainChildren: Array.from(document.querySelector('main')?.children || []).map(c => c.className),
            hasSuspenseFallback: Boolean(document.querySelector('.page-loading, .loading-container, .spinner')),
            bodyText: document.body.innerText.slice(0, 400)
        })
    `);
    console.log('Main info:', JSON.parse(info));
    c.close();
}

main().catch(console.error);
