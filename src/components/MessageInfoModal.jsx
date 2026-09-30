import React from 'react';
import './MessageInfoModal.css';

function formatTimestamp(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

export default function MessageInfoModal({ message, onClose }) {
    if (!message) return null;

    const sentTime = formatTimestamp(message.created_at) || 'Just now';
    const deliveredTime = formatTimestamp(message.delivered_at || message.created_at) || sentTime;

    const rawSeen = message.seen_at || message.read_at || message.metadata?.seen_at || message.metadata?.read_at || (message.is_read ? message.created_at : null);
    const isSeen = Boolean(message.is_read || rawSeen);
    const seenTime = isSeen ? (formatTimestamp(rawSeen) || 'Seen') : 'Not yet seen';

    const snippet = message.type === 'text'
        ? message.content
        : (message.type === 'image'
            ? '📷 Photo'
            : message.type === 'video'
                ? '🎥 Video'
                : message.type === 'voice'
                    ? '🎤 Voice note'
                    : `[${message.type || 'Message'}]`);

    return (
        <div
            className="msg-info-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="msg-info-title"
        >
            <div className="msg-info-sheet">
                <div className="msg-info-handle" />

                <div className="msg-info-header">
                    <h3 id="msg-info-title" className="msg-info-title">Message Info</h3>
                    <button
                        type="button"
                        className="msg-info-close-btn"
                        onClick={onClose}
                        aria-label="Close message info"
                    >
                        &times;
                    </button>
                </div>

                <div className="msg-info-preview-box">
                    <div className="msg-info-type-tag">{message.type || 'text'} message</div>
                    <p className="msg-info-snippet">{snippet}</p>
                </div>

                <div className="msg-info-timeline">
                    <div className="msg-info-row">
                        <div className="msg-info-label-group">
                            <span className="msg-info-icon">📤</span>
                            <span className="msg-info-label">Sent</span>
                        </div>
                        <span className="msg-info-time">{sentTime}</span>
                    </div>

                    <div className="msg-info-row">
                        <div className="msg-info-label-group">
                            <span className="msg-info-icon">📥</span>
                            <span className="msg-info-label">Delivered</span>
                        </div>
                        <span className="msg-info-time">{deliveredTime}</span>
                    </div>

                    <div className="msg-info-row">
                        <div className="msg-info-label-group">
                            <span className="msg-info-icon">👁️</span>
                            <span className="msg-info-label">Seen</span>
                        </div>
                        <span className={`msg-info-time ${isSeen ? 'seen-active' : 'unseen'}`}>
                            {seenTime}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
