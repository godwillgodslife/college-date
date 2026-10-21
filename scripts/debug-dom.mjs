import { connectEmulatorWebview } from './emulator-qa-controller.mjs';

async function main() {
    const c = await connectEmulatorWebview();
    const info = await c.evaluate(`
        JSON.stringify({
            html: document.body.innerHTML.slice(0, 1000),
            scripts: Array.from(document.querySelectorAll('script')).map(s => s.src),
            reactRoot: Boolean(document.getElementById('root')),
            rootHtml: document.getElementById('root')?.innerHTML?.slice(0, 500)
        })
    `);
    console.log('DOM info:', JSON.parse(info));
    c.close();
}

main().catch(console.error);
