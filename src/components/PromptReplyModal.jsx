import React, { useState } from 'react';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/haptics';
import { getAvatarUrl } from '../utils/profileData';
import './PromptReplyModal.css';

const QUICK_SUGGESTIONS = [
    "What's your favorite campus spot? ☕",
    "No way, me too! 🙌",
    "Let's study together sometime! 📚",
    "You have great taste in music 🎶",
    "This made me smile 😂"
];

export default function PromptReplyModal({
    isOpen,
    onClose,
    targetProfile,
    targetPrompt,
    onSendReply,
    superSwipesAvailable = 0
}) {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !targetProfile) return null;

    const displayName = targetProfile.full_name?.split(' ')[0] || targetProfile.username || 'Student';
    const avatarUrl = getAvatarUrl(targetProfile);
    const category = targetPrompt?.category || 'Prompt';
    const quote = targetPrompt?.content || targetProfile.bio || 'Campus profile vibe';

    const handleSend = async (swipeType = 'standard') => {
        if (!message.trim() || isSubmitting) return;
        triggerSuccessHaptic();
        setIsSubmitting(true);
        try {
            await onSendReply?.(message.trim(), swipeType, targetPrompt);
            setMessage('');
            onClose?.();
        } catch (err) {
            console.error('Failed to send prompt reply:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="prompt-reply-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Reply to Prompt">
            <div className="prompt-reply-sheet" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="reply-header">
                    <div className="reply-user-snippet">
                        <img src={avatarUrl} alt={displayName} className="reply-user-avatar" />
                        <div className="reply-user-info">
                            <h3 className="reply-target-name">{displayName}</h3>
                            <p className="reply-target-label">Replying to {category.toLowerCase()}</p>
                        </div>
                    </div>
                    <button type="button" className="reply-btn-close" onClick={onClose}>
                        &times;
                    </button>
                </div>

                {/* Quoted Prompt Chip */}
                <div className="reply-prompt-preview">
                    <span className="reply-prompt-category">{category}</span>
                    <p className="reply-prompt-quote">"{quote}"</p>
                </div>

                {/* Textarea Input */}
                <div className="reply-input-box">
                    <textarea
                        className="reply-textarea"
                        placeholder={`Say something about ${displayName}'s ${category.toLowerCase()}...`}
                        value={message}
                        onChange={e => setMessage(e.target.value.slice(0, 240))}
                        autoFocus
                    />
                    <div className="reply-meta-row">
                        <span>Attach icebreaker to your like</span>
                        <span>{message.length}/240</span>
                    </div>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="reply-suggestions-row">
                    {QUICK_SUGGESTIONS.map((chip, idx) => (
                        <button
                            key={idx}
                            type="button"
                            className="reply-suggestion-chip"
                            onClick={() => {
                                triggerLightHaptic();
                                setMessage(chip);
                            }}
                        >
                            {chip}
                        </button>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="reply-actions-grid">
                    <button
                        type="button"
                        className="reply-btn-like"
                        disabled={!message.trim() || isSubmitting}
                        onClick={() => handleSend('standard')}
                    >
                        ❤️ Like & Send
                    </button>
                    <button
                        type="button"
                        className="reply-btn-super"
                        disabled={!message.trim() || isSubmitting}
                        onClick={() => handleSend('super')}
                        title={superSwipesAvailable > 0 ? `${superSwipesAvailable} Super Swipes remaining` : 'Send priority Super Swipe'}
                    >
                        ⭐ Super ({superSwipesAvailable})
                    </button>
                </div>
            </div>
        </div>
    );
}
