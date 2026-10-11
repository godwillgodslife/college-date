import { initConnection, adbDevice } from './adb_tool.mjs';

initConnection();
adbDevice(['shell', 'uiautomator', 'dump', '/sdcard/window_dump.xml']);
const xml = adbDevice(['shell', 'cat', '/sdcard/window_dump.xml']);
const matches = [...xml.matchAll(/text="([^"]+)"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/g)];
console.log('Detected UI elements:');
for (const m of matches) {
    console.log(`- "${m[1]}" at ${m[2]}`);
}
