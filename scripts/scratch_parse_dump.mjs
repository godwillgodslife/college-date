import { adbDevice } from './adb_tool.mjs';

const xml = adbDevice(['shell', 'cat', '/sdcard/dump2.xml']);
const re = /content-desc="([^"]+)"|text="([^"]+)"/g;
const texts = [];
let match;
while ((match = re.exec(xml)) !== null) {
  texts.push(match[1] || match[2]);
}
console.log('UI elements:', texts);
