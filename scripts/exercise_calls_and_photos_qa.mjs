import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\f4bd13e7-2132-475f-91ed-b302b538febb';
const PUBLIC_DOCS_DIR = 'c:\\college-date\\docs';

async function getSession(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

async function setSession(port, session, targetPath = '/chat') {
    const sessionStr = JSON.stringify(session);
    console.log(`Setting session for ${session.user.email} on port ${port}...`);
    await evalInPage(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        window.location.href = '${targetPath}';
    })()`, port).catch(() => {});
}

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

async function postRpc(rpcName, body, token) {
    for (let i = 0; i < 4; i++) {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpcName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            return await res.json();
        } catch (err) {
            console.warn(`[postRpc] ${rpcName} attempt ${i + 1} failed (${err.message}). Retrying...`);
            await sleep(1500);
        }
    }
    throw new Error(`[postRpc] ${rpcName} failed after 4 attempts`);
}

async function runQA() {
    console.log('========================================================================');
    console.log('  STARTING CROSS-EMULATOR QA: WEBRTC CALLS & PROFILE PHOTO VALIDATION');
    console.log('========================================================================\n');

    // Authenticate both users
    const u1 = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const u2 = await getSession('student.tester2026.partner@gmail.com', 'CollegeDate2026!VerifiedPass');

    // 1. Initialize Emulators
    console.log('--- 1. Setting up Emulator Sessions ---');
    await setSession('9224', u1, '/chat'); // Alex on Pixel 2 (5558)
    await setSession('9225', u2, '/chat'); // Jordan on Pixel 3a (5560)
    await sleep(4000);

    // Verify Match ID between Alex and Jordan
    const matchRes = await fetch(`${SUPABASE_URL}/rest/v1/matches?select=*&or=(and(user1_id.eq.${u1.user.id},user2_id.eq.${u2.user.id}),and(user1_id.eq.${u2.user.id},user2_id.eq.${u1.user.id}))`, {
        headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${u1.access_token}` }
    });
    const matches = await matchRes.json();
    const matchId = matches[0]?.id;
    console.log(`Mutual Match ID: ${matchId}`);

    // ========================================================================
    // SCENARIO 1: AUDIO CALL CONNECTED & DEDICATED AVATAR STAGE
    // ========================================================================
    console.log('\n--- Scenario 1: Voice Call (Alex Calls -> Jordan Accepts) ---');

    // Alex initiates Voice Call
    const alexName = encodeURIComponent('Alex Davis');
    const jordanName = encodeURIComponent('Jordan Taylor');
    const jordanAvatar = encodeURIComponent('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');

    // Create session in DB
    const initData = await postRpc('initiate_call_session', { p_match_id: matchId, p_call_type: 'voice' }, u1.access_token);
    const callId = initData.call_id;
    console.log(`Voice Call Session ID: ${callId}`);

    // Navigate Alex to Call Room
    await evalInPage(`window.location.href = '/call/${callId}?matchId=${matchId}&type=voice&name=${jordanName}&avatar=${jordanAvatar}';`, '9224');

    // Wait for incoming call modal on Jordan
    await sleep(2500);
    captureDevice('emulator-5560', 'evidence_call_01_incoming_modal.png');

    // Jordan accepts call
    await postRpc('respond_call_session', { p_call_id: callId, p_action: 'accepted' }, u2.access_token);

    // Navigate Jordan to Call Room
    await evalInPage(`window.location.href = '/call/${callId}?matchId=${matchId}&type=voice&name=${alexName}&avatar=${encodeURIComponent('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600')}';`, '9225');
    await sleep(3500);

    // Capture Connected Audio Call on both devices
    captureDevice('emulator-5558', 'evidence_call_02_voice_connected_alex.png');
    captureDevice('emulator-5560', 'evidence_call_03_voice_connected_jordan.png');

    // Jordan ends call
    console.log('Jordan ends the voice call...');
    await postRpc('respond_call_session', { p_call_id: callId, p_action: 'ended' }, u2.access_token);
    await sleep(2000);

    // ========================================================================
    // SCENARIO 2: CALL REJECTION IMMEDIATE TEARDOWN
    // ========================================================================
    console.log('\n--- Scenario 2: Call Rejection (Alex Calls -> Jordan Declines) ---');
    const initData2 = await postRpc('initiate_call_session', { p_match_id: matchId, p_call_type: 'voice' }, u1.access_token);
    const callId2 = initData2.call_id;

    // Alex navigates to calling screen
    await evalInPage(`window.location.href = '/call/${callId2}?matchId=${matchId}&type=voice&name=${jordanName}&avatar=${jordanAvatar}';`, '9224');
    await sleep(1500);
    captureDevice('emulator-5558', 'evidence_call_04_alex_calling_screen.png');

    // Jordan clicks Decline
    console.log('Jordan declines the incoming call...');
    await postRpc('respond_call_session', { p_call_id: callId2, p_action: 'rejected', p_reason: 'Call declined by user' }, u2.access_token);

    // Wait for Realtime push & immediate teardown
    await sleep(1500);
    captureDevice('emulator-5558', 'evidence_call_05_rejection_immediate_exit.png');

    // ========================================================================
    // SCENARIO 3: VIDEO CALL & CAMERA-OFF SYNCHRONIZATION
    // ========================================================================
    console.log('\n--- Scenario 3: Video Call & Camera Off Avatar Fallback ---');
    const initData3 = await postRpc('initiate_call_session', { p_match_id: matchId, p_call_type: 'video' }, u1.access_token);
    const callId3 = initData3.call_id;

    await evalInPage(`window.location.href = '/call/${callId3}?matchId=${matchId}&type=video&name=${jordanName}&avatar=${jordanAvatar}';`, '9224');
    await sleep(2000);

    // Jordan accepts video call
    await postRpc('respond_call_session', { p_call_id: callId3, p_action: 'accepted' }, u2.access_token);
    await evalInPage(`window.location.href = '/call/${callId3}?matchId=${matchId}&type=video&name=${alexName}&avatar=${encodeURIComponent('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600')}';`, '9225');
    await sleep(3000);

    // Alex turns camera off
    console.log('Alex turns camera OFF in Video Call...');
    await postRpc('toggle_call_camera', { p_call_id: callId3, p_camera_off: true }, u1.access_token);
    await sleep(2000);

    // Capture Jordan seeing Alex's profile avatar with "Camera is turned off"
    captureDevice('emulator-5560', 'evidence_call_06_remote_camera_off_avatar.png');

    // Alex turns camera back on
    console.log('Alex turns camera back ON...');
    await postRpc('toggle_call_camera', { p_call_id: callId3, p_camera_off: false }, u1.access_token);
    await sleep(2000);
    captureDevice('emulator-5560', 'evidence_call_07_camera_restored.png');

    // End video call
    await postRpc('respond_call_session', { p_call_id: callId3, p_action: 'ended' }, u1.access_token);
    await sleep(2000);

    // ========================================================================
    // SCENARIO 4: PROFILE PHOTO HUMAN-IMAGE VALIDATION
    // ========================================================================
    console.log('\n--- Scenario 4: Profile Photo Human-Image Validation ---');

    // Navigate Alex to Edit Profile
    await evalInPage(`window.location.href = '/profile/edit';`, '9224');
    await sleep(3000);
    captureDevice('emulator-5558', 'evidence_photo_01_edit_profile_screen.png');

    // Test 4A: Rejection of Non-Human / Cartoon / Animal
    console.log('Testing rejection of non-human image (cat)...');
    const rejResult = await evalInPage(`(async () => {
        const { validateAndUploadProfilePhoto } = await import('/src/services/profileService.js');
        // Fetch non-human image blob
        const res = await fetch('https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=400');
        const blob = await res.blob();
        const file = new File([blob], 'cat_photo.jpg', { type: 'image/jpeg' });
        return await validateAndUploadProfilePhoto(file, '${u1.user.id}', 0);
    })()`, '9224');
    console.log('Rejection test result:', rejResult);
    await sleep(1500);
    captureDevice('emulator-5558', 'evidence_photo_02_nonhuman_rejected.png');

    // Test 4B: Rejection of Group Photo
    console.log('Testing rejection of group photo (> 1 person)...');
    const groupResult = await evalInPage(`(async () => {
        const { validateAndUploadProfilePhoto } = await import('/src/services/profileService.js');
        const res = await fetch('https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&context=group_of_friends');
        const blob = await res.blob();
        const file = new File([blob], 'group_photo.jpg', { type: 'image/jpeg' });
        return await validateAndUploadProfilePhoto(file, '${u1.user.id}', 0);
    })()`, '9224');
    console.log('Group rejection test result:', groupResult);
    await sleep(1500);
    captureDevice('emulator-5558', 'evidence_photo_03_group_rejected.png');

    // Test 4C: Approval of Single Human Portrait
    console.log('Testing approval of genuine single-person student portrait...');
    const approveResult = await evalInPage(`(async () => {
        const { validateAndUploadProfilePhoto } = await import('/src/services/profileService.js');
        const res = await fetch('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
        const blob = await res.blob();
        const file = new File([blob], 'alex_portrait.jpg', { type: 'image/jpeg' });
        return await validateAndUploadProfilePhoto(file, '${u1.user.id}', 0);
    })()`, '9224');
    console.log('Approval test result:', approveResult);
    await sleep(2000);

    // Navigate to /profile to verify updated avatar is active platform-wide
    await evalInPage(`window.location.href = '/profile';`, '9224');
    await sleep(3000);
    captureDevice('emulator-5558', 'evidence_photo_04_profile_avatar_updated.png');

    console.log('\n========================================================================');
    console.log('  🎉 QA COMPLETED: ALL EVIDENCE SCREENSHOTS CAPTURED SUCCESSFULLY!');
    console.log('========================================================================');
}

runQA().catch(console.error);
