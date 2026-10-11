import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { getAvatarUrl } from '../utils/profileData';
import { triggerLightHaptic } from '../utils/haptics';
import './ChatActionModal.css';

export default function ChatActionModal({
    conversation,
    isMuted = false,
    onClose,
    onToggleRead,
    onViewProfile,
    onToggleMute,
    onDeleteConversation
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    if (!conversation) return null;

    const otherUser = conversation.other_user || {};
    const displayName = otherUser.full_name || 'Campus Student';
    const hasUnread = conversation.has_unread;

    const handleAction = (callback) => {
        triggerLightHaptic();
        if (typeof callback === 'function') {
            callback(conversation);
        }
        onClose();
    };

    const modalContent = (
        <div
            className="chat-action-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Conversation Options"
        >
            <div className="chat-action-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="chat-action-handle" />

                {/* Contact Preview Header */}
                <div className="chat-action-contact-card">
                    <div className="chat-action-avatar-wrap">
                        <img
                            src={getAvatarUrl(otherUser) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.id}`}
                            alt=""
                            className="chat-action-avatar"
                        />
                        {(otherUser.is_verified || otherUser.photo_verified) && (
                            <span className="chat-action-verified-tick" title="Verified Student">✓</span>
                        )}
                    </div>
                    <div className="chat-action-contact-info">
                        <div className="chat-action-name-row">
                            <span className="chat-action-name">{displayName}</span>
                        </div>
                        <span className="chat-action-subtext">
                            {otherUser.university || 'Campus Student'}
                            {otherUser.department ? ` • ${otherUser.department}` : ''}
                        </span>
                    </div>
                </div>

                {!confirmDelete ? (
                    <div className="chat-action-buttons-list">
                        {/* 1. Mark as Read / Unread */}
                        <button
                            type="button"
                            className="chat-action-item"
                            onClick={() => handleAction(onToggleRead)}
                        >
                            <span className="chat-action-icon">{hasUnread ? '📬' : '✉️'}</span>
                            <span className="chat-action-label">
                                {hasUnread ? 'Mark as read' : 'Mark as unread'}
                            </span>
                        </button>

                        {/* 2. View Profile */}
                        <button
                            type="button"
                            className="chat-action-item"
                            onClick={() => handleAction(onViewProfile)}
                        >
                            <span className="chat-action-icon">👤</span>
                            <span className="chat-action-label">View profile</span>
                        </button>

                        {/* 3. Mute / Unmute */}
                        <button
                            type="button"
                            className="chat-action-item"
                            onClick={() => handleAction(onToggleMute)}
                        >
                            <span className="chat-action-icon">{isMuted ? '🔔' : '🔕'}</span>
                            <span className="chat-action-label">
                                {isMuted ? 'Unmute notifications' : 'Mute notifications'}
                            </span>
                        </button>

                        <div className="chat-action-divider" />

                        {/* 4. Delete Chat */}
                        <button
                            type="button"
                            className="chat-action-item danger"
                            onClick={() => {
                                triggerLightHaptic();
                                setConfirmDelete(true);
                            }}
                        >
                            <span className="chat-action-icon">🗑️</span>
                            <span className="chat-action-label">Delete conversation</span>
                        </button>

                        {/* 5. Cancel */}
                        <button
                            type="button"
                            className="chat-action-item cancel"
                            onClick={onClose}
                        >
                            <span className="chat-action-label">Cancel</span>
                        </button>
                    </div>
                ) : (
                    /* Delete Confirmation Sub-View */
                    <div className="chat-action-confirm-card">
                        <div className="chat-action-warning-icon">⚠️</div>
                        <h4 className="chat-action-confirm-title">Delete this conversation?</h4>
                        <p className="chat-action-confirm-desc">
                            This will remove the chat history with {displayName.split(' ')[0]} from your messages list.
                        </p>
                        <div className="chat-action-confirm-actions">
                            <button
                                type="button"
                                className="chat-action-btn-danger"
                                onClick={() => handleAction(onDeleteConversation)}
                            >
                                Yes, delete
                            </button>
                            <button
                                type="button"
                                className="chat-action-btn-cancel"
                                onClick={() => setConfirmDelete(false)}
                            >
                                Back
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
