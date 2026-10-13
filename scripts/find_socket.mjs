import { execSync } from 'child_process';
import path from 'path';

const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const out = execSync(`"${adb}" -s emulator-5554 shell cat /proc/net/unix`, { encoding: 'utf8' });
const lines = out.split('\n').filter(l => l.includes('devtools') || l.includes('webview') || l.includes('chrome'));
console.log('Sockets found:', lines);
