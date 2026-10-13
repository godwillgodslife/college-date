import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { getAvatarUrl } from '../utils/profileData';
import { useAuth } from '../contexts/AuthContext';
import { markStatusAsViewed } from '../services/statusService';
import './StatusViewer.css';

export default function StatusViewer({ statuses = [], profile, onClose }) {
    let currentUser = null;
    try {
        const auth = useAuth();
        currentUser = auth?.currentUser;
    } catch {
        currentUser = null;
    }

    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const videoRef = useRef(null);

    const currentStatus = statuses[currentIndex];
    const isVideo = currentStatus?.media_type === 'video' ||
        (typeof currentStatus?.media_url === 'string' && currentStatus.media_url.match(/\.(mp4|webm|mov|m4v)/i));

    // Mark current status as viewed whenever displayed
    useEffect(() => {
        if (!currentStatus || !currentUser?.id) return;
        const statusKey = currentStatus.id || currentStatus.media_url;
        const authorId = profile?.id || currentStatus.user_id || currentStatus.user_profile?.id;
        markStatusAsViewed(statusKey, currentUser.id, authorId);
    }, [currentStatus, currentUser?.id, profile?.id]);

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const handleNext = useCallback(() => {
        if (currentIndex < statuses.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            onCloseRef.current?.();
        }
    }, [currentIndex, statuses.length]);

    const handleNextRef = useRef(handleNext);
    handleNextRef.current = handleNext;

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        }
    }, [currentIndex]);

    // Reset progress when slide changes
    useEffect(() => {
        setProgress(0);
    }, [currentIndex]);

    // Video time updates
    const handleVideoTimeUpdate = () => {
        if (!videoRef.current || !isVideo || isPaused) return;
        const duration = videoRef.current.duration;
        const current = videoRef.current.currentTime;
        if (duration > 0) {
            setProgress((current / duration) * 100);
        }
    };

    // Auto-advance for static images (5 seconds)
    useEffect(() => {
        if (isVideo || isPaused || !currentStatus) return;

        const duration = 5000;
        const interval = 50;
        const step = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress(prev => {
                const next = prev + step;
                if (next >= 100) {
                    clearInterval(timer);
                    setTimeout(() => {
                        handleNextRef.current?.();
                    }, 0);
                    return 100;
                }
                return next;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [currentIndex, isVideo, isPaused, Boolean(currentStatus)]);

    if (!currentStatus) return null;

    const profileName = profile?.full_name || currentStatus.user_profile?.full_name || 'Campus Student';
    const profileAvatar = getAvatarUrl(profile || currentStatus.user_profile) || profile?.avatar_url || currentStatus.user_profile?.avatar_url || 'https://via.placeholder.com/40';

    const content = (
        <motion.div
            className="status-viewer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
            <div className="status-viewer-content">
                {/* Progress Bars */}
                <div className="status-progress-container">
                    {statuses.map((_, idx) => (
                        <div key={idx} className="status-progress-bg">
                            <div
                                className="status-progress-fill"
                                style={{
                                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="status-viewer-header">
                    <div className="user-info">
                        <img src={profileAvatar} alt={profileName} />
                        <div>
                            <h4>{profileName}</h4>
                            <span>
                                {currentStatus.created_at ? formatDistanceToNow(new Date(currentStatus.created_at), { addSuffix: true }) : 'Just now'}
                                {isVideo ? ' • 🎥 Video' : ' • 📸 Photo'}
                            </span>
                        </div>
                    </div>
                    <div className="status-viewer-controls">
                        {isVideo && (
                            <button
                                type="button"
                                className="viewer-ctrl-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMuted(prev => !prev);
                                    if (videoRef.current) videoRef.current.muted = !isMuted;
                                }}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? '🔇' : '🔊'}
                            </button>
                        )}
                        <button
                            type="button"
                            className="close-viewer"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Media Container */}
                <div
                    className="status-media-container"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        if (x < rect.width / 3) handlePrev();
                        else handleNext();
                    }}
                >
                    {isVideo ? (
                        <video
                            ref={videoRef}
                            src={currentStatus.media_url}
                            className="status-media status-media-video"
                            autoPlay
                            playsInline
                            muted={isMuted}
                            onTimeUpdate={handleVideoTimeUpdate}
                            onEnded={handleNext}
                        />
                    ) : (
                        <img
                            src={currentStatus.media_url}
                            alt="Status"
                            className="status-media"
                        />
                    )}

                    {currentStatus.caption && (
                        <div className="status-caption-overlay">
                            <p>{currentStatus.caption}</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );

    return createPortal(content, document.body);
}
