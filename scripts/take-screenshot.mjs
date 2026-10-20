import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const outPath = resolve(process.argv[2] || 'screenshot.png');
const adbPath = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`;

try {
  // Capture to device file first to prevent Windows stdout pipe deadlock
  execFileSync(adbPath, ['-s', 'emulator-5554', 'shell', 'screencap', '-p', '/sdcard/snap.png'], { timeout: 15000 });
  execFileSync(adbPath, ['-s', 'emulator-5554', 'pull', '/sdcard/snap.png', outPath], { timeout: 15000 });
  execFileSync(adbPath, ['-s', 'emulator-5554', 'shell', 'rm', '-f', '/sdcard/snap.png'], { timeout: 5000 });
  console.log(`Saved screenshot successfully to ${outPath}`);
} catch (e) {
  console.error('Screenshot failed:', e.message);
  process.exit(1);
}
