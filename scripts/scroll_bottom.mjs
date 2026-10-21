import { connectEmulatorWebview } from './emulator-qa-controller.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');

async function main() {
    const c = await connectEmulatorWebview();
    await c.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(r => setTimeout(r, 600));
    
    const buf = execSync(`"${adbPath}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 20 * 1024 * 1024 });
    fs.writeFileSync('public/evidence_qa/dashboard_bottom_scrolled.png', buf);
    console.log('Saved bottom scrolled dashboard, size:', buf.length);
    c.close();
}

main().catch(console.error);
