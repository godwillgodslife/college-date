// scripts/cdp-test-search.mjs
// Search on Explore page and return result info

const query = process.argv[2] || 'Khalil';

async function testSearch() {
    const pagesRes = await fetch('http://127.0.0.1:9222/json');
    const pages = await pagesRes.json();
    const page = pages.find(p => p.type === 'page');
    if (!page) throw new Error('No page found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => { ws.onopen = res; });

    function evaluate(expr) {
        return new Promise((resolve) => {
            const id = Math.floor(Math.random() * 100000);
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    resolve(data.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: { expression: expr, returnByValue: true, awaitPromise: true }
            }));
        });
    }

    // Step 1: Check if input exists
    const checkRes = await evaluate(`
        (() => {
            const input = document.querySelector('.explore-search-input');
            const btn = document.querySelector('.search-submit-btn');
            return { hasInput: !!input, hasBtn: !!btn, val: input?.value };
        })()
    `);
    console.log('Check elements:', checkRes.result?.value);

    // Step 2: Set search value and trigger search
    const triggerRes = await evaluate(`
        (() => {
            const input = document.querySelector('.explore-search-input');
            if (!input) return 'No input';
            const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSet.call(input, '${query}');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            const submitBtn = document.querySelector('.search-submit-btn');
            if (submitBtn) {
                submitBtn.click();
                return 'Clicked submit button with "${query}"';
            }
            return 'No submit btn';
        })()
    `);
    console.log('Trigger:', triggerRes.result?.value);

    // Step 3: Wait 3 seconds and inspect results
    await new Promise(r => setTimeout(r, 3000));

    const resultsRes = await evaluate(`
        (() => {
            const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => c.innerText);
            const feedback = document.querySelector('.search-results-feedback')?.innerText;
            const empty = document.querySelector('.empty-discovery')?.innerText;
            return { cardCount: cards.length, cards, feedback, empty };
        })()
    `);
    console.log('Results after search:', JSON.stringify(resultsRes.result?.value, null, 2));

    ws.close();
}

testSearch().catch(console.error);
