import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../contexts/AuthContext';
import { incrementCallMinutes } from '../services/profileService';
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './VoiceCallRoom.css';


export default function VoiceCallRoom() {
    const { roomID } = useParams();
    const [searchParams] = useSearchParams();
    const callType = searchParams.get('type') || 'voice'; // 'voice' or 'video'
    const { currentUser, userProfile, fetchProfile } = useAuth();
    const navigate = useNavigate();
    const zpRef = useRef(null);
    const heartbeatRef = useRef(null);
    const sessionStartRef = useRef(Date.now());
    const isJoinedRef = useRef(false);
    const ringtoneRef = useRef(null);
    const [limitReached, setLimitReached] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);



    const appID = parseInt(import.meta.env.VITE_ZEGO_APP_ID || "0", 10);
    const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET || "";

    const userFullName = userProfile?.full_name || 'User';
    const targetName = searchParams.get('name') || 'User';
    
    // Recovery defaults in memory (Repairs existing profiles for calls)
    const currentMinsToday = userProfile?.call_minutes_today || 0;
    const isPremium = userProfile?.is_premium || false;

    useEffect(() => {
        // 1. Initial limit check
        if (!isPremium && currentMinsToday >= 20) {
            setLimitReached(true);
        }
    }, [userProfile?.id]);

    useEffect(() => {
        // 2. Global cleanup only on true unmount
        return () => {
            console.log('VoiceCallRoom unmounting: Performing cleanup...');
            
            // a. Stop Zego securely
            if (zpRef.current) {
                try {
                    // Critical: Some Zego internal cleanup can throw if not fully initialized
                    zpRef.current.destroy();
                } catch (e) {
                    console.warn('Zego destroy failed (possibly uninitialized):', e.message);
                }
                zpRef.current = null;
            }

            // b. Clear Heartbeat
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }

            // c. Stop Ringtone
            if (ringtoneRef.current) {
                try {
                    // Check state to avoid 'closing a closed context' error
                    if (ringtoneRef.current.audioCtx && ringtoneRef.current.audioCtx.state !== 'closed') {
                        ringtoneRef.current.stop();
                    }
                } catch (e) {
                    console.warn('Ringtone cleanup failed:', e.message);
                }
                ringtoneRef.current = null;
            }
            isJoinedRef.current = false;
        };
    }, []);


    const myMeeting = async (element) => {
        if (!element || limitReached || isJoinedRef.current) return;
        isJoinedRef.current = true;


        if (!appID || !serverSecret || appID === 0) {
            alert("Call services are coming soon! Keys not configured.");
            navigate(-1);
            return;
        }

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            appID,
            serverSecret,
            roomID,
            currentUser?.id || Date.now().toString(),
            userFullName
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;
        console.log(`[Zego] Initializing ${callType} call room:`, roomID);

        zp.joinRoom({
            container: element,
            sharedLinks: [], // Privacy: don't show shared links inside the room
            scenario: {
                mode: ZegoUIKitPrebuilt.OneONoneCall,
            },
            showPreJoinView: false, // SKIP the second "Join" button underneath the overlay
            // Dynamic hardware configuration
            turnOnCameraWhenJoining: callType === 'video',
            turnOnMicrophoneWhenJoining: true,
            showMyCameraControls: true,
            showMyMicrophoneControls: true,
            showAudioVideoSettingsButton: true,
            showScreenSharingButton: false,
            showTextChat: false,
            showUserList: false,
            showLeaveRoomConfirmDialog: true,
            showPreview: false, // Ensure no flicker
            
            onJoinRoom: () => {
                console.log('[Zego] Joined successfully.');
                setIsConnecting(false);
                if (ringtoneRef.current) {
                    ringtoneRef.current.stop();
                    ringtoneRef.current = null;
                }
            },
            onLeaveRoom: () => {
                console.log('[Zego] User left the room.');
                navigate(-1);
            }
        });

        // ── Emergency Timeout ──────────────────────────────────────────
        // If Zego hasn't joined within 10s, force the overlay to hide.
        // This reveals the Zego UI for manual join if something hangs.
        setTimeout(() => {
            if (isConnecting) {
                console.warn('[Zego] Connection taking long. Forcing overlay hide.');
                setIsConnecting(false);
                if (ringtoneRef.current) {
                    ringtoneRef.current.stop();
                    ringtoneRef.current = null;
                }
            }
        }, 10000);

        const startRingtone = () => {
            if (ringtoneRef.current) return;

            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const playBeep = () => {
                    // If context is closed or closing, stop recursion
                    if (!ringtoneRef.current || audioCtx.state === 'closed') return;
                    
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
                    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.5);
                    
                    // Pulse every 1.5 seconds
                    setTimeout(() => {
                        if (ringtoneRef.current && audioCtx.state !== 'closed') playBeep();
                    }, 1500);
                };

                ringtoneRef.current = { 
                    audioCtx,
                    stop: () => { 
                        if (audioCtx.state !== 'closed') audioCtx.close(); 
                    } 
                };
                playBeep();
            } catch (e) {
                console.error('Beep generator failed:', e);
            }
        };

        startRingtone();


        // Start heartbeat for Freemium users (track every 2 minutes)
        if (!userProfile?.is_premium) {
            heartbeatRef.current = setInterval(async () => {
                const elapsedMs = Date.now() - sessionStartRef.current;
                const elapsedMins = Math.floor(elapsedMs / 60000);
                
                if (elapsedMins >= 1) {
                    // Update DB with 1 min increments
                    const { data } = await incrementCallMinutes(currentUser.id, 1);
                    sessionStartRef.current = Date.now(); // reset local tracker
                    
                    if (data && data.call_minutes_today >= 19.5) {
                        // 30-second warning before 20 mins
                        addToast("You have 30 seconds left in your daily call limit! ⏰", "warning");
                    }

                    if (data && data.call_minutes_today >= 20) {
                        alert("Your 20-minute daily call limit has been reached. Upgrade to Premium for unlimited calls!");
                        if (zpRef.current) zpRef.current.destroy();
                        if (ringtoneRef.current) ringtoneRef.current.stop();
                        navigate(-1);
                    }
                }
            }, 60000); // Check every minute
        }
    };

    if (limitReached) {
        return (
            <div className="limit-reached-overlay">
                <div className="limit-card">
                    <span className="limit-icon">⏰</span>
                    <h2>Daily Limit Reached</h2>
                    <p>Freemium users get 20 minutes of calls per day. Upgrade to Premium for unlimited access!</p>
                    <button className="btn-upgrade" onClick={() => navigate('/premium')}>Upgrade to Premium 🚀</button>
                    <button className="btn-back" onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="voice-call-room">
            <div ref={myMeeting} className="voice-call-container" />
            
            <AnimatePresence>
                {isConnecting && (
                    <motion.div 
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
                            <p className="calling-status">Establishing voice connection...</p>
                            
                            <button 
                                className="btn-cancel-call"
                                onClick={() => {
                                    if (ringtoneRef.current) ringtoneRef.current.stop();
                                    if (zpRef.current) zpRef.current.destroy();
                                    navigate(-1);
                                }}
                            >
                                <span className="btn-icon">📞</span>
                                End Call
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
