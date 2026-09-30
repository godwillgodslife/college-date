import { useState } from 'react';
import { SERVICE_CATEGORIES, proposeDeal } from '../services/serviceDealService';
import { recordPolicyAcceptance } from '../services/policyService';
import { useToast } from './Toast';
import './CreateServiceDealModal.css';

export default function CreateServiceDealModal({ matchId, otherUser, currentUserId, onClose, onDealCreated }) {
    const [role, setRole] = useState('client'); // 'client' (I will pay) | 'provider' (I will provide service)
    const [category, setCategory] = useState(SERVICE_CATEGORIES[0].id);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [proposedDate, setProposedDate] = useState('');
    const [location, setLocation] = useState('');
    const [safetyAgreed, setSafetyAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            addToast('Please provide a service title.', 'error');
            return;
        }
        if (!amount || Number(amount) < 500) {
            addToast('Minimum service deal amount is ₦500.', 'error');
            return;
        }
        if (!safetyAgreed) {
            addToast('Please confirm agreement to the Safety & Prohibited Services Policy.', 'error');
            return;
        }

        setIsSubmitting(true);
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

            addToast('🤝 Service Deal proposed! Your partner will receive the offer in chat.', 'success');
            recordPolicyAcceptance('marketplace', '1.0', { match_id: matchId, category }).catch(() => {});
            if (onDealCreated) onDealCreated(res.dealId);
            onClose();
        } catch (err) {
            console.error('Create deal error:', err);
            addToast(err.message || 'Failed to create service deal', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="deal-modal-overlay">
            <div className="deal-modal-card">
                <div className="deal-modal-header">
                    <div className="deal-header-brand">
                        <span className="deal-brand-icon">🤝</span>
                        <div>
                            <h3>Create Service Deal</h3>
                            <p>Arrange trusted campus services with held escrow protection</p>
                        </div>
                    </div>
                    <button type="button" className="btn-close-deal-modal" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="deal-form">
                    <div className="deal-role-selector">
                        <label className="deal-field-label">My Role in this arrangement:</label>
                        <div className="role-pills">
                            <button
                                type="button"
                                className={`role-pill ${role === 'client' ? 'active' : ''}`}
                                onClick={() => setRole('client')}
                            >
                                💳 I will pay for the service
                            </button>
                            <button
                                type="button"
                                className={`role-pill ${role === 'provider' ? 'active' : ''}`}
                                onClick={() => setRole('provider')}
                            >
                                🛠️ I will provide the service
                            </button>
                        </div>
                    </div>

                    <div className="deal-field-group">
                        <label htmlFor="deal-cat" className="deal-field-label">Service Category:</label>
                        <select
                            id="deal-cat"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="deal-input"
                        >
                            {SERVICE_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="deal-field-group">
                        <label htmlFor="deal-title" className="deal-field-label">Service Title:</label>
                        <input
                            id="deal-title"
                            type="text"
                            className="deal-input"
                            placeholder="e.g. Convocation Photography, Calculus Tutoring"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={80}
                            required
                        />
                    </div>

                    <div className="deal-field-group">
                        <label htmlFor="deal-amount" className="deal-field-label">Agreed Amount (₦):</label>
                        <input
                            id="deal-amount"
                            type="number"
                            className="deal-input amount-input"
                            placeholder="e.g. 20000"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min={500}
                            required
                        />
                    </div>

                    <div className="deal-field-group">
                        <label htmlFor="deal-desc" className="deal-field-label">Deliverables & Details:</label>
                        <textarea
                            id="deal-desc"
                            rows={3}
                            className="deal-textarea"
                            placeholder="Outline specific deliverables, duration, or meeting expectations..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={400}
                        />
                    </div>

                    <div className="deal-row-grid">
                        <div className="deal-field-group">
                            <label htmlFor="deal-date" className="deal-field-label">Scheduled Date/Time:</label>
                            <input
                                id="deal-date"
                                type="datetime-local"
                                className="deal-input"
                                value={proposedDate}
                                onChange={(e) => setProposedDate(e.target.value)}
                            />
                        </div>
                        <div className="deal-field-group">
                            <label htmlFor="deal-loc" className="deal-field-label">Location (Campus/Online):</label>
                            <input
                                id="deal-loc"
                                type="text"
                                className="deal-input"
                                placeholder="e.g. Library, Cafe, Google Meet"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                maxLength={60}
                            />
                        </div>
                    </div>

                    <div className="deal-safety-box">
                        <div className="safety-badge">🛡️ Safety & Prohibited Services Policy</div>
                        <p className="safety-text">
                            College Date strictly prohibits commercial sexual services, prostitution, illegal substances, or academic fraud. Escrow funds are secured safely upon funding and only released after verified completion.
                        </p>
                        <label className="safety-agree-label">
                            <input
                                type="checkbox"
                                checked={safetyAgreed}
                                onChange={(e) => setSafetyAgreed(e.target.checked)}
                            />
                            <span>
                                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary, #ff4b4b)', textDecoration: 'underline' }}>Marketplace Terms</a> and confirm this is a legitimate campus service.
                            </span>
                        </label>
                    </div>

                    <div className="deal-modal-actions">
                        <button type="button" className="btn-cancel-deal" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit-deal" disabled={isSubmitting || !safetyAgreed}>
                            {isSubmitting ? 'Proposing Deal...' : 'Propose Deal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
