import { execSync } from 'child_process';
import path from 'path';

const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const ADB = `"${ADB_PATH}" -s 127.0.0.1:5555`;

try {
    execSync(`"${ADB_PATH}" start-server`);
    execSync(`"${ADB_PATH}" connect 127.0.0.1:5555`);
    const unixOut = execSync(`${ADB} shell cat /proc/net/unix`, { encoding: 'utf8' });
    const matches = [...unixOut.matchAll(/@(webview_devtools_remote_\d+)/g)];
    console.log(`Found ${matches.length} webview socket(s): ${matches.map(m => m[1]).join(', ')}`);
    if (matches.length > 0) {
        const socket = matches[matches.length - 1][1];
        execSync(`${ADB} forward tcp:9222 localabstract:${socket}`);
        console.log(`Forwarded tcp:9222 to ${socket}`);
    } else {
        console.log('No webview socket found. Launching com.collegedate.app...');
        execSync(`${ADB} shell am start -n com.collegedate.app/.MainActivity`);
    }
} catch (e) {
    console.error('Error in forward_and_test:', e.message);
}
