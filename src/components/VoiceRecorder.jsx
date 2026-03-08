import { useState, useRef } from 'react';

export default function VoiceRecorder({ onRecordingComplete, existingAudioUrl, variant = null }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(existingAudioUrl);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                onRecordingComplete(blob);

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const handleDelete = () => {
        setAudioUrl(null);
        onRecordingComplete(null);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (variant === 'chat') {
        return (
            <div className="flex items-center justify-center">
                {!isRecording && !audioUrl && (
                    <button
                        type="button"
                        onClick={startRecording}
                        className="btn-icon"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Send Voice Note"
                    >
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="22"></line>
                        </svg>
                    </button>
                )}

                {isRecording && (
                    <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm animate-pulse whitespace-nowrap">
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                        {formatTime(recordingTime)}
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="ml-2 w-6 h-6 bg-white text-red-500 rounded-full flex items-center justify-center"
                        >
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none"><rect x="6" y="6" width="12" height="12"></rect></svg>
                        </button>
                    </div>
                )}

                {audioUrl && !isRecording && (
                    <div className="flex items-center gap-2 rounded-full px-2" style={{ background: 'var(--accent-primary-dim)' }}>
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--accent-primary)' }}>Voice ✅</span>
                        <button type="button" onClick={handleDelete} className="p-1 text-red-500">✕</button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="voice-recorder p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Voice Intro 🎤</label>

            <div className="flex items-center gap-4">
                {!isRecording && !audioUrl && (
                    <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                        <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                        Record Intro
                    </button>
                )}

                {isRecording && (
                    <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition-colors"
                    >
                        <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
                        Stop ({formatTime(recordingTime)})
                    </button>
                )}

                {audioUrl && !isRecording && (
                    <div className="flex items-center gap-3 w-full">
                        <audio controls src={audioUrl} className="w-full h-10" />
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                            title="Delete Recording"
                        >
                            🗑️
                        </button>
                    </div>
                )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
                {isRecording ? "Recording... keep it short and sweet!" : "Record a quick hello to show your personality."}
            </p>
        </div>
    );
}
