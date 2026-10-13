import React from 'react';
import { createPortal } from 'react-dom';
import { triggerLightHaptic } from '../utils/haptics';
import { getAvatarUrl } from '../utils/profileData';
import './StatusChoiceModal.css';

export default function StatusChoiceModal({ isOpen, onClose, contact, onSelectStatus, onSelectProfile }) {
    if (!isOpen || !contact) return null;

    const displayName = contact.full_name || 'Campus Student';
    const avatarUrl = getAvatarUrl(contact) || contact.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id || 'chat'}`;

    const handleStatus = () => {
        triggerLightHaptic();
        if (typeof onSelectStatus === 'function') {
            onSelectStatus(contact);
        } else {
            onClose();
        }
    };

    const handleProfile = () => {
        triggerLightHaptic();
        if (typeof onSelectProfile === 'function') {
            onSelectProfile(contact);
        } else {
            onClose();
        }
    };

    const content = (
        <div
            className="status-choice-overlay"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div className="status-choice-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="status-choice-handle" />

                {/* Contact Card Header */}
                <div className="status-choice-user-row">
                    <div className="status-choice-avatar-ring">
                        <img src={avatarUrl} alt="" className="status-choice-avatar" />
                        <span className="status-choice-dot" />
                    </div>
                    <div className="status-choice-user-meta">
                        <h3 className="status-choice-name">{displayName}</h3>
                        <span className="status-choice-sub">
                            {contact.university || 'Campus Student'} • Active Moment
                        </span>
                    </div>
                </div>

                {/* Choices */}
                <div className="status-choice-buttons">
                    <button
                        type="button"
                        className="status-choice-btn status-btn-view"
                        onClick={handleStatus}
                    >
                        <div className="choice-icon-wrap status-icon">
                            <span>🟢</span>
                        </div>
                        <div className="choice-btn-text">
                            <strong>View Status</strong>
                            <small>Watch 24h campus video moment</small>
                        </div>
                        <span className="choice-arrow">›</span>
                    </button>

                    <button
                        type="button"
                        className="status-choice-btn profile-btn-view"
                        onClick={handleProfile}
                    >
                        <div className="choice-icon-wrap profile-icon">
                            <span>👤</span>
                        </div>
                        <div className="choice-btn-text">
                            <strong>View Profile</strong>
                            <small>Photos, campus bio & common ground</small>
                        </div>
                        <span className="choice-arrow">›</span>
                    </button>

                    <button
                        type="button"
                        className="status-choice-cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
