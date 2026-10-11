import { execSync } from 'child_process';
import path from 'path';

const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const unixOut = execSync(`"${ADB_PATH}" -s emulator-5554 shell cat /proc/net/unix`, { encoding: 'utf8' });
const matches = [...unixOut.matchAll(/@(webview_devtools_remote_\d+)/g)];
if (matches.length > 0) {
    const socket = matches[matches.length - 1][1];
    execSync(`"${ADB_PATH}" -s emulator-5554 forward tcp:9222 localabstract:${socket}`);
    console.log('Forwarded to', socket);
}
