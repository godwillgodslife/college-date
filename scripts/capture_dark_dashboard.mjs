import { connectEmulatorWebview } from './emulator-qa-controller.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');

async function main() {
    const c = await connectEmulatorWebview();
    await c.setTheme('dark');
    await c.evaluate('window.scrollTo(0, 0)');
    await new Promise(r => setTimeout(r, 600));
    
    const buf1 = execSync(`"${adbPath}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 20 * 1024 * 1024 });
    fs.writeFileSync('public/evidence_qa/dashboard_dark_top.png', buf1);
    console.log('Saved dashboard_dark_top.png, size:', buf1.length);

    await c.scrollTo('.campus-quests-card');
    await new Promise(r => setTimeout(r, 600));

    const buf2 = execSync(`"${adbPath}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 20 * 1024 * 1024 });
    fs.writeFileSync('public/evidence_qa/dashboard_dark_quests.png', buf2);
    console.log('Saved dashboard_dark_quests.png, size:', buf2.length);

    c.close();
}

main().catch(console.error);
