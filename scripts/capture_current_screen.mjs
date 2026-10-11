import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const ADB = `"${ADB_PATH}" -s 127.0.0.1:5555`;

try {
    execSync(`"${ADB_PATH}" start-server`);
    execSync(`"${ADB_PATH}" connect 127.0.0.1:5555`);
    const targetDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    const pngPath = path.join(targetDir, 'emulator_current_screen.png');
    execSync(`${ADB} shell screencap -p /sdcard/screen.png`, { timeout: 10000 });
    execSync(`${ADB} pull /sdcard/screen.png "${pngPath}"`, { timeout: 10000 });
    console.log('Saved screenshot to:', pngPath);
    console.log('File size:', fs.statSync(pngPath).size, 'bytes');

    // Also check current activity
    const focus = execSync(`${ADB} shell dumpsys window | grep -E "mCurrentFocus|mFocusedApp"`, { timeout: 5000 }).toString();
    console.log('Current Focus:\n', focus);
} catch (e) {
    console.error('Error:', e.message);
}
