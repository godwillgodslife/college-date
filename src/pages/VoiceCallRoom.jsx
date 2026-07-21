import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { incrementCallMinutes } from '../services/profileService';
import { useRef, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../components/Toast';
import { getAgoraCallToken } from '../services/agoraTokenService';
import './VoiceCallRoom.css';

export default function VoiceCallRoom() {
    const { roomID } = useParams();
    const [searchParams] = useSearchParams();
    const callType = searchParams.get('type') === 'video' ? 'video' : 'voice';
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const MotionDiv = motion.div;

    const clientRef = useRef(null);
    const localAudioTrackRef = useRef(null);
    const localVideoTrackRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideosRef = useRef(null);
    const heartbeatRef = useRef(null);
    const sessionStartRef = useRef(0);
    const hasStartedRef = useRef(false);
    const ringtoneRef = useRef(null);
    const connectTimeoutRef = useRef(null);
    const agoraRTCRef = useRef(null);

    const [isConnecting, setIsConnecting] = useState(true);
    const [callError, setCallError] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [remoteCount, setRemoteCount] = useState(0);

    const userFullName = userProfile?.full_name || 'User';
    const targetName = searchParams.get('name') || 'User';
    const currentMinsToday = userProfile?.call_minutes_today || 0;
    const isPremium = userProfile?.is_premium || false;
    const limitReached = !isPremium && currentMinsToday >= 20;

    const stopRingtone = () => {
        if (!ringtoneRef.current) return;
        try {
            if (ringtoneRef.current.audioCtx && ringtoneRef.current.audioCtx.state !== 'closed') {
                ringtoneRef.current.stop();
            }
        } catch (error) {
            console.warn('Ringtone cleanup failed:', error.message);
        }
        ringtoneRef.current = null;
    };

    const cleanupCall = async () => {
        if (connectTimeoutRef.current) {
            clearTimeout(connectTimeoutRef.current);
            connectTimeoutRef.current = null;
        }
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
        stopRingtone();

        for (const track of [localAudioTrackRef.current, localVideoTrackRef.current]) {
            if (!track) continue;
            try {
                track.stop();
                track.close();
            } catch (error) {
                console.warn('Agora track cleanup failed:', error.message);
            }
        }
        localAudioTrackRef.current = null;
        localVideoTrackRef.current = null;

        if (clientRef.current) {
            try {
                await clientRef.current.leave();
            } catch (error) {
                console.warn('Agora leave failed:', error.message);
            }
        }
        clientRef.current = null;
        hasStartedRef.current = false;
    };

    useEffect(() => {
        return () => {
            cleanupCall();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const requestMediaAccess = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera and microphone access is not available on this device.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video',
        });
        stream.getTracks().forEach((track) => track.stop());
    };

    const loadAgoraRTC = async () => {
        if (agoraRTCRef.current) return agoraRTCRef.current;
        const agoraModule = await import('agora-rtc-sdk-ng');
        agoraRTCRef.current = agoraModule.default || agoraModule;
        return agoraRTCRef.current;
    };

    const startRingtone = () => {
        if (ringtoneRef.current) return;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const playBeep = () => {
                if (!ringtoneRef.current || audioCtx.state === 'closed') return;

                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.5);

                setTimeout(() => {
                    if (ringtoneRef.current && audioCtx.state !== 'closed') playBeep();
                }, 1500);
            };

            ringtoneRef.current = {
                audioCtx,
                stop: () => {
                    if (audioCtx.state !== 'closed') audioCtx.close();
                },
            };
            playBeep();
        } catch (error) {
            console.error('Beep generator failed:', error);
        }
    };

    const startFreemiumHeartbeat = () => {
        if (userProfile?.is_premium || heartbeatRef.current) return;

        heartbeatRef.current = setInterval(async () => {
            const elapsedMs = Date.now() - (sessionStartRef.current || Date.now());
            const elapsedMins = Math.floor(elapsedMs / 60000);

            if (elapsedMins < 1) return;

            const { data } = await incrementCallMinutes(currentUser.id, 1);
            sessionStartRef.current = Date.now();

            if (data && data.call_minutes_today >= 19.5) {
                addToast('You have 30 seconds left in your daily call limit.', 'warning');
            }

            if (data && data.call_minutes_today >= 20) {
                alert('Your 20-minute daily call limit has been reached. Upgrade to Premium for unlimited calls.');
                await cleanupCall();
                navigate(-1);
            }
        }, 60000);
    };

    const attachRemoteVideo = (user) => {
        if (!remoteVideosRef.current || !user.videoTrack) return;

        const id = `agora-remote-${user.uid}`;
        let container = document.getElementById(id);
        if (!container) {
            container = document.createElement('div');
            container.id = id;
            container.className = 'agora-video-tile agora-remote-video';
            remoteVideosRef.current.appendChild(container);
        }
        user.videoTrack.play(container);
    };

    const removeRemoteVideo = (uid) => {
        const container = document.getElementById(`agora-remote-${uid}`);
        if (container) container.remove();
    };

    const startCall = async () => {
        if (limitReached || hasStartedRef.current) return;
        hasStartedRef.current = true;

        try {
            setIsConnecting(true);
            setCallError('');
            sessionStartRef.current = Date.now();
            await requestMediaAccess();

            const [tokenPayload, AgoraRTC] = await Promise.all([
                getAgoraCallToken({
                    roomID,
                    userName: userFullName,
                    callType,
                }),
                loadAgoraRTC(),
            ]);

            const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            clientRef.current = client;

            client.on('user-published', async (user, mediaType) => {
                await client.subscribe(user, mediaType);
                if (mediaType === 'audio') user.audioTrack?.play();
                if (mediaType === 'video') attachRemoteVideo(user);
                setRemoteCount(client.remoteUsers.length);
                stopRingtone();
            });

            client.on('user-unpublished', (user, mediaType) => {
                if (mediaType === 'video') removeRemoteVideo(user.uid);
                setRemoteCount(client.remoteUsers.length);
            });

            client.on('user-left', (user) => {
                removeRemoteVideo(user.uid);
                setRemoteCount(client.remoteUsers.length);
            });

            client.on('token-privilege-will-expire', async () => {
                const refreshed = await getAgoraCallToken({ roomID, userName: userFullName, callType });
                await client.renewToken(refreshed.token);
            });

            await client.join(
                tokenPayload.appID,
                tokenPayload.channelName,
                tokenPayload.token,
                tokenPayload.userID,
            );

            localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
            const tracksToPublish = [localAudioTrackRef.current];

            if (callType === 'video') {
                localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack({
                    encoderConfig: '480p_1',
                });
                tracksToPublish.push(localVideoTrackRef.current);
                if (localVideoRef.current) {
                    localVideoTrackRef.current.play(localVideoRef.current);
                }
            }

            await client.publish(tracksToPublish);
            setRemoteCount(client.remoteUsers.length);
            setIsConnecting(false);
            startRingtone();
            startFreemiumHeartbeat();

            connectTimeoutRef.current = setTimeout(() => {
                setIsConnecting(false);
                stopRingtone();
            }, 10000);
        } catch (error) {
            console.error('[Agora] Failed to start call:', error);
            setCallError(error.message || 'Unable to start the call.');
            setIsConnecting(false);
            await cleanupCall();
        }
    };

    const handleCallMount = (element) => {
        if (!element) return;
        startCall();
    };

    const toggleMute = async () => {
        if (!localAudioTrackRef.current) return;
        const nextMuted = !isMuted;
        await localAudioTrackRef.current.setEnabled(!nextMuted);
        setIsMuted(nextMuted);
    };

    const toggleCamera = async () => {
        if (!localVideoTrackRef.current) return;
        const nextCameraOff = !isCameraOff;
        await localVideoTrackRef.current.setEnabled(!nextCameraOff);
        setIsCameraOff(nextCameraOff);
    };

    const endCall = async () => {
        await cleanupCall();
        navigate(-1);
    };

    if (limitReached) {
        return (
            <div className="limit-reached-overlay">
                <div className="limit-card">
                    <span className="limit-icon">!</span>
                    <h2>Daily Limit Reached</h2>
                    <p>Freemium users get 20 minutes of calls per day. Upgrade to Premium for unlimited access.</p>
                    <button className="btn-upgrade" onClick={() => navigate('/premium')}>Upgrade to Premium</button>
                    <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>
        );
    }

    if (callError) {
        return (
            <div className="limit-reached-overlay">
                <div className="limit-card">
                    <span className="limit-icon">!</span>
                    <h2>Call Could Not Start</h2>
                    <p>{callError}</p>
                    <button
                        className="btn-upgrade"
                        onClick={() => {
                            setCallError('');
                            setIsConnecting(true);
                            hasStartedRef.current = false;
                            startCall();
                        }}
                    >
                        Try Again
                    </button>
                    <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`voice-call-room ${callType === 'video' ? 'is-video-call' : 'is-voice-call'}`}>
            <div ref={handleCallMount} className="voice-call-container">
                <div className="agora-stage">
                    <div ref={remoteVideosRef} className="agora-remote-grid">
                        {remoteCount === 0 && (
                            <div className="agora-waiting-card">
                                <div className="calling-avatar">
                                    {targetName.charAt(0).toUpperCase()}
                                </div>
                                <h2>{targetName}</h2>
                                <p>Waiting for the other person to join...</p>
                            </div>
                        )}
                    </div>

                    {callType === 'video' && (
                        <div className={`agora-local-video ${isCameraOff ? 'is-off' : ''}`} ref={localVideoRef}>
                            {isCameraOff && <span>Camera off</span>}
                        </div>
                    )}
                </div>

                <div className="agora-call-bar">
                    <button onClick={toggleMute} className={isMuted ? 'is-active' : ''}>
                        {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    {callType === 'video' && (
                        <button onClick={toggleCamera} className={isCameraOff ? 'is-active' : ''}>
                            {isCameraOff ? 'Camera On' : 'Camera Off'}
                        </button>
                    )}
                    <button onClick={endCall} className="btn-end-call">End</button>
                </div>
            </div>

            <AnimatePresence>
                {isConnecting && (
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
                                    {targetName.charAt(0).toUpperCase()}
                                </div>
                            </div>

                            <h2 className="calling-name">Calling {targetName}...</h2>
                            <p className="calling-status">Establishing secure call connection...</p>

                            <button className="btn-cancel-call" onClick={endCall}>
                                <span className="btn-icon">x</span>
                                End Call
                            </button>
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
}
