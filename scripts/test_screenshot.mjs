import { adbDevice } from './adb_tool.mjs';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
const pngPath = path.join(ARTIFACT_DIR, 'live_screen_test.png');

try {
    console.log('Capturing screenshot via adb exec-out...');
    const buf = adbDevice(['exec-out', 'screencap', '-p'], { encoding: 'buffer', timeout: 10000 });
    fs.writeFileSync(pngPath, buf);
    console.log(`Saved screenshot to ${pngPath} (${buf.length} bytes)`);
} catch (e) {
    console.error('exec-out failed:', e.message);
    try {
        console.log('Trying alternative /sdcard/s.png capture...');
        adbDevice(['shell', 'screencap', '-p', '/sdcard/s.png']);
        adbDevice(['pull', '/sdcard/s.png', pngPath]);
        console.log(`Pulled from /sdcard/s.png: ${fs.statSync(pngPath).size} bytes`);
    } catch(e2) {
        console.error('Alternative also failed:', e2.message);
    }
}
