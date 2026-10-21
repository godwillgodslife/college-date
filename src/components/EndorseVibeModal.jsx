import React, { useState } from 'react';
import { CAMPUS_VIBE_BADGES, endorseUserVibe } from '../utils/profileData';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { recordQuestProgress } from '../services/campusQuestService';
import { createNotification } from '../services/notificationService';
import './EndorseVibeModal.css';

export default function EndorseVibeModal({
    isOpen,
    onClose,
    targetUser,
    currentUserId,
    currentUserProfile = null,
    currentUserName = null,
    onEndorsed
}) {
    const [selectedBadgeId, setSelectedBadgeId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    if (!isOpen || !targetUser) return null;

    const studentName = targetUser.full_name?.split(' ')[0] || 'this student';

    const handleSelectBadge = (badge) => {
        triggerLightHaptic();
        setSelectedBadgeId(badge.id);
    };

    const handleConfirmEndorse = () => {
        if (!selectedBadgeId) return;
        const badge = CAMPUS_VIBE_BADGES.find(b => b.id === selectedBadgeId);
        if (!badge) return;

        const success = endorseUserVibe(targetUser.id, badge.id, currentUserId);
        if (success) {
            triggerSuccessHaptic();
            // Reward 10 XP for participating in peer campus culture
            if (currentUserId) {
                recordQuestProgress(currentUserId, 'quest_voice', 1);
            }

            // Dispatch authoritative notification to the endorsed student
            if (targetUser?.id && currentUserId) {
                const endorserDisplayName = currentUserProfile?.full_name?.trim() || currentUserName?.trim() || 'A classmate';
                createNotification({
                    userId: targetUser.id,
                    actorId: currentUserId,
                    type: 'vibe_endorsement',
                    category: 'social',
                    title: `New Campus Vibe Endorsement! ${badge.icon || '✨'}`,
                    content: `${endorserDisplayName} endorsed you as "${badge.label}" on your campus profile!`,
                    deepLink: '/profile',
                    priority: 'normal',
                    metadata: {
                        badge_id: badge.id,
                        badge_label: badge.label,
                        badge_icon: badge.icon,
                        actor_name: endorserDisplayName,
                        actor_avatar_url: currentUserProfile?.avatar_url || null,
                        url: '/profile'
                    }
                }).catch(err => console.warn('[EndorseVibeModal] Endorsement notification error:', err));
            }

            setSuccessMessage(`You endorsed ${studentName} as "${badge.label}"! +10 XP ✨`);
            if (typeof onEndorsed === 'function') {
                onEndorsed(badge);
            }
            setTimeout(() => {
                setSuccessMessage('');
                onClose();
            }, 1400);
        } else {
            setSuccessMessage(`You already endorsed ${studentName} with this badge!`);
            setTimeout(() => setSuccessMessage(''), 2000);
        }
    };

    return (
        <div className="endorse-vibe-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Endorse Campus Vibe">
            <div className="endorse-vibe-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="endorse-vibe-handle" />

                <div className="endorse-vibe-header">
                    <div className="endorse-vibe-title-row">
                        <span className="endorse-vibe-sparkle">✨</span>
                        <h2 className="endorse-vibe-title">Endorse Campus Vibe</h2>
                    </div>
                    <button type="button" className="endorse-btn-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <p className="endorse-vibe-subtitle">
                    What vibe best describes <strong>{studentName}</strong>? Your endorsement helps them stand out in campus discovery!
                </p>

                {successMessage ? (
                    <div className="endorse-success-card animate-fade-in">
                        <span className="success-icon">🎉</span>
                        <p className="success-text">{successMessage}</p>
                    </div>
                ) : (
                    <>
                        <div className="endorse-badges-grid">
                            {CAMPUS_VIBE_BADGES.map((badge) => {
                                const isSelected = selectedBadgeId === badge.id;
                                return (
                                    <button
                                        key={badge.id}
                                        type="button"
                                        className={`endorse-badge-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelectBadge(badge)}
                                    >
                                        <div className="badge-icon-box">
                                            <span className="badge-emoji">{badge.icon}</span>
                                        </div>
                                        <div className="badge-info-col">
                                            <span className="badge-card-name">{badge.label}</span>
                                            <span className="badge-card-desc">{badge.desc}</span>
                                        </div>
                                        {isSelected && (
                                            <div className="badge-selected-tick">✓</div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="endorse-modal-footer">
                            <button
                                type="button"
                                className="btn-confirm-endorse"
                                disabled={!selectedBadgeId}
                                onClick={handleConfirmEndorse}
                            >
                                {selectedBadgeId
                                    ? `✨ Endorse as ${CAMPUS_VIBE_BADGES.find(b => b.id === selectedBadgeId)?.label} (+10 XP)`
                                    : 'Select a vibe badge'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
