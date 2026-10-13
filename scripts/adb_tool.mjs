import { execFileSync } from 'child_process';
import path from 'path';

const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
let cachedDevice = 'emulator-5554';

export function adb(args, options = {}) {
    const res = execFileSync(ADB_PATH, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeout || 15000,
        maxBuffer: options.maxBuffer || 15 * 1024 * 1024,
        ...options
    });
    return typeof res === 'string' ? res.trim() : res;
}

export function initConnection() {
    try {
        adb(['start-server']);
    } catch(e) {}
}

export function getActiveDeviceId() {
    initConnection();
    try {
        const out = adb(['devices']);
        const lines = out.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('List of'));
        const online = lines.filter(l => l.includes('device') && !l.includes('offline'));
        // Prioritize emulator-5554
        const emu = online.find(l => l.includes('emulator-5554'));
        if (emu) {
            cachedDevice = 'emulator-5554';
            return 'emulator-5554';
        }
        if (online.length > 0) {
            const dev = online[0].split(/\s+/)[0].trim();
            cachedDevice = dev;
            return dev;
        }
    } catch(e) {}
    return 'emulator-5554';
}

export function adbDevice(args, options = {}) {
    const dev = cachedDevice || getActiveDeviceId();
    return adb(['-s', dev, ...args], options);
}
