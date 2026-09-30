import { evalInPage } from './cdp_helper.mjs';

async function main() {
    const res = await evalInPage(`(() => {
        const all = Array.from(document.querySelectorAll('*'));
        const matches = all.filter(el => {
            if (el.className && typeof el.className === 'string') {
                return el.className.includes('action') || el.className.includes('reaction') || el.className.includes('menu') || el.className.includes('pill');
            }
            return false;
        });
        return matches.map(m => ({ tag: m.tagName, class: m.className, text: m.innerText ? m.innerText.slice(0, 30) : '' }));
    })()`, '9222');
    console.log('Matches:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
