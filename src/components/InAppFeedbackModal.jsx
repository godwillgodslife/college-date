import { useState } from 'react';
import { FEEDBACK_CATEGORIES, submitInAppFeedback } from '../services/feedbackService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import './InAppFeedbackModal.css';

export default function InAppFeedbackModal({
    isOpen,
    onClose,
    defaultCategory = 'feedback_suggestion',
    targetUser = null,
    onOpenStandards = null
}) {
    const { currentUser } = useAuth();
    const { addToast } = useToast();

    const [category, setCategory] = useState(defaultCategory);
    const [message, setMessage] = useState('');
    const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
    const [targetInfo, setTargetInfo] = useState(targetUser?.full_name ? `${targetUser.full_name} (${targetUser.id || 'Match'})` : '');
    const [submitting, setSubmitting] = useState(false);
    const [submittedData, setSubmittedData] = useState(null);

    if (!isOpen) return null;

    const isChildSafety = category === 'child_safety';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim() || message.trim().length < 3) {
            addToast('Please enter your feedback or report description.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const res = await submitInAppFeedback({
                category,
                message: message.trim(),
                contactEmail: contactEmail.trim() || null,
                targetInfo: targetInfo.trim() || null
            });

            if (res.success) {
                setSubmittedData(res);
                addToast(res.message || 'Feedback submitted successfully.', 'success');
            } else {
                addToast(res.error || 'Failed to submit feedback. Please try again.', 'error');
            }
        } catch (err) {
            console.error('Feedback modal submit error:', err);
            addToast('Something went wrong. Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setSubmittedData(null);
        setMessage('');
        onClose();
    };

    return (
        <div className="inapp-feedback-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="inapp-feedback-card" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="inapp-feedback-header">
                    <div className="feedback-header-lead">
                        <div className={`feedback-icon-bubble ${isChildSafety ? 'child-safety' : ''}`}>
                            {isChildSafety ? '🛡️' : '💬'}
                        </div>
                        <div>
                            <h2 className="feedback-title">
                                {isChildSafety ? 'Child Safety & Protection Report' : 'In-App Feedback & Safety'}
                            </h2>
                            <p className="feedback-subtitle">
                                {isChildSafety
                                    ? 'Urgent triage by our designated Child Safety Officer without leaving the app.'
                                    : 'Share your thoughts, suggestions, or safety concerns directly with our team.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="feedback-close-btn"
                        onClick={onClose}
                        aria-label="Close dialog"
                    >
                        &times;
                    </button>
                </div>

                {submittedData ? (
                    /* Submission Success State */
                    <div className="feedback-success-state">
                        <div className="success-badge-circle">✅</div>
                        <h3>Submission Received</h3>
                        <p className="success-body-text">{submittedData.message}</p>
                        <div className="ticket-ref-pill">
                            <span>Reference Ticket:</span>
                            <strong>{submittedData.ticketRef}</strong>
                        </div>
                        <p className="success-notice">
                            You do not need to take any further action. Our safety and engineering team review submissions continuously.
                        </p>
                        <button
                            type="button"
                            className="btn-feedback-done"
                            onClick={handleReset}
                        >
                            Done & Return to App
                        </button>
                    </div>
                ) : (
                    /* Submission Form */
                    <form onSubmit={handleSubmit} className="feedback-form">
                        {/* Category Selector */}
                        <div className="feedback-field-group">
                            <label className="feedback-field-label">Category</label>
                            <div className="feedback-category-pills">
                                {FEEDBACK_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        className={`feedback-category-pill ${category === cat.id ? 'active' : ''} ${cat.id === 'child_safety' ? 'child-safety-pill' : ''}`}
                                        onClick={() => setCategory(cat.id)}
                                    >
                                        <span>{cat.label}</span>
                                        {cat.badge && <span className="cat-urgent-badge">{cat.badge}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Child Safety Context Notice */}
                        {isChildSafety && (
                            <div className="feedback-child-safety-alert">
                                <div className="safety-alert-icon">🔒</div>
                                <div className="safety-alert-text">
                                    <strong>Zero Tolerance Policy:</strong> The College Date explicitly prohibits Child Sexual Abuse Material (CSAM) and Child Sexual Abuse and Exploitation (CSAE). All reports are handled with highest priority and reported to NCMEC and legal authorities.
                                    {onOpenStandards && (
                                        <button
                                            type="button"
                                            className="safety-alert-link"
                                            onClick={() => {
                                                onClose();
                                                onOpenStandards();
                                            }}
                                        >
                                            View Child Safety Standards →
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Message Description */}
                        <div className="feedback-field-group">
                            <div className="feedback-label-with-count">
                                <label htmlFor="feedback-message" className="feedback-field-label">
                                    {isChildSafety ? 'Description of Safety Concern *' : 'Your Feedback or Message *'}
                                </label>
                                <span className="feedback-count">{message.length}/1000</span>
                            </div>
                            <textarea
                                id="feedback-message"
                                rows={4}
                                className="feedback-textarea"
                                placeholder={
                                    isChildSafety
                                        ? 'Please provide details on what you observed (usernames, behavior, messages, or content)...'
                                        : 'Tell us how we can improve The College Date, report a glitch, or request a feature...'
                                }
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                maxLength={1000}
                                required
                            />
                        </div>

                        {/* Target Information (Optional) */}
                        <div className="feedback-field-group">
                            <label htmlFor="feedback-target" className="feedback-field-label">
                                Related User, Profile or Link (optional)
                            </label>
                            <input
                                id="feedback-target"
                                type="text"
                                className="feedback-input"
                                placeholder="e.g. Student name, chat match, or profile link"
                                value={targetInfo}
                                onChange={(e) => setTargetInfo(e.target.value)}
                            />
                        </div>

                        {/* Contact Email */}
                        <div className="feedback-field-group">
                            <label htmlFor="feedback-email" className="feedback-field-label">
                                Contact Email (for updates on your report)
                            </label>
                            <input
                                id="feedback-email"
                                type="email"
                                className="feedback-input"
                                placeholder="yourname@gmail.com"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                            />
                        </div>

                        {/* Submit Actions */}
                        <div className="feedback-modal-actions">
                            <button
                                type="button"
                                className="btn-feedback-cancel"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`btn-feedback-submit ${isChildSafety ? 'urgent' : ''}`}
                                disabled={submitting || !message.trim()}
                            >
                                {submitting ? 'Submitting...' : isChildSafety ? '🛡️ Submit Urgent Report' : 'Send Feedback'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
