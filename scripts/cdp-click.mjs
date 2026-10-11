// scripts/cdp-click.mjs
import { getCdpConnection } from './cdp-client.mjs';

const selector = process.argv[2];
if (!selector) {
    console.error('Selector required');
    process.exit(1);
}

async function run() {
    const client = await getCdpConnection();
    const script = `
        (() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (el) {
                el.click();
                return 'Clicked: ' + ${JSON.stringify(selector)};
            }
            return 'Not found: ' + ${JSON.stringify(selector)};
        })()
    `;
    const res = await client.evaluate(script);
    console.log(res.result?.value);
    client.close();
}

run().catch(console.error);
