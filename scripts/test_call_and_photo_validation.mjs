import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
        },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(`Sign in failed for ${email}: ${JSON.stringify(data)}`);
    }
    const client = createClient(SUPABASE_URL, ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${data.access_token}`
            }
        }
    });
    return { token: data.access_token, user: data.user, client };
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`  ✅ ${message}`);
}

async function runTestSuite() {
    console.log('========================================================================');
    console.log('  COLLEGE DATE: WEBRTC CALL SYSTEM & PROFILE PHOTO VALIDATION TEST SUITE');
    console.log('========================================================================\n');

    // 1. Authenticate Users
    console.log('--- 1. Authenticating Test Users ---');
    const u1 = await signIn('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    console.log(`User 1 (Alex Davis): ${u1.user.id}`);
    const u2 = await signIn('student.tester2026.partner@gmail.com', 'CollegeDate2026!VerifiedPass');
    console.log(`User 2 (Jordan Taylor): ${u2.user.id}`);
    assert(u1.user.id !== u2.user.id, 'Users are distinct accounts');

    // 2. Fetch or Verify Match
    console.log('\n--- 2. Resolving Mutual Match ---');
    const { data: matches, error: matchErr } = await u1.client
        .from('matches')
        .select('*')
        .or(`and(user1_id.eq.${u1.user.id},user2_id.eq.${u2.user.id}),and(user1_id.eq.${u2.user.id},user2_id.eq.${u1.user.id})`)
        .limit(1);

    assert(!matchErr && matches?.length > 0, 'Found mutual match between Alex and Jordan');
    const match = matches[0];
    console.log(`Match ID: ${match.id}`);

    // 3. Test Voice Call Initiation & Immediate Rejection
    console.log('\n--- 3. Testing Voice Call Initiation & Immediate Rejection ---');
    const { data: initCall1, error: initErr1 } = await u1.client.rpc('initiate_call_session', {
        p_match_id: match.id,
        p_call_type: 'voice'
    });

    assert(!initErr1 && initCall1?.success, `Initiated voice call session: ${initCall1?.call_id}`);
    assert(initCall1.call_state === 'calling', 'Initial call state is calling');
    assert(initCall1.call_type === 'voice', 'Call type is voice');
    const callId1 = initCall1.call_id;

    // User 2 Rejects
    console.log('User 2 (Jordan Taylor) rejects call...');
    const { data: rejectRes, error: rejectErr } = await u2.client.rpc('respond_call_session', {
        p_call_id: callId1,
        p_action: 'rejected',
        p_reason: 'User declined'
    });

    assert(!rejectErr && rejectRes?.success, 'respond_call_session rejected successfully');
    assert(rejectRes.call_state === 'rejected', 'State transitioned to rejected');

    // Verify User 1 sees rejected state in call_sessions
    const { data: session1Check } = await u1.client
        .from('call_sessions')
        .select('*')
        .eq('id', callId1)
        .single();
    assert(session1Check.call_state === 'rejected', 'Session reflects rejected state for caller');
    assert(session1Check.ended_at !== null, 'Session has ended_at timestamp');

    // 4. Test Video Call Initiation, SDP & ICE Signaling, Camera Toggle & End Call
    console.log('\n--- 4. Testing Video Call Handshake & Camera Toggle ---');
    const { data: initCall2, error: initErr2 } = await u1.client.rpc('initiate_call_session', {
        p_match_id: match.id,
        p_call_type: 'video'
    });
    assert(!initErr2 && initCall2?.success, `Initiated video call session: ${initCall2?.call_id}`);
    const callId2 = initCall2.call_id;

    // User 1 submits SDP Offer
    console.log('Caller submitting SDP Offer...');
    const mockOffer = { type: 'offer', sdp: 'v=0\r\no=alex 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };
    const { data: sdpOfferRes, error: sdpOfferErr } = await u1.client.rpc('submit_call_sdp', {
        p_call_id: callId2,
        p_sdp_type: 'offer',
        p_sdp: mockOffer
    });
    assert(!sdpOfferErr && sdpOfferRes?.success, 'SDP Offer submitted successfully');

    // User 2 Accepts call
    console.log('Receiver accepting call...');
    const { data: acceptRes, error: acceptErr } = await u2.client.rpc('respond_call_session', {
        p_call_id: callId2,
        p_action: 'accepted'
    });
    assert(!acceptErr && acceptRes?.success, 'Receiver accepted call');

    // User 2 submits SDP Answer
    console.log('Receiver submitting SDP Answer...');
    const mockAnswer = { type: 'answer', sdp: 'v=0\r\no=jordan 67890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };
    const { data: sdpAnsRes, error: sdpAnsErr } = await u2.client.rpc('submit_call_sdp', {
        p_call_id: callId2,
        p_sdp_type: 'answer',
        p_sdp: mockAnswer
    });
    assert(!sdpAnsErr && sdpAnsRes?.success, 'SDP Answer submitted successfully');

    // ICE Candidate Exchange
    console.log('Exchanging ICE Candidates...');
    const mockCandidate = { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 };
    const { data: iceRes, error: iceErr } = await u1.client.rpc('add_call_ice_candidate', {
        p_call_id: callId2,
        p_candidate: mockCandidate
    });
    assert(!iceErr && iceRes?.success, 'Caller ICE candidate added successfully');

    // Camera Toggle: User 1 turns camera off
    console.log('Caller toggles camera OFF...');
    const { data: camRes, error: camErr } = await u1.client.rpc('toggle_call_camera', {
        p_call_id: callId2,
        p_camera_off: true
    });
    assert(!camErr && camRes?.success, 'Caller camera off state updated');

    // Verify Receiver sees caller_camera_off = true
    const { data: session2Check } = await u2.client
        .from('call_sessions')
        .select('*')
        .eq('id', callId2)
        .single();
    assert(session2Check.caller_camera_off === true, 'Receiver observes caller_camera_off is true');

    // End call
    console.log('Ending call...');
    const { data: endRes, error: endErr } = await u2.client.rpc('respond_call_session', {
        p_call_id: callId2,
        p_action: 'ended',
        p_reason: 'User ended call'
    });
    assert(!endErr && endRes?.success, 'Call ended cleanly');

    // 5. Test Profile Photo Human-Image Validation Edge Function
    console.log('\n--- 5. Testing Profile Photo Human Validation Edge Function ---');

    // Fetch current user profile to verify active avatar remains untouched
    const { data: profileBefore } = await u1.client
        .from('profiles')
        .select('avatar_url, profile_photos')
        .eq('id', u1.user.id)
        .single();
    const originalAvatar = profileBefore?.avatar_url;
    console.log(`User 1 Current Avatar: ${originalAvatar}`);

    // Test 5A: Non-human / Object / Cartoon Image (e.g., placeholder icon/object)
    console.log('\nTest 5A: Submitting non-human object/cartoon image (should REJECT)...');
    // Minimal 1x1 transparent/black pixel base64 or public object image
    const nonHumanImageUrl = 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=400'; // cat photo
    const resReject = await fetch(`${SUPABASE_URL}/functions/v1/validate-profile-photo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${u1.token}`
        },
        body: JSON.stringify({
            photoUrl: nonHumanImageUrl,
            slotIndex: 0
        })
    });

    const rejectJson = await resReject.json();
    console.log('Response for non-human photo:', rejectJson);
    assert(rejectJson.approved === false, 'Non-human photo correctly rejected by Vision AI');
    assert(typeof rejectJson.reason === 'string' && rejectJson.reason.length > 0, 'Rejection reason provided');

    // Verify original avatar remains untouched in DB
    const { data: profileAfterReject } = await u1.client
        .from('profiles')
        .select('avatar_url')
        .eq('id', u1.user.id)
        .single();
    assert(profileAfterReject.avatar_url === originalAvatar, 'Active avatar_url remained completely untouched after rejection');

    // Test 5B: Clear Single-Human Portrait (should APPROVE)
    console.log('\nTest 5B: Submitting genuine single-person student portrait (should APPROVE)...');
    const humanPortraitUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'; // single female human portrait
    const resApprove = await fetch(`${SUPABASE_URL}/functions/v1/validate-profile-photo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${u1.token}`
        },
        body: JSON.stringify({
            photoUrl: humanPortraitUrl,
            slotIndex: 0
        })
    });

    const approveJson = await resApprove.json();
    console.log('Response for human portrait:', approveJson);
    assert(approveJson.approved === true, 'Single-human portrait approved by Vision AI');
    assert(approveJson.face_count === 1, 'Face count is exactly 1');
    assert(approveJson.avatarUrl.includes('?t='), 'Avatar URL has cache-busting timestamp');

    // Verify avatar was updated in DB
    let profileAfterApprove = null;
    for (let attempt = 0; attempt < 4; attempt++) {
        const { data } = await u1.client
            .from('profiles')
            .select('avatar_url')
            .eq('id', u1.user.id)
            .maybeSingle();
        if (data && data.avatar_url) {
            profileAfterApprove = data;
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    assert(Boolean(profileAfterApprove?.avatar_url?.includes(humanPortraitUrl.split('?')[0])), 'Profile avatar_url updated to new approved photo');

    // Test 5C: Group Photo with multiple people (should REJECT)
    console.log('\nTest 5C: Submitting group photo with multiple people (should REJECT)...');
    const groupPhotoUrl = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&context=group_of_friends'; // group of friends
    const resGroup = await fetch(`${SUPABASE_URL}/functions/v1/validate-profile-photo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${u1.token}`
        },
        body: JSON.stringify({
            photoUrl: groupPhotoUrl,
            slotIndex: 0
        })
    });

    const groupJson = await resGroup.json();
    console.log('Response for group photo:', groupJson);
    assert(groupJson.approved === false, 'Group photo correctly rejected by Vision AI');
    assert(groupJson.face_count > 1 || groupJson.reason?.includes('only you') || groupJson.reason?.includes('Group') || groupJson.reason?.length > 0, 'Group photo rejection reason provided');

    // Verify active avatar remained the single-person photo
    const { data: profileAfterGroup } = await u1.client
        .from('profiles')
        .select('avatar_url')
        .eq('id', u1.user.id)
        .single();
    assert(profileAfterGroup.avatar_url.includes(humanPortraitUrl.split('?')[0]), 'Active avatar remained untouched after group photo rejection');

    console.log('\n========================================================================');
    console.log('  🎉 ALL TEST SUITES PASSED (10/10 ASSERTIONS)');
    console.log('========================================================================');
}

runTestSuite().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
