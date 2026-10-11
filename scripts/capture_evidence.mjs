import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const deviceId = 'emulator-5554';
const filename = process.argv[2] || 'evidence_screen.png';
const brainDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\bb74e284-b1b3-4e28-88e6-96344044680e';

if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
}

const targetPath = path.join(brainDir, filename);

try {
    execSync(`"${ADB_PATH}" -s ${deviceId} shell screencap -p /sdcard/screen.png`, { timeout: 10000 });
    execSync(`"${ADB_PATH}" -s ${deviceId} pull /sdcard/screen.png "${targetPath}"`, { timeout: 10000 });
    console.log(`Saved screenshot to: ${targetPath} (${fs.statSync(targetPath).size} bytes)`);
} catch (e) {
    console.error('Failed to capture screenshot:', e.message);
}
