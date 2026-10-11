import { initConnection, adbDevice, adb } from './adb_tool.mjs';

initConnection();
console.log('Devices:', adb(['devices']));
console.log('Boot completed:', adbDevice(['shell', 'getprop', 'sys.boot_completed']));
console.log('Top activity:', adbDevice(['shell', 'dumpsys', 'window', 'displays']));
