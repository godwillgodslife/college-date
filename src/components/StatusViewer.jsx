import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import './StatusViewer.css';

export default function StatusViewer({ statuses, profile, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    const currentStatus = statuses[currentIndex];

    const handleNext = useCallback(() => {
        if (currentIndex < statuses.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            onClose();
        }
    }, [currentIndex, statuses.length, onClose]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        }
    }, [currentIndex]);

    // Handle auto-advance
    useEffect(() => {
        const duration = 5000; // 5 seconds per status
        const interval = 50;
        const step = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [currentIndex, handleNext]);

    if (!currentStatus) return null;

    return (
        <motion.div
            className="status-viewer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                        <img src={profile?.avatar_url || 'https://via.placeholder.com/40'} alt={profile?.full_name} />
                        <div>
                            <h4>{profile?.full_name}</h4>
                            <span>{formatDistanceToNow(new Date(currentStatus.created_at), { addSuffix: true })}</span>
                        </div>
                    </div>
                    <button className="close-viewer" onClick={onClose}>×</button>
                </div>

                {/* Media */}
                <div className="status-media-container" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    if (x < rect.width / 3) handlePrev();
                    else handleNext();
                }}>
                    <img src={currentStatus.media_url} alt="Status" className="status-media" />
                    {currentStatus.caption && (
                        <div className="status-caption-overlay">
                            <p>{currentStatus.caption}</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
