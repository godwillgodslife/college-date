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

const info = await evalCDP(`
    (() => {
        const root = document.getElementById('root');
        const main = document.querySelector('main, .main-content, .app-content');
        const profile = document.querySelector('.profile-page, .profile-container, .profile');
        const err = document.querySelector('.error-boundary, .error-fallback');
        return {
            url: window.location.href,
            rootChildCount: root ? root.children.length : 0,
            rootHTMLSnippet: root ? root.innerHTML.slice(0, 500) : null,
            mainFound: !!main,
            mainHTMLSnippet: main ? main.innerHTML.slice(0, 500) : null,
            profileFound: !!profile,
            errorFound: !!err,
            errorText: err ? err.innerText : null
        };
    })()
`);
console.log('Profile DOM Info:', info);
ws.close();
