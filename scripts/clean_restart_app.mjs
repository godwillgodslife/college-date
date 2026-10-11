import { adbDevice } from './adb_tool.mjs';

console.log('Force-stopping com.collegedate.app...');
adbDevice(['shell', 'am', 'force-stop', 'com.collegedate.app']);

console.log('Clearing old port forwards...');
try {
    adbDevice(['forward', '--remove-all']);
} catch(e) {}

console.log('Launching com.collegedate.app fresh...');
adbDevice(['shell', 'monkey', '-p', 'com.collegedate.app', '-c', 'android.intent.category.LAUNCHER', '1']);

console.log('Waiting 4s for app and webview socket initialization...');
await new Promise(r => setTimeout(r, 4000));

const unixOut = adbDevice(['shell', 'cat', '/proc/net/unix']);
const matches = [...unixOut.matchAll(/@(webview_devtools_remote_\d+)/g)];
console.log('New webview sockets:', matches.map(m => m[1]));

if (matches.length > 0) {
    const socket = matches[0][1];
    adbDevice(['forward', 'tcp:9222', `localabstract:${socket}`]);
    console.log(`Forwarded tcp:9222 to ${socket}`);
}
