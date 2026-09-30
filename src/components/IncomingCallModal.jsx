import { useEffect, useRef } from 'react';
import { triggerLightHaptic } from '../utils/haptics';
import './IncomingCallModal.css';

export default function IncomingCallModal({ call, onAccept, onDecline }) {
    const audioContextRef = useRef(null);
    const ringIntervalRef = useRef(null);
    const hapticIntervalRef = useRef(null);

    useEffect(() => {
        if (!call) return;

        // Start incoming call ringtone via Web Audio API
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const ctx = new AudioCtx();
                audioContextRef.current = ctx;

                const playRingPulse = () => {
                    if (!ctx || ctx.state === 'closed') return;
                    try {
                        const now = ctx.currentTime;
                        const osc1 = ctx.createOscillator();
                        const osc2 = ctx.createOscillator();
                        const gain = ctx.createGain();

                        osc1.type = 'sine';
                        osc2.type = 'sine';
                        osc1.frequency.setValueAtTime(440, now);
                        osc2.frequency.setValueAtTime(480, now);

                        gain.gain.setValueAtTime(0.12, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

                        osc1.connect(gain);
                        osc2.connect(gain);
                        gain.connect(ctx.destination);

                        osc1.start(now);
                        osc2.start(now);
                        osc1.stop(now + 1.8);
                        osc2.stop(now + 1.8);
                    } catch (e) {
                        console.warn('[IncomingCallModal] Audio ring tone error:', e);
                    }
                };

                playRingPulse();
                ringIntervalRef.current = setInterval(playRingPulse, 3000);
            }
        } catch (e) {
            console.warn('[IncomingCallModal] AudioContext initialization failed:', e);
        }

        // Haptic pulses
        triggerLightHaptic();
        hapticIntervalRef.current = setInterval(() => {
            triggerLightHaptic();
        }, 1500);

        return () => {
            if (ringIntervalRef.current) {
                clearInterval(ringIntervalRef.current);
                ringIntervalRef.current = null;
            }
            if (hapticIntervalRef.current) {
                clearInterval(hapticIntervalRef.current);
                hapticIntervalRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                try {
                    audioContextRef.current.close();
                } catch (e) {
                    console.warn('[IncomingCallModal] Close audio error:', e);
                }
                audioContextRef.current = null;
            }
        };
    }, [call]);

    if (!call) return null;

    const callerName = call.callerName || 'Campus Match';
    const isVideo = call.callType === 'video';

    return (
        <div className="incoming-call-overlay" role="dialog" aria-modal="true">
            <div className="incoming-call-card">
                <div className="incoming-call-avatar-wrap">
                    <div className="call-pulse-ring ring-1"></div>
                    <div className="call-pulse-ring ring-2"></div>
                    {call.callerAvatar ? (
                        <img 
                            src={call.callerAvatar} 
                            alt={callerName} 
                            className="incoming-call-avatar" 
                        />
                    ) : (
                        <div className="incoming-call-avatar-placeholder">
                            {callerName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                <h2 className="incoming-call-name">{callerName}</h2>
                <div className="incoming-call-type-badge">
                    <span>{isVideo ? '📹 Incoming Video Call' : '📞 Incoming Voice Call'}</span>
                </div>

                <div className="incoming-call-actions">
                    <div className="incoming-call-btn-wrap">
                        <button 
                            type="button" 
                            className="btn-incoming-call btn-decline" 
                            onClick={onDecline}
                            aria-label="Decline Call"
                        >
                            ✕
                        </button>
                        <span className="incoming-call-label">Decline</span>
                    </div>

                    <div className="incoming-call-btn-wrap">
                        <button 
                            type="button" 
                            className="btn-incoming-call btn-accept" 
                            onClick={onAccept}
                            aria-label="Accept Call"
                        >
                            {isVideo ? '📹' : '📞'}
                        </button>
                        <span className="incoming-call-label">Accept</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
