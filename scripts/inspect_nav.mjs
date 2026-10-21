import WebSocket from 'ws';

const res = await fetch('http://127.0.0.1:9222/json');
const pages = await res.json();
const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

function evalCDP(expr) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === id) {
                if (data.error) reject(data.error);
                else if (data.result?.exceptionDetails) reject(data.result.exceptionDetails);
                else resolve(data.result?.result?.value);
            }
        };
        ws.send(JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
    });
}

const navItems = await evalCDP(`
    (() => {
        const items = Array.from(document.querySelectorAll('.bottom-nav-item, .bottom-nav a, .nav-item'));
        return items.map(el => {
            const r = el.getBoundingClientRect();
            return {
                text: el.innerText.trim(),
                x: r.x + r.width / 2,
                y: r.y + r.height / 2,
                width: r.width,
                height: r.height,
                href: el.getAttribute('href')
            };
        });
    })()
`);
console.log('Nav Items:', navItems);

// Click profile directly in DOM!
console.log('Clicking Profile item via DOM...');
const clicked = await evalCDP(`
    (() => {
        const items = Array.from(document.querySelectorAll('.bottom-nav-item, .bottom-nav a, .nav-item'));
        const prof = items.find(el => el.innerText.includes('Profile'));
        if (prof) {
            prof.click();
            return 'Profile clicked!';
        }
        return 'Profile item not found';
    })()
`);
console.log('Click result:', clicked);

await new Promise(r => setTimeout(r, 2000));
const url = await evalCDP('window.location.href');
console.log('Current URL after click:', url);

ws.close();
