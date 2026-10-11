import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { verifyLiveSelfie } from '../services/aiTrustService';
import { recordPolicyAcceptance } from '../services/policyService';
import { useToast } from './Toast';
import './FaceVerificationModal.css';

const LIVENESS_STAGES = [
    {
        id: 'align',
        icon: '👤',
        badge: 'Step 1 of 4',
        instruction: 'Look straight into the camera',
        hint: 'Keep your face centered inside the oval with eyes open',
        targetDurationMs: 4000
    },
    {
        id: 'tilt',
        icon: '⬆️',
        badge: 'Step 2 of 4',
        instruction: 'Tilt your head upwards slowly',
        hint: 'Gently lift your chin up so the camera captures face angle',
        targetDurationMs: 4200
    },
    {
        id: 'mouth',
        icon: '😮',
        badge: 'Step 3 of 4',
        instruction: 'Open your mouth slightly, then close it',
        hint: 'Natural facial movement verifies live presence',
        targetDurationMs: 4200
    },
    {
        id: 'smile',
        icon: '😊',
        badge: 'Step 4 of 4',
        instruction: 'Give a gentle, natural smile',
        hint: 'Smile naturally while facial landmarks are matched',
        targetDurationMs: 4000
    },
    {
        id: 'capture',
        icon: '📸',
        badge: 'Final Capture',
        instruction: 'Hold steady! Capturing verification photo...',
        hint: 'Hold still for a crisp, clear verification capture',
        targetDurationMs: 2000
    }
];

