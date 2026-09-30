import { evalInPage } from './cdp_helper.mjs';

async function main() {
    const errorText = await evalInPage(`(() => {
        return window.__lastError || window.__errorLog || document.body.innerText;
    })()`, '9222');
    console.log('Error page text:', errorText);
}

main().catch(console.error);
