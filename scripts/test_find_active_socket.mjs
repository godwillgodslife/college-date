import { initConnection, adbDevice, adb } from './adb_tool.mjs';

initConnection();
const out = adbDevice(['shell', 'cat', '/proc/net/unix']);
const sockets = [...out.matchAll(/@(webview_devtools_remote_\d+)/g)].map(m => m[1]);
console.log('Available webview devtools sockets:', sockets);

for (const s of sockets) {
    console.log(`Testing socket: ${s}`);
    adbDevice(['forward', 'tcp:9222', `localabstract:${s}`]);
    try {
        const res = await fetch('http://127.0.0.1:9222/json', {
            headers: { Connection: 'close' },
            signal: AbortSignal.timeout(3000)
        });
        const targets = await res.json();
        console.log(`Success with socket ${s}! Found ${targets.length} targets:`);
        for (const t of targets) {
            console.log(` - [${t.type}] ${t.title} (${t.url})`);
        }
        break;
    } catch(e) {
        console.log(`Socket ${s} failed:`, e.message);
    }
}
