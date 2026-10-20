import { useState, useEffect } from 'react';
import { SERVICE_CATEGORIES, proposeDeal } from '../services/serviceDealService';
import { recordPolicyAcceptance } from '../services/policyService';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic, triggerWarningHaptic } from '../services/haptics';
import { useToast } from './Toast';
import './CreateServiceDealModal.css';

const QUICK_AMOUNTS = [2000, 5000, 10000, 20000, 50000];

export default function CreateServiceDealModal({ matchId, otherUser, currentUserId, onClose, onDealCreated }) {
    const [role, setRole] = useState('client'); // 'client' (I will pay) | 'provider' (I will provide service)
    const [category, setCategory] = useState(SERVICE_CATEGORIES[0]?.id || 'tutoring');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [proposedDate, setProposedDate] = useState('');
    const [location, setLocation] = useState('');
    const [safetyAgreed, setSafetyAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const partnerName = otherUser?.first_name || otherUser?.name || 'Partner';

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isSubmitting]);

    const handleRoleChange = (newRole) => {
        setRole(newRole);
        triggerLightHaptic();
    };

    const handleQuickAmount = (val) => {
        setAmount(String(val));
        triggerLightHaptic();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            triggerWarningHaptic();
            addToast('Please provide a service title.', 'error');
            return;
        }
        if (!amount || Number(amount) < 500) {
            triggerWarningHaptic();
            addToast('Minimum service deal amount is ₦500.', 'error');
            return;
        }
        if (!safetyAgreed) {
            triggerWarningHaptic();
            addToast('Please confirm agreement to the Safety & Escrow Policy.', 'error');
            return;
        }

        setIsSubmitting(true);
        triggerMediumHaptic();

        try {
            const providerId = role === 'provider' ? currentUserId : otherUser.id;
            const res = await proposeDeal({
                matchId,
                title: title.trim(),
                description: description.trim(),
                category,
                amount: Number(amount),
                proposedDate: proposedDate ? new Date(proposedDate).toISOString() : null,
                location: location.trim() || null,
                providerId
            });

            if (!res.success) throw new Error(res.error);

            triggerSuccessHaptic();
            addToast('🤝 Service Deal proposed! Your partner will receive the offer in chat.', 'success');
            recordPolicyAcceptance('marketplace', '1.0', { match_id: matchId, category }).catch(() => {});
            if (onDealCreated) onDealCreated(res.dealId);
            onClose();
        } catch (err) {
            console.error('Create deal error:', err);
            triggerWarningHaptic();
            addToast(err.message || 'Failed to create service deal', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="deal-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}>
            <div className="deal-modal-card animate-deal-scale" role="dialog" aria-modal="true" aria-labelledby="deal-modal-title">
                {/* Header */}
                <div className="deal-modal-header">
                    <div className="deal-header-brand">
                        <div className="deal-brand-squircle">
                            <span className="deal-brand-icon">🤝</span>
                        </div>
                        <div>
                            <div className="deal-header-title-row">
                                <h3 id="deal-modal-title">Create Service Deal</h3>
                                <span className="deal-partner-tag">with {partnerName}</span>
                            </div>
                            <p className="deal-header-subtitle">Arrange campus services with held escrow protection</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn-close-deal-modal"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Close dialog"
                    >
                        &times;
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="deal-form">
                    {/* Role Selector */}
                    <div className="deal-section">
                        <label className="deal-field-label">My Role in this arrangement:</label>
                        <div className="role-cards-grid">
                            <button
                                type="button"
                                className={`role-card ${role === 'client' ? 'active' : ''}`}
                                onClick={() => handleRoleChange('client')}
                            >
                                <div className="role-card-top">
                                    <span className="role-card-icon">💳</span>
                                    <span className="role-card-pill">Client (Payer)</span>
                                </div>
                                <span className="role-card-title">I will pay for the service</span>
                                <span className="role-card-desc">Funds are held safely in escrow and only released when you approve</span>
                            </button>

                            <button
                                type="button"
                                className={`role-card ${role === 'provider' ? 'active' : ''}`}
                                onClick={() => handleRoleChange('provider')}
                            >
                                <div className="role-card-top">
                                    <span className="role-card-icon">🛠️</span>
                                    <span className="role-card-pill">Provider</span>
                                </div>
                                <span className="role-card-title">I will provide the service</span>
                                <span className="role-card-desc">Client funds escrow upfront so your payout is 100% guaranteed</span>
                            </button>
                        </div>
                    </div>

                    {/* Category & Title */}
                    <div className="deal-section">
                        <div className="deal-field-group">
                            <label htmlFor="deal-cat" className="deal-field-label">Service Category</label>
                            <div className="select-input-container">
                                <select
                                    id="deal-cat"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="deal-input deal-select"
                                >
                                    {SERVICE_CATEGORIES.map((c) => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="deal-field-group">
                            <label htmlFor="deal-title" className="deal-field-label">
                                Service Title <span className="required-star">*</span>
                            </label>
                            <input
                                id="deal-title"
                                type="text"
                                className="deal-input"
                                placeholder={
                                    role === 'client'
                                        ? 'e.g. Calculus 2 Exam Prep / 3 Tutoring Sessions'
                                        : 'e.g. Convocation Photo Session & 10 Retouched Images'
                                }
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={80}
                                required
                            />
                        </div>
                    </div>

                    {/* Amount & Quick Chips */}
                    <div className="deal-section">
                        <div className="deal-field-group">
                            <label htmlFor="deal-amount" className="deal-field-label">
                                Agreed Amount (₦) <span className="required-star">*</span>
                            </label>
                            <div className="amount-input-box">
                                <span className="currency-prefix">₦</span>
                                <input
                                    id="deal-amount"
                                    type="number"
                                    className="deal-input amount-input"
                                    placeholder="5000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min={500}
                                    step={500}
                                    required
                                />
                            </div>
                            <div className="quick-amount-row">
                                <span className="quick-amount-label">Quick select:</span>
                                <div className="quick-chips-wrap">
                                    {QUICK_AMOUNTS.map((val) => (
                                        <button
                                            key={val}
                                            type="button"
                                            className={`quick-chip ${Number(amount) === val ? 'selected' : ''}`}
                                            onClick={() => handleQuickAmount(val)}
                                        >
                                            ₦{val.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deliverables & Scope */}
                    <div className="deal-section">
                        <div className="deal-field-group">
                            <div className="label-with-counter">
                                <label htmlFor="deal-desc" className="deal-field-label">Deliverables & Details</label>
                                <span className="char-counter">{description.length}/400</span>
                            </div>
                            <textarea
                                id="deal-desc"
                                rows={3}
                                className="deal-textarea"
                                placeholder="Outline what will be delivered, milestones, time commitment, or expectations..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={400}
                            />
                        </div>
                    </div>

                    {/* Logistics: Date/Time & Location */}
                    <div className="deal-section">
                        <div className="deal-row-grid">
                            <div className="deal-field-group">
                                <label htmlFor="deal-date" className="deal-field-label">
                                    📅 Scheduled Time <span className="optional-tag">(Optional)</span>
                                </label>
                                <input
                                    id="deal-date"
                                    type="datetime-local"
                                    className="deal-input"
                                    value={proposedDate}
                                    onChange={(e) => setProposedDate(e.target.value)}
                                />
                            </div>
                            <div className="deal-field-group">
                                <label htmlFor="deal-loc" className="deal-field-label">
                                    📍 Location <span className="optional-tag">(Optional)</span>
                                </label>
                                <input
                                    id="deal-loc"
                                    type="text"
                                    className="deal-input"
                                    placeholder="e.g. University Library, Cafe, Google Meet"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    maxLength={60}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Escrow Trust Guarantee & Safety */}
                    <div className="deal-escrow-guarantee-card">
                        <div className="guarantee-header">
                            <span className="guarantee-badge-icon">🛡️</span>
                            <div>
                                <h4 className="guarantee-title">College Date Campus Escrow Guarantee</h4>
                                <p className="guarantee-subtitle">Your funds and work are 100% safeguarded throughout the deal</p>
                            </div>
                        </div>

                        <ul className="guarantee-points">
                            <li>
                                <span className="point-icon">🔒</span>
                                <div>
                                    <strong>Held in Safe Vault:</strong> Funds are locked securely in escrow. The provider never receives upfront payment without delivery.
                                </div>
                            </li>
                            <li>
                                <span className="point-icon">⚡</span>
                                <div>
                                    <strong>Client-Authorized Release:</strong> Payout is only transferred after the client inspects and approves the service.
                                </div>
                            </li>
                            <li>
                                <span className="point-icon">↩️</span>
                                <div>
                                    <strong>100% Refundable:</strong> Full instant refund to your wallet if the service is cancelled or unfulfilled.
                                </div>
                            </li>
                        </ul>

                        <div className="prohibited-policy-strip">
                            <span>⚠️ Strictly prohibited: commercial sexual services, prostitution, illegal substances, or academic fraud.</span>
                        </div>

                        <label className="safety-agree-label">
                            <input
                                type="checkbox"
                                checked={safetyAgreed}
                                onChange={(e) => {
                                    setSafetyAgreed(e.target.checked);
                                    triggerLightHaptic();
                                }}
                            />
                            <span>
                                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Marketplace Terms</a> and confirm this is a legitimate campus service.
                            </span>
                        </label>
                    </div>

                    {/* Sticky Footer Actions */}
                    <div className="deal-modal-footer">
                        <div className="deal-modal-actions">
                            <button
                                type="button"
                                className="btn-cancel-deal"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-submit-deal"
                                disabled={isSubmitting || !safetyAgreed || !title.trim() || Number(amount) < 500}
                            >
                                {isSubmitting ? (
                                    <span className="submit-loader-text">
                                        <span className="deal-spinner" /> Proposing Deal...
                                    </span>
                                ) : (
                                    <span>Propose Deal 🤝</span>
                                )}
                            </button>
                        </div>
                        <p className="deal-submit-reassurance">
                            💡 <strong>No funds deducted now.</strong> Escrow is only funded once both parties accept the terms.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
