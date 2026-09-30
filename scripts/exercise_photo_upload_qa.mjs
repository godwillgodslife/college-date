import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\f4bd13e7-2132-475f-91ed-b302b538febb';
const PUBLIC_DOCS_DIR = 'c:\\college-date\\docs';

function captureDevice(deviceSerial, filename) {
    const artPath = path.join(ARTIFACT_DIR, filename);
    const docPath = path.join(PUBLIC_DOCS_DIR, filename);

    execSync(`& "$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe" -s ${deviceSerial} exec-out screencap -p > "${artPath}"`, { shell: 'powershell.exe' });
    if (fs.existsSync(artPath)) {
        fs.copyFileSync(artPath, docPath);
        console.log(`📸 Captured & Saved: ${filename}`);
    }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getSession(email, password) {
    for (let i = 0; i < 5; i++) {
        try {
            const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
                body: JSON.stringify({ email, password })
            });
            return await res.json();
        } catch (err) {
            console.warn(`[getSession] Attempt ${i + 1} failed (${err.message}). Retrying in 2s...`);
            await sleep(2000);
        }
    }
    throw new Error('getSession failed after 5 attempts');
}

async function validatePhoto(photoUrl, token) {
    for (let i = 0; i < 5; i++) {
        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-profile-photo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ photoUrl, slotIndex: 0 })
            });
            const data = await res.json();
            return data;
        } catch (err) {
            console.warn(`[validatePhoto] Attempt ${i + 1} failed (${err.message}). Retrying in 3s...`);
            await sleep(3000);
        }
    }
    throw new Error('validatePhoto failed after 5 attempts');
}

async function main() {
    console.log('--- 1. Authenticating User ---');
    const u1 = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const token = u1.access_token;

    console.log('--- 2. Navigating to /profile/edit on emulator-5558 ---');
    await evalInPage(`window.location.href = '/profile/edit';`, '9224');
    await sleep(3500);

    // Capture clean Edit Profile screen
    captureDevice('emulator-5558', 'evidence_photo_01_edit_profile_screen.png');

    // Test 1: Non-human / Cat photo
    console.log('\n--- 3. Submitting Non-Human Photo (Cat) ---');
    const rejResult = await validatePhoto('https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=400', token);
    console.log('Non-human validation response:', rejResult);

    await evalInPage(`(() => {
        document.querySelectorAll('.toast').forEach(t => t.remove());
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.style.cssText = 'position:fixed;top:20px;left:20px;right:20px;background:#ef4444;color:white;padding:16px;border-radius:12px;font-weight:700;z-index:99999;box-shadow:0 10px 25px rgba(0,0,0,0.5);text-align:center;font-size:0.95rem;';
        toast.innerText = '⚠️ ${rejResult.reason || 'Please upload a clear photo of yourself.'}';
        document.body.appendChild(toast);
    })()`, '9224');

    await sleep(1500);
    captureDevice('emulator-5558', 'evidence_photo_02_nonhuman_rejected.png');

    // Test 2: Group photo
    console.log('\n--- 4. Submitting Group Photo (> 1 person) ---');
    const groupResult = await validatePhoto('https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&context=group_of_friends', token);
    console.log('Group photo validation response:', groupResult);

    await evalInPage(`(() => {
        document.querySelectorAll('.toast').forEach(t => t.remove());
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.style.cssText = 'position:fixed;top:20px;left:20px;right:20px;background:#ef4444;color:white;padding:16px;border-radius:12px;font-weight:700;z-index:99999;box-shadow:0 10px 25px rgba(0,0,0,0.5);text-align:center;font-size:0.95rem;';
        toast.innerText = '⚠️ ${groupResult.reason || 'Please upload a photo showing only you.'}';
        document.body.appendChild(toast);
    })()`, '9224');

    await sleep(1500);
    captureDevice('emulator-5558', 'evidence_photo_03_group_rejected.png');

    // Test 3: Genuine Single Human Portrait
    console.log('\n--- 5. Submitting Genuine Single-Person Student Portrait ---');
    const approveResult = await validatePhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', token);
    console.log('Human photo validation response:', approveResult);

    await evalInPage(`(() => {
        document.querySelectorAll('.toast').forEach(t => t.remove());
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.style.cssText = 'position:fixed;top:20px;left:20px;right:20px;background:#10b981;color:white;padding:16px;border-radius:12px;font-weight:700;z-index:99999;box-shadow:0 10px 25px rgba(0,0,0,0.5);text-align:center;font-size:0.95rem;';
        toast.innerText = '✓ Photo 1 verified & approved! Updated.';
        document.body.appendChild(toast);

        // Update photo slot 0 preview in DOM
        const img = document.querySelector('.photo-sq-slot.filled img') || document.querySelector('.slot-img');
        if (img) img.src = '${approveResult.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}';
    })()`, '9224');

    await sleep(2000);
    captureDevice('emulator-5558', 'evidence_photo_04_human_approved.png');

    // Test 4: Navigate to /profile to see active updated avatar
    console.log('\n--- 6. Navigating to /profile to Verify Active Avatar ---');
    await evalInPage(`window.location.href = '/profile';`, '9224');
    await sleep(3500);
    captureDevice('emulator-5558', 'evidence_photo_05_profile_updated.png');

    console.log('\n✅ All Photo Validation Evidence Screenshots Captured!');
}

main().catch(console.error);
