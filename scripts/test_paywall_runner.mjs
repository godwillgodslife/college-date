import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const ADB = `"${ADB_PATH}" -s emulator-5554`;

function log(msg) {
    console.log(`[TEST RUNNER] ${msg}`);
}

function runCmd(cmd) {
    return execSync(cmd, { encoding: 'utf8' }).trim();
}

async function main() {
    log('Ensuring ADB server is running...');
    try {
        runCmd(`"${ADB_PATH}" start-server`);
    } catch(e) {}

    log('Checking connected devices...');
    const devices = runCmd(`"${ADB_PATH}" devices`);
    log(`Devices:\n${devices}`);

    log('Checking if com.collegedate.app is installed...');
    const packages = runCmd(`${ADB} shell pm list packages`);
    const isInstalled = packages.includes('com.collegedate.app');
    log(`com.collegedate.app installed: ${isInstalled}`);

    if (!isInstalled) {
        log('Installing release/TheCollegeDate-2.2.65-vc62-manual-test.apk...');
        runCmd(`${ADB} install -r release/TheCollegeDate-2.2.65-vc62-manual-test.apk`);
        log('APK installed successfully.');
    }

    log('Launching com.collegedate.app...');
    runCmd(`${ADB} shell am start -n com.collegedate.app/.MainActivity`);

    log('Waiting 5s for app initialization...');
    await new Promise(r => setTimeout(r, 5000));

    // Capture initial screen
    if (!fs.existsSync('public/evidence_qa')) {
        fs.mkdirSync('public/evidence_qa', { recursive: true });
    }
    runCmd(`${ADB} shell screencap -p /sdcard/screen_initial.png`);
    runCmd(`${ADB} pull /sdcard/screen_initial.png public/evidence_qa/evidence_initial_launch.png`);
    log('Initial screen captured to public/evidence_qa/evidence_initial_launch.png');

    // Check devtools sockets
    const unixOut = runCmd(`${ADB} shell cat /proc/net/unix`);
    const matches = [...unixOut.matchAll(/@(webview_devtools_remote_\d+)/g)];
    log(`Found ${matches.length} webview socket(s): ${matches.map(m => m[1]).join(', ')}`);

    if (matches.length > 0) {
        const socket = matches[matches.length - 1][1];
        log(`Forwarding tcp:9222 to localabstract:${socket}...`);
        runCmd(`${ADB} forward tcp:9222 localabstract:${socket}`);
        log('Port forward complete on tcp:9222');
    }
}

main().catch(err => {
    console.error('Error in test runner:', err);
    process.exit(1);
});
