import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
const EVIDENCE_DIR = path.resolve('public/evidence_qa');
const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function adb(args) {
    return execFileSync(ADB_PATH, ['-s', 'emulator-5554', ...args], { encoding: 'utf8' }).trim();
}

function snap(name) {
    const targetPublic = path.join(EVIDENCE_DIR, name);
    const targetArtifact = path.join(ARTIFACT_DIR, name);
    const buf = execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'exec-out', 'screencap', '-p'], {
        maxBuffer: 15 * 1024 * 1024
    });
    fs.writeFileSync(targetPublic, buf);
    fs.writeFileSync(targetArtifact, buf);
    console.log(`[Captured Real Screen] ${name} (${buf.length} bytes)`);
    return targetPublic;
}

async function main() {
    execFileSync(ADB_PATH, ['start-server']);
    execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'wait-for-device']);

    // Check active notifications
    const dump = adb(['shell', 'dumpsys', 'notification']);
    const lines = dump.split('\n');
    const matched = lines.filter(l => l.includes('com.collegedate.app') || l.includes('Amaka') || l.includes('College Date'));
    console.log('--- Matched Notification Dump Lines ---');
    console.log(matched.slice(0, 15).join('\n'));

    // Pull down notification shade to see the notification visually!
    console.log('\n--- Expanding Notification Shade ---');
    adb(['shell', 'cmd', 'statusbar', 'expand-notifications']);
    await sleep(1500);

    snap('evidence_real_onesignal_push_shade.png');

    // Collapse status bar
    adb(['shell', 'cmd', 'statusbar', 'collapse']);
    await sleep(500);

    // Now test lock screen state
    console.log('\n--- Testing Lockscreen State ---');
    // Lock screen (sleep)
    adb(['shell', 'input', 'keyevent', '26']); // power off
    await sleep(1000);
    // Wake up to lockscreen (do not unlock)
    adb(['shell', 'input', 'keyevent', '224']); // wake up
    await sleep(1500);

    snap('evidence_real_onesignal_push_lockscreen.png');

    // Unlock back to home screen
    adb(['shell', 'input', 'keyevent', '82']); // unlock
    await sleep(500);
}

main().catch(console.error);
