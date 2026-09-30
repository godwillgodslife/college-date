import { evalInPage } from './cdp_helper.mjs';

async function main() {
    const res = await evalInPage(`(() => {
        return Array.from(document.querySelectorAll('.message-bubble')).map(b => b.innerText);
    })()`, '9222');
    console.log('Bubbles:', res);
}

main().catch(console.error);
