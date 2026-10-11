import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const filename = process.argv[2] || 'live_screen.png';
const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const targetPath = path.resolve(filename);

try {
    const buf = execSync(`"${adb}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 10 * 1024 * 1024 });
    fs.writeFileSync(targetPath, buf);
    console.log(`Saved screenshot to ${targetPath} (${buf.length} bytes)`);
} catch (err) {
    console.error('Failed to capture screenshot:', err.message);
    process.exit(1);
}
