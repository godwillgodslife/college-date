// scripts/cdp-search.mjs
// Execute search on Explore page via CDP

const query = process.argv[2] || 'Queen';

async function performSearch() {
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
                    resolve(data.result?.result?.value);
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

    const script = `
        (async () => {
            const searchInput = document.querySelector('.explore-search-input');
            if (!searchInput) return 'Search input not found';

            const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSet.call(searchInput, '${query}');
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));

            // Also click the Search button to trigger handlePerformSearch immediately
            const submitBtn = document.querySelector('.search-submit-btn');
            if (submitBtn) {
                submitBtn.click();
            }

            return 'Typed "${query}" and submitted search';
        })()
    `;

    const res = await evaluate(script);
    console.log('Search trigger result:', res);
    ws.close();
}

performSearch().catch(console.error);
