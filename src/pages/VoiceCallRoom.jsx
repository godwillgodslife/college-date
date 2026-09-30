import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { incrementCallMinutes } from '../services/profileService';
import { useRef, useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../components/Toast';
import {
    respondCallSignal,
    toggleCallCamera,
    getCallSession,
    subscribeToCallSession
} from '../services/chatService';
import { getAgoraCallToken } from '../services/agoraTokenService';
import { supabase } from '../lib/supabase';
import './VoiceCallRoom.css';

async function loadAgoraRTC() {
    const module = await import('agora-rtc-sdk-ng');
    return module.default || module;
}

export default function VoiceCallRoom() {
    const { roomID } = useParams();
    const [searchParams] = useSearchParams();
    const callType = searchParams.get('type') === 'video' ? 'video' : 'voice';
    const matchIdParam = searchParams.get('matchId') || null;
    const initialTargetName = searchParams.get('name') || 'Campus Match';
    const initialTargetAvatar = searchParams.get('avatar') || null;

    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const MotionDiv = motion.div;

    // Agora & DOM Refs
    const clientRef = useRef(null);
    const localAudioTrackRef = useRef(null);
    const localVideoTrackRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);

    // Call state refs
    const callIdRef = useRef(roomID);
    const callSessionRef = useRef(null);
    const cleanedUpRef = useRef(false);
    const ringtoneRef = useRef(null);
    const timeoutTimerRef = useRef(null);
    const heartbeatRef = useRef(null);
    const sessionStartRef = useRef(0);
    const channelRef = useRef(null);

    // React States
    const [callState, setCallState] = useState('calling'); // 'calling', 'ringing', 'accepted', 'connected', 'ended', 'rejected'
    const [isConnecting, setIsConnecting] = useState(true);
    const [callError, setCallError] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [remoteCameraOff, setRemoteCameraOff] = useState(false);
    const [targetName, setTargetName] = useState(initialTargetName);
    const [targetAvatar, setTargetAvatar] = useState(initialTargetAvatar);
    const [callSeconds, setCallSeconds] = useState(0);

    const isPremium = userProfile?.is_premium || false;
    const currentMinsToday = userProfile?.call_minutes_today || 0;
    const limitReached = !isPremium && currentMinsToday >= 20;

    // Helper: format duration
    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Tone Generator: Web Audio ringback tone
    const stopRingtone = useCallback(() => {
        if (!ringtoneRef.current) return;
        try {
            if (ringtoneRef.current.audioCtx && ringtoneRef.current.audioCtx.state !== 'closed') {
                ringtoneRef.current.stop();
            }
        } catch (e) {
            console.warn('Ringtone cleanup error:', e);
        }
        ringtoneRef.current = null;
    }, []);

    const startRingtone = useCallback(() => {
        if (ringtoneRef.current) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const audioCtx = new AudioCtx();
            let isStopped = false;

            const playPulse = () => {
                if (isStopped || audioCtx.state === 'closed') return;
                try {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 1.2);

                    setTimeout(() => {
                        if (!isStopped && audioCtx.state !== 'closed') playPulse();
                    }, 2500);
                } catch (err) {
                    console.warn('Ring pulse error:', err);
                }
            };

            playPulse();
            ringtoneRef.current = {
                audioCtx,
                stop: () => {
                    isStopped = true;
                    if (audioCtx.state !== 'closed') audioCtx.close();
                }
            };
        } catch (e) {
            console.warn('Start ringtone error:', e);
        }
    }, []);

    // Cleanup Everything & Exit
    const cleanupCall = useCallback(async (notifyBackend = false, reason = 'ended') => {
        if (cleanedUpRef.current) return;
        cleanedUpRef.current = true;

        stopRingtone();

        if (timeoutTimerRef.current) {
            clearTimeout(timeoutTimerRef.current);
            timeoutTimerRef.current = null;
        }

        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        // Close local audio track
        if (localAudioTrackRef.current) {
            try {
                localAudioTrackRef.current.stop();
                localAudioTrackRef.current.close();
            } catch (e) {
                console.warn('Stop audio track error:', e);
            }
            localAudioTrackRef.current = null;
        }

        // Close local video track
        if (localVideoTrackRef.current) {
            try {
                localVideoTrackRef.current.stop();
                localVideoTrackRef.current.close();
            } catch (e) {
                console.warn('Stop video track error:', e);
            }
            localVideoTrackRef.current = null;
        }

        // Leave Agora channel
        if (clientRef.current) {
            try {
                await clientRef.current.leave();
            } catch (e) {
                console.warn('Leave Agora error:', e);
            }
            clientRef.current = null;
        }

        // Notify backend if requested
        if (notifyBackend && callIdRef.current) {
            try {
                await respondCallSignal(callIdRef.current, reason);
            } catch (e) {
                console.warn('Signal call exit error:', e);
            }
        }
    }, [stopRingtone]);

    // Handle end/cancel action from button
    const handleEndCall = async () => {
        const isCallingState = ['calling', 'ringing'].includes(callState);
        const action = isCallingState ? 'cancelled' : 'ended';
        await cleanupCall(true, action);
        navigate(-1);
    };

    // Freemium 20 min timer
    const startFreemiumHeartbeat = useCallback(() => {
        if (userProfile?.is_premium || heartbeatRef.current) return;

        heartbeatRef.current = setInterval(async () => {
            if (!currentUser?.id) return;
            const { data } = await incrementCallMinutes(currentUser.id, 1);
            if (data && data.call_minutes_today >= 19.5) {
                addToast('You have 30 seconds left in your daily call limit.', 'warning');
            }
            if (data && data.call_minutes_today >= 20) {
                alert('Your 20-minute daily call limit has been reached. Upgrade to Premium for unlimited calls.');
                await cleanupCall(true, 'timeout');
                navigate(-1);
            }
        }, 60000);
    }, [userProfile?.is_premium, currentUser?.id, addToast, cleanupCall, navigate]);

    // Main Call Initialization
    useEffect(() => {
        let isMounted = true;

        const initializeCall = async () => {
            if (!currentUser?.id || limitReached) return;

            try {
                setIsConnecting(true);
                setCallError('');

                // 1. Resolve Call Session and target details
                let activeCallId = roomID;
                let activeSession = null;

                const { data: sessionData } = await getCallSession(roomID);
                if (sessionData) {
                    activeSession = sessionData;
                    callIdRef.current = sessionData.id;
                    callSessionRef.current = sessionData;
                } else if (matchIdParam || roomID) {
                    // Look up latest session for match
                    const targetMatchId = matchIdParam || roomID;
                    const { data: foundSession } = await supabase
                        .from('call_sessions')
                        .select('*')
                        .eq('match_id', targetMatchId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (foundSession) {
                        activeSession = foundSession;
                        callIdRef.current = foundSession.id;
                        callSessionRef.current = foundSession;
                        activeCallId = foundSession.id;
                    }
                }

                // Resolve other user profile details
                const otherUserId = activeSession
                    ? (activeSession.caller_id === currentUser.id ? activeSession.receiver_id : activeSession.caller_id)
                    : null;

                if (otherUserId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', otherUserId)
                        .maybeSingle();

                    if (profile && isMounted) {
                        if (profile.full_name) setTargetName(profile.full_name);
                        if (profile.avatar_url) setTargetAvatar(profile.avatar_url);
                    }
                }

                const isCaller = !activeSession || activeSession.caller_id === currentUser.id;

                // 2. Subscribe to Realtime Session Updates for immediate rejection & camera sync
                const channel = subscribeToCallSession(
                    activeCallId,
                    async (newSession) => {
                        if (!isMounted || cleanedUpRef.current) return;

                        // Strict Termination Handler:
                        // If peer rejected, ended, cancelled, or timed out -> immediately exit!
                        if (['rejected', 'ended', 'cancelled', 'timeout', 'busy', 'failed'].includes(newSession.call_state)) {
                            stopRingtone();
                            const reasonMap = {
                                rejected: 'Call declined',
                                ended: 'Call ended',
                                cancelled: 'Call cancelled',
                                timeout: 'Call unanswered',
                                busy: 'User is busy'
                            };
                            addToast(reasonMap[newSession.call_state] || 'Call ended', 'info');
                            await cleanupCall(false, newSession.call_state);
                            navigate(-1);
                            return;
                        }

                        // Peer camera toggle synchronization
                        const remoteOff = isCaller ? newSession.receiver_camera_off : newSession.caller_camera_off;
                        setRemoteCameraOff(Boolean(remoteOff));

                        // Call accepted
                        if (newSession.call_state === 'accepted') {
                            stopRingtone();
                            setCallState('accepted');
                        }
                    },
                    () => {}
                );
                channelRef.current = channel;

                // 3. Pre-flight hardware media permission check to prime WebView permissions
                try {
                    const permCheck = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: callType === 'video'
                    });
                    permCheck.getTracks().forEach((t) => t.stop());
                } catch (permErr) {
                    console.warn('[Agora] Media permission pre-check:', permErr);
                }

                // 4. Load Agora Web SDK
                const AgoraRTC = await loadAgoraRTC();
                try {
                    AgoraRTC.setLogLevel(2);
                    AgoraRTC.onAudioAutoplayFailed = () => {
                        console.warn('[Agora] Audio autoplay restricted by WebView. Resuming on user interaction.');
                        const unlock = () => {
                            AgoraRTC.resumeAudioContext?.();
                            document.removeEventListener('click', unlock);
                            document.removeEventListener('touchstart', unlock);
                        };
                        document.addEventListener('click', unlock, { once: true });
                        document.addEventListener('touchstart', unlock, { once: true });
                    };
                } catch (_) {}

                // 5. Fetch Agora Token from server
                const resolvedMatchId = activeSession?.match_id || matchIdParam || roomID;
                const tokenPayload = await getAgoraCallToken({
                    roomID: resolvedMatchId,
                    userName: currentUser?.full_name || 'User',
                    callType,
                });

                // 6. Create Agora Client
                const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
                clientRef.current = client;

                // Handle Remote Tracks
                client.on('user-published', async (user, mediaType) => {
                    await client.subscribe(user, mediaType);
                    if (mediaType === 'audio') {
                        // Play remote audio through Agora's engine at full volume
                        try {
                            user.audioTrack?.setVolume(100);
                            user.audioTrack?.play();
                        } catch (agoraAudioErr) {
                            console.warn('[Agora] Audio play warning:', agoraAudioErr);
                        }

                        // Native WebAudio / HTMLAudioElement backup stream attachment
                        try {
                            const mediaStreamTrack = user.audioTrack?.getMediaStreamTrack();
                            if (mediaStreamTrack && remoteAudioRef.current) {
                                const stream = new MediaStream([mediaStreamTrack]);
                                remoteAudioRef.current.srcObject = stream;
                                remoteAudioRef.current.play().catch((e) => console.warn('Native remote audio play error:', e));
                            }
                        } catch (nativeAudioErr) {
                            console.warn('[Agora] Backup audio attach error:', nativeAudioErr);
                        }
                    }
                    if (mediaType === 'video') {
                        setRemoteCameraOff(false);
                        if (remoteVideoRef.current) {
                            user.videoTrack?.play(remoteVideoRef.current);
                        }
                    }
                    setIsConnecting(false);
                    setCallState('connected');
                    stopRingtone();
                    startFreemiumHeartbeat();
                    sessionStartRef.current = Date.now();
                });

                client.on('user-unpublished', (user, mediaType) => {
                    if (mediaType === 'video') {
                        setRemoteCameraOff(true);
                    }
                });

                client.on('user-left', async () => {
                    addToast('Call ended', 'info');
                    await cleanupCall(true, 'ended');
                    navigate(-1);
                });

                // 6. Join Agora Channel
                await client.join(
                    tokenPayload.appID,
                    tokenPayload.channelName,
                    tokenPayload.token,
                    tokenPayload.userID,
                );

                // 7. Create and Publish Local Tracks
                // STRICT AUDIO IMMUTABILITY: Voice calls NEVER create/publish video track
                const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                    encoderConfig: 'speech_standard',
                    AEC: true,
                    ANS: true,
                    AGC: true,
                });
                localAudioTrackRef.current = audioTrack;

                const tracksToPublish = [audioTrack];

                if (callType === 'video') {
                    const videoTrack = await AgoraRTC.createCameraVideoTrack({
                        encoderConfig: '480p_1',
                        facingMode: 'user',
                    });
                    localVideoTrackRef.current = videoTrack;
                    tracksToPublish.push(videoTrack);
                    if (localVideoRef.current) {
                        videoTrack.play(localVideoRef.current);
                    }
                }

                await client.publish(tracksToPublish);

                // Check if remote user is already in channel
                if (client.remoteUsers && client.remoteUsers.length > 0) {
                    for (const remoteUser of client.remoteUsers) {
                        if (remoteUser.hasAudio) {
                            await client.subscribe(remoteUser, 'audio');
                            remoteUser.audioTrack?.play();
                        }
                        if (remoteUser.hasVideo && callType === 'video') {
                            await client.subscribe(remoteUser, 'video');
                            if (remoteVideoRef.current) {
                                remoteUser.videoTrack?.play(remoteVideoRef.current);
                            }
                        }
                    }
                    setIsConnecting(false);
                    setCallState('connected');
                    stopRingtone();
                    startFreemiumHeartbeat();
                    sessionStartRef.current = Date.now();
                } else if (isCaller) {
                    startRingtone();
                    setCallState('calling');

                    // 30-Second Authoritative Unanswered Timeout
                    timeoutTimerRef.current = setTimeout(async () => {
                        if (callState !== 'connected' && !cleanedUpRef.current) {
                            addToast('Call unanswered', 'info');
                            await cleanupCall(true, 'timeout');
                            navigate(-1);
                        }
                    }, 30000);
                } else {
                    setCallState('connecting');
                }
            } catch (err) {
                console.error('[Agora] Call setup error:', err);
                if (isMounted) {
                    setCallError(err.message || 'Unable to establish call connection.');
                    setIsConnecting(false);
                }
                await cleanupCall(true, 'failed');
            }
        };

        initializeCall();

        return () => {
            isMounted = false;
            cleanupCall(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomID]);

    // Duration timer
    useEffect(() => {
        if (callState !== 'connected') return;
        const timer = setInterval(() => {
            setCallSeconds((s) => s + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [callState]);

    // Audio Mute Toggle
    const toggleMute = async () => {
        if (!localAudioTrackRef.current) return;
        const nextMuted = !isMuted;
        try {
            await localAudioTrackRef.current.setEnabled(!nextMuted);
            setIsMuted(nextMuted);
        } catch (e) {
            console.warn('Toggle mute error:', e);
        }
    };

    // Camera Toggle (Video Call Only)
    const handleToggleCamera = async () => {
        if (callType !== 'video' || !localVideoTrackRef.current) return;
        const nextCameraOff = !isCameraOff;
        try {
            await localVideoTrackRef.current.setEnabled(!nextCameraOff);
            setIsCameraOff(nextCameraOff);

            if (callIdRef.current) {
                await toggleCallCamera(callIdRef.current, nextCameraOff);
            }
        } catch (e) {
            console.warn('Toggle camera error:', e);
        }
    };

    // ── Limit Reached Screen ──────────────────────────────────
    if (limitReached) {
        return (
            <div className="limit-reached-overlay">
                <div className="limit-card">
                    <span className="limit-icon">⏳</span>
                    <h2>Daily Limit Reached</h2>
                    <p>Freemium students get 20 minutes of calls per day. Upgrade to Premium for unlimited voice and video calls.</p>
                    <button className="btn-upgrade" onClick={() => navigate('/premium')}>Upgrade to Premium 👑</button>
                    <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>
        );
    }

    // ── Error Screen ──────────────────────────────────────────
    if (callError) {
        return (
            <div className="limit-reached-overlay">
                <div className="limit-card">
                    <span className="limit-icon">⚠️</span>
                    <h2>Call Failed</h2>
                    <p>{callError}</p>
                    <button className="btn-upgrade" onClick={() => window.location.reload()}>Try Again</button>
                    <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`voice-call-room ${callType === 'video' ? 'is-video-call' : 'is-voice-call'}`}>
            <div className="voice-call-container">
                {/* ── STAGE AREA ── */}
                <div className="agora-stage">
                    {/* Voice Call: Dedicated Avatar & Audio Visualizer */}
                    {callType === 'voice' ? (
                        <div className="voice-audio-stage">
                            <div className="voice-avatar-container">
                                <div className={`audio-pulse-ring one ${callState === 'connected' ? 'active' : ''}`}></div>
                                <div className={`audio-pulse-ring two ${callState === 'connected' ? 'active' : ''}`}></div>
                                {targetAvatar ? (
                                    <img src={targetAvatar} alt={targetName} className="voice-stage-avatar" />
                                ) : (
                                    <div className="voice-stage-avatar-placeholder">
                                        {targetName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <h2 className="voice-stage-name">{targetName}</h2>
                            <div className="voice-stage-status">
                                {callState === 'connected' ? (
                                    <span className="badge-connected">● {formatDuration(callSeconds)}</span>
                                ) : (
                                    <span className="badge-ringing">Calling...</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Video Call: Video Grid & Camera-Off Avatar Fallback */
                        <div className="video-stage-grid">
                            {/* Remote Video Stream */}
                            <div className="remote-video-container">
                                <div
                                    ref={remoteVideoRef}
                                    className={`remote-video-stream ${remoteCameraOff ? 'is-hidden' : ''}`}
                                    style={{ width: '100%', height: '100%' }}
                                />

                                {/* Remote Camera-Off Fallback: Shows Remote Avatar */}
                                {remoteCameraOff && (
                                    <div className="remote-camera-off-card">
                                        <div className="remote-camera-off-avatar-wrap">
                                            {targetAvatar ? (
                                                <img src={targetAvatar} alt={targetName} className="remote-camera-off-avatar" />
                                            ) : (
                                                <div className="remote-camera-off-placeholder">
                                                    {targetName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <h3>{targetName}</h3>
                                        <p>Camera is turned off</p>
                                    </div>
                                )}

                                {/* Waiting for Remote Video Stream */}
                                {!remoteCameraOff && callState !== 'connected' && (
                                    <div className="agora-waiting-card">
                                        <div className="calling-avatar">
                                            {targetAvatar ? (
                                                <img src={targetAvatar} alt={targetName} className="avatar-img-fit" />
                                            ) : (
                                                targetName.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <h2>{targetName}</h2>
                                        <p>Connecting video feed...</p>
                                    </div>
                                )}
                            </div>

                            {/* Local Video Stream (PIP) */}
                            <div className={`agora-local-video ${isCameraOff ? 'is-off' : ''}`}>
                                <div
                                    ref={localVideoRef}
                                    className={isCameraOff ? 'is-hidden' : ''}
                                    style={{ width: '100%', height: '100%' }}
                                />
                                {isCameraOff && (
                                    <div className="local-off-placeholder">
                                        <span>Camera Off</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Hidden backup audio element for native WebView playout */}
                    <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
                </div>

                {/* ── CALL CONTROLS BAR ── */}
                <div className="agora-call-bar">
                    <button
                        type="button"
                        onClick={toggleMute}
                        className={`btn-control-icon ${isMuted ? 'is-active' : ''}`}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
                    </button>

                    {callType === 'video' && (
                        <button
                            type="button"
                            onClick={handleToggleCamera}
                            className={`btn-control-icon ${isCameraOff ? 'is-active' : ''}`}
                            aria-label={isCameraOff ? 'Camera On' : 'Camera Off'}
                        >
                            {isCameraOff ? '📹 Camera On' : '🚫 Camera Off'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleEndCall}
                        className="btn-end-call"
                        aria-label="End Call"
                    >
                        ✕ End
                    </button>
                </div>
            </div>

            {/* ── CALLING OVERLAY (OUTGOING RING) ── */}
            <AnimatePresence>
                {isConnecting && callState !== 'connected' && (
                    <MotionDiv
                        className="calling-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="calling-content">
                            <div className="calling-avatar-ring">
                                <div className="avatar-pulse one"></div>
                                <div className="avatar-pulse two"></div>
                                <div className="calling-avatar">
                                    {targetAvatar ? (
                                        <img src={targetAvatar} alt={targetName} className="avatar-img-fit" />
                                    ) : (
                                        targetName.charAt(0).toUpperCase()
                                    )}
                                </div>
                            </div>

                            <h2 className="calling-name">Calling {targetName}...</h2>
                            <p className="calling-status">
                                {callState === 'accepted' ? 'Connecting secure Agora feed...' : 'Ringing...'}
                            </p>

                            <button className="btn-cancel-call" onClick={handleEndCall}>
                                <span className="btn-icon">✕</span>
                                End Call
                            </button>
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
}
