import { adbDevice } from './adb_tool.mjs';

try {
    const out = adbDevice(['shell', 'dumpsys', 'activity', 'top']);
    const lines = out.split('\n').filter(l => l.includes('ACTIVITY') || l.includes('Hist') || l.includes('Resumed')).slice(-10);
    console.log('Top Activity Info:\n' + lines.join('\n'));
} catch (e) {
    console.error('Error fetching top activity:', e.message);
}
