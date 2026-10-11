import { initConnection, adbDevice } from './adb_tool.mjs';

initConnection();
console.log('Waking up screen and unlocking...');
adbDevice(['shell', 'input', 'keyevent', '26']); // power
adbDevice(['shell', 'input', 'keyevent', '82']); // unlock
adbDevice(['shell', 'input', 'swipe', '540', '1800', '540', '400', '200']); // swipe up
console.log('Bringing com.collegedate.app to front...');
adbDevice(['shell', 'am', 'start', '-n', 'com.collegedate.app/.MainActivity']);
console.log('Done wake up.');
