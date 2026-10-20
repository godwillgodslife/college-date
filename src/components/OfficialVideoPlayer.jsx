import React, { useState, useRef, useEffect } from 'react';

/**
 * OfficialVideoPlayer
 * Low-data, battery-efficient vertical 9:16 video player tailored for Nigerian mobile students.
 * - Manual click-to-play (no data waste on metered networks)
 * - Mute/unmute toggle
 * - Custom slim progress bar
 * - Fallback poster with clear messaging if media fails or is offline
 */
export default function OfficialVideoPlayer({
    videoUrl,
    thumbnailUrl,
    title,
    durationSeconds = 0,
    onPlay,
    className = '',
}) {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(durationSeconds);
    const [hasError, setHasError] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const hideTimeoutRef = useRef(null);

    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setHasError(false);
        setHasStarted(false);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.pause();
        }
    }, [videoUrl]);

    const handlePlayPause = () => {
        if (!videoRef.current) return;

        if (videoRef.current.paused) {
            videoRef.current.play().then(() => {
                setIsPlaying(true);
                setHasStarted(true);
                if (onPlay) onPlay();
            }).catch(err => {
                console.warn('[OfficialVideoPlayer] Play interrupted:', err);
                setHasError(true);
            });
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
            setDuration(Math.round(videoRef.current.duration));
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleSeek = (e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const clickPos = (e.clientX - rect.left) / rect.width;
        const targetTime = clickPos * (duration || 1);
        if (videoRef.current && Number.isFinite(targetTime)) {
            videoRef.current.currentTime = targetTime;
            setCurrentTime(targetTime);
        }
    };

    const formatTime = (secs) => {
        if (!Number.isFinite(secs) || secs < 0) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const triggerControlsVisibility = () => {
        setShowControls(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            className={`official-video-player-container ${className}`}
            onClick={handlePlayPause}
            onMouseMove={triggerControlsVisibility}
            onTouchStart={triggerControlsVisibility}
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '9/16',
                maxHeight: '68vh',
                backgroundColor: '#05070c',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                userSelect: 'none',
            }}
        >
            {/* Video element */}
            {!hasError ? (
                <video
                    ref={videoRef}
                    src={videoUrl}
                    poster={thumbnailUrl}
                    playsInline
                    preload="metadata"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onError={() => setHasError(true)}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        backgroundColor: '#000',
                    }}
                />
            ) : (
                /* Fallback Poster Card if video file is unavailable */
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        backgroundImage: `url(${thumbnailUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: '16px',
                        backgroundBlendMode: 'overlay',
                        backgroundColor: 'rgba(10, 14, 26, 0.75)',
                    }}
                >
                    <div
                        style={{
                            background: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(8px)',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>💡</div>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                            Interactive Tutorial Guide
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
                            {title || 'Follow the step-by-step guidance below'}
                        </div>
                    </div>
                </div>
            )}

            {/* Play/Pause Overlay Icon */}
            {(!isPlaying || showControls) && !hasError && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                        pointerEvents: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                >
                    {isPlaying ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '3px' }}>
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </div>
            )}

            {/* Low-data hint on initial render */}
            {!hasStarted && !hasError && (
                <div
                    style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        pointerEvents: 'none',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                    }}
                >
                    <span>⚡ Low Data Mode</span>
                </div>
            )}

            {/* Bottom Controls Bar */}
            {(!hasError && (isPlaying || hasStarted)) && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '12px 14px 10px',
                        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0) 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'opacity 0.25s ease',
                        opacity: showControls || !isPlaying ? 1 : 0,
                        pointerEvents: showControls || !isPlaying ? 'auto' : 'none',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Scrub bar */}
                    <div
                        onClick={handleSeek}
                        style={{
                            width: '100%',
                            height: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            position: 'relative',
                        }}
                    >
                        <div
                            style={{
                                width: `${progressPct}%`,
                                height: '100%',
                                background: '#ffffff',
                                borderRadius: '2px',
                                position: 'relative',
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    right: '-4px',
                                    top: '-3px',
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
                                }}
                            />
                        </div>
                    </div>

                    {/* Time & Volume */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#cbd5e1', fontSize: '0.72rem' }}>
                        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                        <button
                            type="button"
                            onClick={toggleMute}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#fff',
                                padding: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            title={isMuted ? 'Unmute' : 'Mute'}
                            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                        >
                            {isMuted ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
