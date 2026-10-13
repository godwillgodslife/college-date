import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
const EVIDENCE_DIR = path.resolve('public/evidence_qa');
const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');

const targetPublic = path.join(EVIDENCE_DIR, 'evidence_real_notification_prepermission_sheet.png');
const targetArtifact = path.join(ARTIFACT_DIR, 'evidence_real_notification_prepermission_sheet.png');

execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'wait-for-device']);

const buf = execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'exec-out', 'screencap', '-p'], {
    maxBuffer: 15 * 1024 * 1024
});

fs.writeFileSync(targetPublic, buf);
fs.writeFileSync(targetArtifact, buf);
console.log(`[Captured Real Screen] evidence_real_notification_prepermission_sheet.png (${buf.length} bytes)`);
