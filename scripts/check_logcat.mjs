import { adbDevice } from './adb_tool.mjs';

try {
    const log = adbDevice(['logcat', '-d', '*:E']);
    const lines = log.split('\n')
        .filter(l => l.includes('collegedate') || l.includes('FATAL') || l.includes('AndroidRuntime') || l.includes('chromium'))
        .slice(-30);
    console.log('Recent Logcat Errors:\n' + lines.join('\n'));
} catch (e) {
    console.error('Error fetching logcat:', e.message);
}
