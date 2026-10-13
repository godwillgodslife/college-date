import fs from 'node:fs';
import { adbDevice } from './adb_tool.mjs';

const buf = adbDevice(['exec-out', 'screencap', '-p'], { encoding: 'buffer', maxBuffer: 15 * 1024 * 1024 });
fs.writeFileSync('public/evidence_qa/check_screen.png', buf);
console.log('Successfully saved screenshot of current screen, size:', buf.length);
