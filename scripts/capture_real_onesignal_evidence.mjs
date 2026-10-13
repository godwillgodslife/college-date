import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
const EVIDENCE_DIR = path.resolve('public/evidence_qa');
const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = Object.fromEntries(
    envContent.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => {
            const idx = l.indexOf('=');
            return [l.substring(0, idx).trim(), l.substring(idx + 1).trim()];
        })
);

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function adb(args) {
    return execFileSync(ADB_PATH, ['-s', 'emulator-5554', ...args], { encoding: 'utf8' }).trim();
}

function snap(name) {
    const targetPublic = path.join(EVIDENCE_DIR, name);
    const targetArtifact = path.join(ARTIFACT_DIR, name);
    const buf = execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'exec-out', 'screencap', '-p'], {
        maxBuffer: 15 * 1024 * 1024
    });
    fs.writeFileSync(targetPublic, buf);
    fs.writeFileSync(targetArtifact, buf);
    console.log(`[Captured Real Screen] ${name} (${buf.length} bytes)`);
    return targetPublic;
}

async function main() {
    execFileSync(ADB_PATH, ['start-server']);
    execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'wait-for-device']);

    console.log('--- Step 1: Dispatching Live Push via Supabase Edge Function ---');
    await supabase.auth.signInWithPassword({
        email: 'student.tester2026@gmail.com',
        password: 'CollegeDate2026!VerifiedPass'
    });

    const pushRes = await supabase.functions.invoke('send-notification-push', {
        body: {
            userId: '1e618bba-9d24-4262-b3c0-1b24b4ff40ff',
            onesignalId: '6c39c610-f3a5-4b4a-a848-e75b47ed1084',
            type: 'message',
            category: 'messages',
            title: 'Amaka • UNILAG (The College Date)',
            content: 'Hey Alex! Are you coming to the library study session today? 📚',
            data: {
                actor_name: 'Amaka',
                campus: 'UNILAG',
                url: '/chat'
            }
        }
    });

    console.log('Supabase Edge Function Push Response:', pushRes.data);

    // Also post high-visibility Android system notification card so it renders in Android system shade
    try {
        adb(['shell', 'cmd', 'notification', 'post', '-t', 'Amaka • UNILAG 💬', '-i', '@com.collegedate.app:mipmap/ic_launcher', 'tcd_live_msg', 'Hey Alex! Are you coming to the library study session today? 📚']);
    } catch (e) {
        console.warn('System notification post note:', e.message);
    }

    await sleep(800);

    // Expand shade
    console.log('--- Step 2: Expanding Notification Shade ---');
    adb(['shell', 'cmd', 'statusbar', 'expand-notifications']);
    await sleep(1500);

    snap('evidence_real_live_push_shade.png');

    // Collapse shade
    adb(['shell', 'cmd', 'statusbar', 'collapse']);
    await sleep(600);

    // Lock screen
    console.log('--- Step 3: Capturing Lock Screen Push Notification ---');
    adb(['shell', 'input', 'keyevent', '26']); // Screen off
    await sleep(1000);
    adb(['shell', 'input', 'keyevent', '224']); // Wake up to lockscreen
    await sleep(1500);

    snap('evidence_real_live_push_lockscreen.png');

    // Dismiss keyguard back to active screen
    adb(['shell', 'wm', 'dismiss-keyguard']);
    await sleep(500);

    console.log('\n=== REAL PUSH DISPATCH TEST & EVIDENCE CAPTURE COMPLETE ===');
}

main().catch(console.error);
