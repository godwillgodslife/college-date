import { useState, useEffect } from 'react';
import './ViewOnceViewerModal.css';

export default function ViewOnceViewerModal({ mediaUrl, mediaType = 'image', onClose }) {
    const [secondsLeft, setSecondsLeft] = useState(15);

    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onClose]);

    // Handle ESC key to dismiss
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="view-once-modal-overlay" onContextMenu={(e) => e.preventDefault()}>
            <div className="view-once-modal-header">
                <div className="view-once-badge-pill">
                    <span className="view-once-num">①</span>
                    <span>View Once Media</span>
                </div>
                <div className="view-once-timer-pill">
                    ⏱️ Closes in {secondsLeft}s
                </div>
                <button
                    type="button"
                    className="view-once-close-btn"
                    onClick={onClose}
                    aria-label="Close viewer"
                >
                    &times;
                </button>
            </div>

            <div className="view-once-content-container">
                {mediaType === 'video' ? (
                    <video
                        src={mediaUrl}
                        controls
                        autoPlay
                        playsInline
                        className="view-once-media-element"
                        controlsList="nodownload nofullscreen"
                    />
                ) : (
                    <img
                        src={mediaUrl}
                        alt="Disappearing media"
                        className="view-once-media-element"
                        draggable={false}
                    />
                )}
            </div>

            <div className="view-once-footer-notice">
                🔒 Protected single-view media • Expires automatically upon closing
            </div>
        </div>
    );
}
