import React, { useState } from 'react';
import './MessageActionMenu.css';

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

export default function MessageActionMenu({
    message,
    isSentByMe,
    position,
    onReact,
    onEdit,
    onInfo,
    onDelete,
    onClose
}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (!message) return null;

    // Determine if message has been seen by recipient
    const isSeen = Boolean(
        message.is_read ||
        message.seen_at ||
        message.read_at ||
        message.metadata?.seen_at ||
        message.metadata?.read_at
    );

    // Edit permission: sender only, text only, unseen only, not optimistic temp, within 15 mins
    const isText = (message.type || 'text') === 'text';
    const isTemp = !message.id || String(message.id).startsWith('temp-');
    const within15m = message.created_at
        ? (Date.now() - new Date(message.created_at).getTime()) < 15 * 60 * 1000
        : true;

    const canEdit = isSentByMe && isText && !isSeen && !isTemp && within15m && message.type !== 'deleted';

    // Viewport position clamping
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 380;
    const barWidth = 320;
    const safeLeft = Math.max(12, Math.min(position?.x ?? 20, screenWidth - barWidth - 12));
    const safeTop = Math.max(65, position?.y ?? 100);

    return (
        <>
            {/* Dimmed backdrop dismisser */}
            <div
                className="msg-action-backdrop"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                onTouchStart={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                aria-hidden="true"
            />

            <div
                className="msg-action-container"
                style={{ top: safeTop, left: safeLeft }}
                role="dialog"
                aria-label="Message Actions"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Floating pill: Reactions + Divider + Three Dots */}
                <div className="msg-action-pill">
                    {REACTIONS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            className="msg-reaction-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onReact(emoji);
                                onClose();
                            }}
                            aria-label={`React with ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}

                    <div className="msg-action-divider" />

                    <button
                        type="button"
                        className={`msg-three-dot-btn ${isMenuOpen ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(!isMenuOpen);
                        }}
                        title="More actions"
                        aria-label="More actions"
                    >
                        <div className="msg-three-dot-icon">
                            <span />
                            <span />
                            <span />
                        </div>
                    </button>
                </div>

                {/* Dropdown Menu attached to Three Dots */}
                {isMenuOpen && (
                    <div className="msg-dropdown-menu">
                        {canEdit && (
                            <button
                                type="button"
                                className="msg-menu-item"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                    onClose();
                                }}
                            >
                                <span className="msg-menu-icon">✏️</span>
                                <span>Edit</span>
                            </button>
                        )}

                        <button
                            type="button"
                            className="msg-menu-item"
                            onClick={(e) => {
                                e.stopPropagation();
                                onInfo();
                                onClose();
                            }}
                        >
                            <span className="msg-menu-icon">ℹ️</span>
                            <span>Info</span>
                        </button>

                        <button
                            type="button"
                            className="msg-menu-item danger"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                                onClose();
                            }}
                        >
                            <span className="msg-menu-icon">🗑️</span>
                            <span>Delete</span>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
