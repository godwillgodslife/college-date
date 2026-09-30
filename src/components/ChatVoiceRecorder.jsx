import { useState, useRef, useEffect } from 'react';
import { triggerLightHaptic } from '../utils/haptics';
import './ChatVoiceRecorder.css';

export default function ChatVoiceRecorder({ onRecordingComplete, isSending, onRecordingStateChange }) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioLevels, setAudioLevels] = useState([25, 40, 60, 30, 70, 45, 80, 50, 35, 65, 40, 25, 55, 30]);
    
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    
    // Web Audio API for dynamic waveform visualization
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const animationFrameRef = useRef(null);

    const cleanupAudio = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (sourceRef.current) {
            try { sourceRef.current.disconnect(); } catch {}
            sourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            cleanupAudio();
        };
    }, []);

    const startRecording = async () => {
        try {
            triggerLightHaptic();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Initialize Web Audio API Analyser
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    const audioCtx = new AudioCtx();
                    audioContextRef.current = audioCtx;
                    const analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 64;
                    analyser.smoothingTimeConstant = 0.6;
                    analyserRef.current = analyser;

                    const source = audioCtx.createMediaStreamSource(stream);
                    source.connect(analyser);
                    sourceRef.current = source;

                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);

                    const updateVisualizer = () => {
                        if (!analyserRef.current) return;
                        analyserRef.current.getByteFrequencyData(dataArray);

                        const bars = [];
                        const count = 14;
                        const step = Math.max(1, Math.floor(bufferLength / count));
                        for (let i = 0; i < count; i++) {
                            const val = dataArray[i * step] || 0;
                            // Scale from 18% min to 100% max
                            const pct = Math.max(18, Math.min(100, Math.round((val / 255) * 100)));
                            bars.push(pct);
                        }
                        setAudioLevels(bars);
                        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
                    };
                    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
                }
            } catch (audioErr) {
                console.warn('[VoiceRecorder] AudioContext visualizer unavailable:', audioErr);
            }

            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                if (chunksRef.current.length > 0) {
                    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
                    const blob = new Blob(chunksRef.current, { type: mimeType });
                    onRecordingComplete(blob);
                }
                cleanupAudio();
            };

            mediaRecorderRef.current.start(100);
            setIsRecording(true);
            setRecordingTime(0);
            onRecordingStateChange?.(true);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            cleanupAudio();
            setIsRecording(false);
            onRecordingStateChange?.(false);
        }
    };

    const stopAndSend = () => {
        triggerLightHaptic();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        onRecordingStateChange?.(false);
    };

    const discardRecording = () => {
        triggerLightHaptic();
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = null;
            if (mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        }
        chunksRef.current = [];
        cleanupAudio();
        setIsRecording(false);
        onRecordingStateChange?.(false);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isRecording) {
        return (
            <div className="voice-recorder-takeover animate-voice-slide">
                {/* Discard Trash Button */}
                <button
                    type="button"
                    className="btn-voice-discard"
                    onClick={discardRecording}
                    aria-label="Discard recording"
                    title="Discard recording"
                >
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>

                {/* Pulsing Recording Indicator & Live Timer */}
                <div className="voice-timer-container">
                    <span className="voice-pulse-dot" />
                    <span className="voice-timer-text">{formatTime(recordingTime)}</span>
                </div>

                {/* Real-time Dynamic Soundwave Visualizer */}
                <div className="voice-soundwave-strip">
                    {audioLevels.map((lvl, idx) => (
                        <div
                            key={idx}
                            className="voice-soundwave-bar"
                            style={{ height: `${lvl}%` }}
                        />
                    ))}
                </div>

                {/* Send / Stop Action Button */}
                <button
                    type="button"
                    className="btn-voice-send"
                    onClick={stopAndSend}
                    aria-label="Send voice note"
                    title="Send voice note"
                >
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            className={`btn-icon btn-voice ${isSending ? 'disabled' : ''}`}
            onClick={startRecording}
            disabled={isSending}
            title="Record Voice Note"
            aria-label="Record voice note"
        >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
        </button>
    );
}
