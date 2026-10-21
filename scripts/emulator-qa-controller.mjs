// scripts/emulator-qa-controller.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');

export async function connectEmulatorWebview() {
    // 1. Find active webview socket for com.collegedate.app
    const pid = execSync(`"${adbPath}" -s emulator-5554 shell pidof com.collegedate.app`).toString().trim();
    if (!pid) throw new Error('com.collegedate.app not running');

    const socketName = `webview_devtools_remote_${pid}`;

    // 2. Forward port 9222
    try { execSync(`"${adbPath}" -s emulator-5554 forward --remove tcp:9222`); } catch (_) {}
    execSync(`"${adbPath}" -s emulator-5554 forward tcp:9222 localabstract:${socketName}`);

    // 3. Query pages using fetch with timeout
    const res = await fetch('http://127.0.0.1:9222/json', { signal: AbortSignal.timeout(5000) });
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages.find(p => p.type === 'page') || pages[0];
    if (!page) throw new Error('No webview page found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
        ws.on('open', res);
        ws.on('error', rej);
    });

    let msgId = 1000;
    function evaluate(expr) {
        return new Promise((resolve) => {
            const id = ++msgId;
            const handler = (data) => {
                const parsed = JSON.parse(data.toString());
                if (parsed.id === id) {
                    ws.removeListener('message', handler);
                    resolve(parsed.result?.result?.value);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: {
                    expression: expr,
                    returnByValue: true,
                    awaitPromise: true
                }
            }));
        });
    }

    return {
        ws,
        evaluate,
        async navigate(route) {
            await evaluate(`
                (() => {
                    window.location.hash = '';
                    window.history.pushState({}, '', '${route}');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                })()
            `);
            // Wait for chunk loading and React Suspense
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 500));
                const isLoaded = await evaluate(`
                    (() => {
                        const loader = document.querySelector('.loading-screen, .loading-spinner, .app-loader');
                        return !loader && document.readyState === 'complete';
                    })()
                `);
                if (isLoaded) break;
            }
            await new Promise(r => setTimeout(r, 800));
        },
        async setTheme(mode) {
            await evaluate(`
                (() => {
                    const isDark = ${mode === 'dark'};
                    try {
                        localStorage.setItem('tcd_theme_preference', isDark ? 'dark' : 'light');
                        localStorage.setItem('theme', isDark ? 'dark' : 'light');
                    } catch (_) {}
                    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                    if (isDark) {
                        document.documentElement.classList.add('theme-dark');
                        document.documentElement.classList.remove('theme-light');
                        document.body.classList.remove('light-theme');
                    } else {
                        document.documentElement.classList.add('theme-light');
                        document.documentElement.classList.remove('theme-dark');
                        document.body.classList.add('light-theme');
                    }
                    window.dispatchEvent(new Event('storage'));
                })()
            `);
            await new Promise(r => setTimeout(r, 600));
        },
        async click(selector) {
            return await evaluate(`
                (() => {
                    const el = document.querySelector('${selector}');
                    if (el) {
                        el.click();
                        return true;
                    }
                    return false;
                })()
            `);
        },
        async scrollTo(selector) {
            return await evaluate(`
                (() => {
                    const el = document.querySelector('${selector}');
                    if (el) {
                        el.scrollIntoView({ behavior: 'instant', block: 'center' });
                        return true;
                    }
                    return false;
                })()
            `);
        },
        screencap(filename) {
            const outPath = path.resolve('public/evidence_qa', filename);
            const buf = execSync(`"${adbPath}" -s emulator-5554 exec-out screencap -p`, {
                maxBuffer: 20 * 1024 * 1024
            });
            fs.writeFileSync(outPath, buf);
            console.log(`Saved screenshot: public/evidence_qa/${filename} (${buf.length} bytes)`);
            return outPath;
        },
        close() {
            try { ws.close(); } catch (_) {}
        }
    };
}