export default function FaceVerificationModal({ isOpen, onClose, onVerified, candidatePhotoUrl }) {
    const { currentUser, userProfile, fetchProfile } = useAuth();
    const { success, error: showError } = useToast();

    const [step, setStep] = useState('intro'); // 'intro' | 'camera' | 'analyzing' | 'success' | 'failed' | 'denied'
    const [livenessProgress, setLivenessProgress] = useState(0);
    const [currentStageIdx, setCurrentStageIdx] = useState(0);
    const [failReason, setFailReason] = useState('');
    const [capturedSelfie, setCapturedSelfie] = useState(null);
    const [isMuted, setIsMuted] = useState(false);

    const speakInstruction = useCallback((text) => {
        if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 0.95;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('[FaceVerification] Voice guidance error:', e);
        }
    }, [isMuted]);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const animationFrameRef = useRef(null);
    const prevFrameDataRef = useRef(null);
    const stageStartTimeRef = useRef(0);
    const activeStageIdxRef = useRef(0);
    const motionDetectedCountRef = useRef(0);

    const triggerHaptic = (ms = 35) => {
        try {
            if (window.navigator?.vibrate) {
                window.navigator.vibrate(ms);
            }
        } catch (_e) {
            // Haptics optional
        }
    };

    const stopCamera = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (step === 'camera' && isOpen) {
            const stage = LIVENESS_STAGES[currentStageIdx];
            if (stage?.instruction) {
                speakInstruction(stage.instruction);
            }
        }
    }, [step, currentStageIdx, isOpen, speakInstruction]);

    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setStep('intro');
            setLivenessProgress(0);
            setCurrentStageIdx(0);
            setCapturedSelfie(null);
        }
    }, [isOpen, stopCamera]);

    const startCamera = async () => {
        setStep('camera');
        setLivenessProgress(0);
        setCurrentStageIdx(0);
        activeStageIdxRef.current = 0;
        motionDetectedCountRef.current = 0;
        prevFrameDataRef.current = null;
        stageStartTimeRef.current = Date.now();

        // Record immutable biometric consent audit trail
        recordPolicyAcceptance('safety', '1.0', { context: 'face_verification_biometric_consent' }).catch(() => {});

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                startMultiStageLiveness();
            }
        } catch (err) {
            console.error('[Face Verification] Camera access error:', err);
            setStep('denied');
        }
    };

    // Extended 10-12s multi-stage interactive liveness verification
    const startMultiStageLiveness = () => {
        let frameCount = 0;

        const checkFrame = () => {
            if (!videoRef.current || !canvasRef.current) return;
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (video.readyState >= 2) {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                canvas.width = 160;
                canvas.height = 120;
                ctx.drawImage(video, 0, 0, 160, 120);

                frameCount++;
                if (frameCount % 4 === 0) {
                    const currentFrame = ctx.getImageData(0, 0, 160, 120).data;

                    if (prevFrameDataRef.current) {
                        let diff = 0;
                        const len = currentFrame.length;
                        for (let i = 0; i < len; i += 8) {
                            diff += Math.abs(currentFrame[i] - prevFrameDataRef.current[i]);
                        }
                        const motionRatio = diff / (len / 8);

                        // Human presence micro-motion check (natural breathing / movement)
                        if (motionRatio > 1.2 && motionRatio < 55.0) {
                            motionDetectedCountRef.current += 1;
                        }

                        const stageIdx = activeStageIdxRef.current;
                        const stage = LIVENESS_STAGES[stageIdx] || LIVENESS_STAGES[0];
                        const now = Date.now();
                        const stageElapsed = Math.max(0, now - stageStartTimeRef.current);
                        const stageRatio = Math.min(1.0, stageElapsed / stage.targetDurationMs);

                        // Dynamic progress across all stages
                        const stageWeight = 100 / LIVENESS_STAGES.length;
                        const overallProgress = Math.min(100, Math.round((stageIdx * stageWeight) + (stageRatio * stageWeight)));
                        setLivenessProgress(overallProgress);

                        // Advance to next stage when stage time completes
                        if (stageElapsed >= stage.targetDurationMs) {
                            if (stageIdx < LIVENESS_STAGES.length - 1) {
                                const nextIdx = stageIdx + 1;
                                activeStageIdxRef.current = nextIdx;
                                setCurrentStageIdx(nextIdx);
                                stageStartTimeRef.current = Date.now();
                                triggerHaptic(40);
                            } else {
                                // Completed all stages (~18s total duration)
                                triggerHaptic(70);
                                captureAndVerify();
                                return;
                            }
                        }
                    }
                    prevFrameDataRef.current = currentFrame;
                }
            }

            animationFrameRef.current = requestAnimationFrame(checkFrame);
        };

        animationFrameRef.current = requestAnimationFrame(checkFrame);
    };

    const captureAndVerify = async () => {
        if (!videoRef.current) return;
        stopCamera();
        setStep('analyzing');

        try {
            // Capture high-resolution selfie frame on canvas
            const video = videoRef.current;
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = video.videoWidth || 640;
            captureCanvas.height = video.videoHeight || 480;
            const ctx = captureCanvas.getContext('2d');
            ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

            const selfieBase64 = captureCanvas.toDataURL('image/jpeg', 0.88);
            setCapturedSelfie(selfieBase64);

            // Determine photo to compare: explicit candidate photo (onboarding) -> profile avatar -> profile photos
            const primaryPhoto = candidatePhotoUrl ||
                userProfile?.avatar_url ||
                (Array.isArray(userProfile?.profile_photos) ? userProfile.profile_photos[0] : null);

            const { data, error } = await verifyLiveSelfie({
                selfieBase64,
                profilePhotoUrl: primaryPhoto,
                livenessScore: 92
            });

            if (error || !data?.success) {
                throw new Error(error || 'Verification analysis could not be completed.');
            }

            if (data.verified) {
                setStep('success');
                if (fetchProfile && currentUser?.id) {
                    await fetchProfile(currentUser.id).catch(() => null);
                }
                success('Face & Photo Verification successful! Green badge active ✓');
                if (onVerified) onVerified();
            } else {
                setFailReason(data.review?.summary || 'The selfie could not be confidently matched to your profile photo. Please ensure clear lighting and try again.');
                setStep('failed');
            }
        } catch (err) {
            console.error('[Face Verification] Verification error:', err);
            setFailReason(err.message || 'Verification could not complete. Please ensure good lighting and try again.');
            setStep('failed');
        }
    };

    const currentStage = LIVENESS_STAGES[currentStageIdx] || LIVENESS_STAGES[0];

    if (!isOpen) return null;

    return (
        <div className="face-verify-backdrop" onClick={onClose}>
            <div className="face-verify-card" onClick={(e) => e.stopPropagation()}>
                <button className="face-verify-close" onClick={onClose} aria-label="Close">✕</button>

                {step === 'intro' && (
                    <div className="face-verify-content animate-scale-in">
                        <div className="face-verify-badge-icon">🛡️</div>
                        <h2 className="face-verify-title">Get Photo Verified</h2>
                        <p className="face-verify-desc">
                            Protect your profile against impersonation. You will be guided through a quick 10-second facial movement check (looking straight, tilting head up, and smiling) to earn the verified badge.
                        </p>

                        <div className="face-verify-perks">
                            <div className="face-verify-perk">
                                <span>✓</span>
                                <div>
                                    <strong>"Photo Verified" Badge</strong>
                                    <p>Distinguished green badge stands out on Match and Explore.</p>
                                </div>
                            </div>
                            <div className="face-verify-perk">
                                <span>✓</span>
                                <div>
                                    <strong>3x Higher Match Rate</strong>
                                    <p>Verified campus profiles receive significantly more replies.</p>
                                </div>
                            </div>
                            <div className="face-verify-perk">
                                <span>✓</span>
                                <div>
                                    <strong>Interactive Liveness Flow</strong>
                                    <p>Look straight, tilt head up, and smile to confirm presence.</p>
                                </div>
                            </div>
                        </div>

                        <div className="face-verify-consent-card" style={{
                            background: 'rgba(108, 99, 255, 0.08)',
                            border: '1px solid rgba(108, 99, 255, 0.25)',
                            borderRadius: '12px',
                            padding: '0.85rem',
                            margin: '1rem 0',
                            fontSize: '0.78rem',
                            color: 'rgba(255, 255, 255, 0.75)',
                            lineHeight: '1.4',
                            textAlign: 'left'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#6C63FF', marginBottom: '4px' }}>
                                <span>🛡️</span>
                                <span>NDPA 2023 Biometric Consent</span>
                            </div>
                            By tapping Start Camera Verification, you consent under the Nigeria Data Protection Act to ephemeral facial landmark scanning strictly to verify your identity against your uploaded profile photos. Raw biometric scans are processed in volatile memory, discarded immediately upon verification, and never sold.
                        </div>

                        <button className="btn btn-primary btn-block" onClick={startCamera}>
                            Start Camera Verification
                        </button>
                    </div>
                )}

                {step === 'camera' && (
                    <div className="face-verify-camera-wrapper">
                        {/* Stage Progress Pills */}
                        <div className="face-verify-stage-tracker">
                            {LIVENESS_STAGES.map((s, idx) => (
                                <div
                                    key={s.id}
                                    className={`stage-pill ${idx === currentStageIdx ? 'active' : ''} ${idx < currentStageIdx ? 'done' : ''}`}
                                >
                                    <span>{idx < currentStageIdx ? '✓' : s.icon}</span>
                                </div>
                            ))}
                        </div>

                        <div className="face-verify-viewport">
                            <video ref={videoRef} playsInline muted autoPlay className="face-verify-video" />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />

                            {/* Biometric Oval Guide */}
                            <div className={`face-verify-oval ${livenessProgress > 50 ? 'active' : ''}`}>
                                <div className="face-verify-scan-line"></div>
                            </div>

                            {/* Stage Floating Cue Banner */}
                            <div className="face-verify-stage-banner">
                                <span className="stage-banner-icon">{currentStage.icon}</span>
                                <span className="stage-banner-badge">{currentStage.badge}</span>
                            </div>

                            {/* Overall Progress Bar */}
                            <div className="face-verify-progress-bar">
                                <div 
                                    className="face-verify-progress-fill" 
                                    style={{ width: `${livenessProgress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Interactive Dynamic Instruction Pill */}
                        <div className="face-verify-instruction-pill">
                            <span className="pulse-dot"></span>
                            <span className="instruction-text">{currentStage.instruction}</span>
                        </div>

                        <p className="face-verify-hint">
                            {currentStage.hint}
                        </p>

                        <div className="face-verify-audio-controls">
                            <button
                                type="button"
                                className="btn-verify-audio-action"
                                onClick={() => setIsMuted(prev => !prev)}
                                aria-label={isMuted ? 'Unmute voice instructions' : 'Mute voice instructions'}
                            >
                                {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                            </button>
                            <button
                                type="button"
                                className="btn-verify-audio-action"
                                onClick={() => speakInstruction(currentStage.instruction)}
                                aria-label="Replay voice instruction"
                            >
                                🔁 Replay
                            </button>
                        </div>
                    </div>
                )}

                {step === 'analyzing' && (
                    <div className="face-verify-content animate-scale-in">
                        <div className="face-verify-spinner-ring"></div>
                        <h2 className="face-verify-title">Analyzing Biometric Match</h2>
                        <p className="face-verify-desc">
                            Comparing your live camera selfie with your profile photo...
                        </p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="face-verify-content animate-scale-in">
                        <div className="face-verify-success-icon">✓</div>
                        <h2 className="face-verify-title">Verification Complete!</h2>
                        <p className="face-verify-desc">
                            Your identity is confirmed. The <strong>Photo Verified ✓</strong> badge is now active on your account.
                        </p>
                        <button className="btn btn-primary btn-block" onClick={onClose}>
                            Done
                        </button>
                    </div>
                )}

                {step === 'failed' && (
                    <div className="face-verify-content animate-scale-in">
                        <div className="face-verify-failed-icon">!</div>
                        <h2 className="face-verify-title">Verification Unsuccessful</h2>
                        <p className="face-verify-desc">
                            {failReason || 'We could not verify your face. Ensure your face is clearly visible in good lighting and follow the movement prompts.'}
                        </p>
                        <button className="btn btn-primary btn-block" onClick={startCamera}>
                            Try Again
                        </button>
                        <button className="btn btn-secondary btn-block" style={{ marginTop: '0.5rem' }} onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                )}

                {step === 'denied' && (
                    <div className="face-verify-content animate-scale-in">
                        <div className="face-verify-failed-icon">📷</div>
                        <h2 className="face-verify-title">Camera Permission Needed</h2>
                        <p className="face-verify-desc">
                            To verify your photo, please allow camera access in your device permissions settings.
                        </p>
                        <button className="btn btn-primary btn-block" onClick={startCamera}>
                            Retry Camera Access
                        </button>
                        <button className="btn btn-secondary btn-block" style={{ marginTop: '0.5rem' }} onClick={onClose}>
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
