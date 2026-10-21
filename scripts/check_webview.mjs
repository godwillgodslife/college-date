import { execSync } from 'node:child_process';
import path from 'node:path';

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const pid = execSync(`"${adbPath}" -s emulator-5554 shell pidof com.collegedate.app`).toString().trim();
console.log('PID:', pid);
try { execSync(`"${adbPath}" -s emulator-5554 forward --remove tcp:9222`); } catch(_) {}
execSync(`"${adbPath}" -s emulator-5554 forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

const res = await fetch('http://127.0.0.1:9222/json');
const pages = await res.json();
console.log('Pages:', pages);
