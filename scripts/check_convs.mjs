import { evalInPage } from './cdp_helper.mjs';

async function main() {
    const res = await evalInPage(`(() => {
        const items = document.querySelectorAll('.conversation-item');
        return {
            count: items.length,
            names: Array.from(items).map(i => i.innerText.split('\\n')[0])
        };
    })()`, '9222');
    console.log('Conversations:', res);
}

main().catch(console.error);
