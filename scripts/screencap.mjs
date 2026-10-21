import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const filename = process.argv[2] || 'public/evidence_qa/dashboard_live_now.png';
const adbPath = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const buf = execSync(`"${adbPath}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 20 * 1024 * 1024 });
fs.writeFileSync(filename, buf);
console.log(`Saved screenshot to ${filename} (${buf.length} bytes)`);
