import { useState } from 'react';
import { REPORT_REASONS, submitUserReport } from '../services/reportService';
import { blockUser } from '../services/blockService';
import { useToast } from './Toast';
import './ReportModal.css';

export default function ReportModal({ targetUser, contextType = 'chat', contextId = null, onClose, onReportSuccess }) {
    const [selectedReason, setSelectedReason] = useState('harassment');
    const [description, setDescription] = useState('');
    const [alsoBlock, setAlsoBlock] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { addToast } = useToast();

    if (!targetUser) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { success, error, message } = await submitUserReport({
                reportedId: targetUser.id,
                reason: selectedReason,
                description,
                contextType,
                contextId
            });

            if (!success) throw new Error(error);

            if (alsoBlock) {
                await blockUser(targetUser.id);
                addToast(`Report submitted & ${targetUser.full_name || 'user'} has been blocked.`, 'success');
            } else {
                addToast(message || 'Report submitted confidentially. Our trust & safety team will review.', 'success');
            }

            if (onReportSuccess) onReportSuccess({ alsoBlocked: alsoBlock });
            onClose();
        } catch (err) {
            console.error('Report submission error:', err);
            addToast(err.message || 'Failed to submit report', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="report-modal-overlay">
            <div className="report-modal-card">
                <div className="report-modal-header">
                    <div className="report-icon-circle">🚩</div>
                    <div className="report-header-text">
                        <h3>Report {targetUser.full_name || 'User'}</h3>
                        <p>Your report is 100% confidential and never revealed to this user.</p>
                    </div>
                    <button type="button" className="btn-close-report" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="report-form">
                    <label className="report-section-label">Select reason for reporting:</label>
                    <div className="report-reasons-list">
                        {REPORT_REASONS.map((r) => (
                            <label
                                key={r.id}
                                className={`report-reason-option ${selectedReason === r.id ? 'selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="report_reason"
                                    value={r.id}
                                    checked={selectedReason === r.id}
                                    onChange={() => setSelectedReason(r.id)}
                                />
                                <div className="reason-text-group">
                                    <span className="reason-title">{r.label}</span>
                                    <span className="reason-desc">{r.desc}</span>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="report-desc-group">
                        <label htmlFor="report-desc" className="report-section-label">Additional context (optional):</label>
                        <textarea
                            id="report-desc"
                            rows={3}
                            placeholder="Help our moderation team understand what happened..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={500}
                        />
                    </div>

                    <label className="report-checkbox-label">
                        <input
                            type="checkbox"
                            checked={alsoBlock}
                            onChange={(e) => setAlsoBlock(e.target.checked)}
                        />
                        <span>Also block <strong>{targetUser.full_name || 'this user'}</strong> from messaging, calling, or seeing me</span>
                    </label>

                    <div className="report-modal-actions">
                        <button type="button" className="btn-cancel-report" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit-report" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
