import { useState, useRef, useEffect } from 'react';
import './AudioMessageStyles.css';

export default function AudioMessage({ src, isSent }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => {
            setDuration(audio.duration);
        };

        const setAudioTime = () => {
            setCurrentTime(audio.currentTime);
            setProgress((audio.currentTime / audio.duration) * 100);
            if (audio.currentTime === audio.duration) {
                setIsPlaying(false);
            }
        };

        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', () => { setIsPlaying(false); setProgress(0); });
        
        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const seekPosition = (e.nativeEvent.offsetX / e.target.clientWidth) * duration;
        audioRef.current.currentTime = seekPosition;
        setProgress((seekPosition / duration) * 100);
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className={`audio-message-container ${isSent ? 'sent' : 'received'}`}>
            <audio ref={audioRef} src={src} preload="metadata" />
            
            <button className="audio-play-btn" onClick={togglePlay}>
                {isPlaying ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <rect x="6" y="5" width="4" height="14" rx="1"></rect>
                        <rect x="14" y="5" width="4" height="14" rx="1"></rect>
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M8 5v14l11-7z"></path>
                    </svg>
                )}
            </button>

            <div className="audio-timeline-wrapper" onClick={handleSeek}>
                <div className="audio-timeline-track">
                    <div className="audio-timeline-progress" style={{ width: `${progress}%` }}></div>
                    <div className="audio-timeline-thumb" style={{ left: `${progress}%` }}></div>
                </div>
            </div>

            <div className="audio-time-display">
                {formatTime(isPlaying ? currentTime : duration)}
            </div>
            
            <div className="audio-avatar">
                {/* Micro avatar placeholder for WhatsApp style */}
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
            </div>
        </div>
    );
}
