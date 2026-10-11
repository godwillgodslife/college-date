// scripts/cdp-test-clear.mjs
// Test clearing search

async function testClear() {
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

    const clearRes = await evaluate(`
        (() => {
            const clearBtn = document.querySelector('.search-clear-btn');
            if (clearBtn) {
                clearBtn.click();
                return 'Clicked .search-clear-btn';
            }
            return 'No clear btn found';
        })()
    `);
    console.log('Clear result:', clearRes.result?.value);

    await new Promise(r => setTimeout(r, 1500));

    const checkRes = await evaluate(`
        (() => {
            const input = document.querySelector('.explore-search-input');
            const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => c.innerText);
            const feedback = document.querySelector('.search-results-feedback');
            return {
                inputVal: input?.value,
                cardCount: cards.length,
                hasFeedback: !!feedback
            };
        })()
    `);
    console.log('State after clear:', JSON.stringify(checkRes.result?.value, null, 2));

    ws.close();
}

testClear().catch(console.error);
