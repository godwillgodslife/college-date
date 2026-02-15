import { useState, useRef } from 'react';

export default function VoiceRecorder({ onRecordingComplete, existingAudioUrl }) {
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
