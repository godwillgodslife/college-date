import { useState, useRef, useEffect } from 'react';
import { audioCoordinator } from '../utils/audioCoordinator';
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
            if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
                setDuration(audio.duration);
            }
        };

        const setAudioTime = () => {
            setCurrentTime(audio.currentTime);
            const activeDuration = (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0)
                ? audio.duration
                : duration;
            if (Number.isFinite(activeDuration) && activeDuration > 0) {
                if (duration !== activeDuration) setDuration(activeDuration);
                setProgress((audio.currentTime / activeDuration) * 100);
                if (audio.currentTime >= activeDuration) {
                    setIsPlaying(false);
                }
            }
        };

        const handlePlay = () => {
            setIsPlaying(true);
        };

        const handlePause = () => {
            setIsPlaying(false);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            audioCoordinator.stop(audio);
        };

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('durationchange', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        
        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('durationchange', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
            audioCoordinator.stop(audio);
        };
    }, [duration]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            audioCoordinator.stop(audio);
        } else {
            // Coordinate: pause any other audio stream playing in the app
            audioCoordinator.play(audio, () => {
                setIsPlaying(false);
            });
            audio.play().catch(err => {
                console.warn('[AudioMessage] play error:', err);
                setIsPlaying(false);
            });
            setIsPlaying(true);
        }
    };

    const handleSeek = (e) => {
        if (!duration || !Number.isFinite(duration) || duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const seekPosition = Math.max(0, Math.min(duration, (offsetX / rect.width) * duration));
        if (Number.isFinite(seekPosition)) {
            audioRef.current.currentTime = seekPosition;
            setProgress((seekPosition / duration) * 100);
        }
    };

    const formatTime = (time) => {
        if (!time || !Number.isFinite(time) || isNaN(time) || time < 0) return '0:00';
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
