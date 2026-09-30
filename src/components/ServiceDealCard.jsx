import { useState, useEffect } from 'react';
import {
    getDeal,
    counterOfferDeal,
    acceptDeal,
    fundDealFromWallet,
    markServiceCompleted,
    confirmServiceRelease,
    disputeDeal,
    cancelDeal
} from '../services/serviceDealService';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import './ServiceDealCard.css';

export default function ServiceDealCard({ dealId, currentUserId, onDealUpdated }) {
    const [deal, setDeal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [counterMode, setCounterMode] = useState(false);
    const [counterAmount, setCounterAmount] = useState('');
    const [disputeMode, setDisputeMode] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (!dealId) return;

        loadDeal();

        // Subscribe to realtime changes on this specific deal
        const channel = supabase
            .channel(`deal:${dealId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'service_deals',
                    filter: `id=eq.${dealId}`
                },
                (payload) => {
                    setDeal(prev => prev ? { ...prev, ...payload.new } : payload.new);
                    if (onDealUpdated) onDealUpdated(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [dealId]);

    const loadDeal = async () => {
        setLoading(true);
        const { deal: fetchedDeal, error } = await getDeal(dealId);
        if (error) console.error('Failed to load deal:', error);
        setDeal(fetchedDeal);
        setLoading(false);
    };

    if (loading) {
        return <div className="service-deal-card loading">Loading Service Deal...</div>;
    }

    if (!deal) {
        return <div className="service-deal-card error">Service Deal not found</div>;
    }

    const isClient = currentUserId === deal.client_id;
    const isProvider = currentUserId === deal.provider_id;
    const isLastOfferedByMe = currentUserId === deal.last_offered_by;

    const handleCounterOffer = async () => {
        if (!counterAmount || Number(counterAmount) < 500) {
            addToast('Minimum counter-offer is ₦500', 'error');
            return;
        }
        setActionLoading(true);
        try {
            const res = await counterOfferDeal(deal.id, counterAmount);
            if (!res.success) throw new Error(res.error);
            addToast(`Counter-offered at ₦${Number(counterAmount).toLocaleString()}`, 'success');
            setCounterMode(false);
            loadDeal();
        } catch (err) {
            addToast(err.message || 'Failed to submit counter-offer', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAccept = async () => {
        setActionLoading(true);
        try {
            const res = await acceptDeal(deal.id);
            if (!res.success) throw new Error(res.error);
            addToast('🤝 Deal accepted! Awaiting funding.', 'success');
            loadDeal();
        } catch (err) {
            addToast(err.message || 'Failed to accept deal', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleFund = async () => {
        setActionLoading(true);
        try {
            const res = await fundDealFromWallet(deal.id);
            if (!res.success) throw new Error(res.error);
            addToast('🔒 Funds secured in Escrow! Provider notified to begin service.', 'success');
            loadDeal();
        } catch (err) {
            addToast(err.message || 'Failed to fund deal from wallet', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkComplete = async () => {
        setActionLoading(true);
        try {
            const res = await markServiceCompleted(deal.id);
            if (!res.success) throw new Error(res.error);
            addToast('✅ Service marked complete! Awaiting client release confirmation.', 'success');
            loadDeal();
        } catch (err) {
            addToast(err.message || 'Failed to mark service complete', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmRelease = async () => {
        setActionLoading(true);
        try {
            const res = await confirmServiceRelease(deal.id);
            if (!res.success) throw new Error(res.error);
            addToast(`🎉 Escrow released! ₦${res.payoutAmount?.toLocaleString()} transferred to provider.`, 'success');
            loadDeal();
        } catch (err) {
            addToast(err.message || 'Failed to release escrow funds', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDispute = async () => {
        if (!disputeReason.trim()) {
            addToast('Please provide a reason for the dispute', 'error');
            return;
        }
        setActionLoading(true);
        try {
            const res = await disputeDeal(deal.id, disputeReason.trim());
            if (!res.success) throw new Error(res.error);
            addToast('⚠️ Dispute filed. Escrow is locked pending moderation review.', 'warning');
            setDisputeMode(false);
            loadDeal();
        } catch (err) {
            addToast(err.message || 'Failed to file dispute', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        const confirmed = window.confirm('Are you sure you want to cancel this service deal?');
        if (!confirmed) return;

        setActionLoading(true);
        try {
            const res = await cancelDeal(deal.id, 'Cancelled by user');
            if (!res.success) throw new Error(res.error);
            addToast(deal.held_amount > 0 ? 'Deal cancelled. Held funds refunded to client wallet.' : 'Deal cancelled.', 'info');
            loadDeal();
        } catch (err) {
            addToast(err.message || 'Failed to cancel deal', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = () => {
        switch (deal.status) {
            case 'proposed':
                return <span className="deal-status-pill proposed">🟡 Proposed</span>;
            case 'negotiating':
                return <span className="deal-status-pill negotiating">🟠 Negotiating</span>;
            case 'accepted':
                return <span className="deal-status-pill accepted">🔵 Accepted • Awaiting Funding</span>;
            case 'funded':
                return <span className="deal-status-pill funded">🔒 Funds Secured in Escrow</span>;
            case 'completed_by_provider':
                return <span className="deal-status-pill review">⏳ Completed • Review Pending</span>;
            case 'released':
                return <span className="deal-status-pill released">✅ Released & Settled</span>;
            case 'disputed':
                return <span className="deal-status-pill disputed">⚠️ Disputed</span>;
            case 'cancelled':
                return <span className="deal-status-pill cancelled">❌ Cancelled</span>;
            case 'refunded':
                return <span className="deal-status-pill refunded">↩️ Refunded</span>;
            default:
                return <span className="deal-status-pill">{deal.status}</span>;
        }
    };

    return (
        <div className={`service-deal-card status-${deal.status}`}>
            <div className="card-top-header">
                <div className="deal-brand-label">
                    <span>🤝</span>
                    <strong>Service Deal</strong>
                </div>
                {getStatusBadge()}
            </div>

            <div className="deal-amount-banner">
                <span className="deal-amount-label">Contract Amount</span>
                <span className="deal-amount-val">₦{Number(deal.amount).toLocaleString()}</span>
            </div>

            <div className="deal-details-section">
                <h4 className="deal-title-text">{deal.title}</h4>
                {deal.description && <p className="deal-desc-text">{deal.description}</p>}

                <div className="deal-meta-row">
                    <span className="meta-item">📁 {deal.category}</span>
                    {deal.proposed_date && (
                        <span className="meta-item">
                            📅 {new Date(deal.proposed_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    {deal.location && <span className="meta-item">📍 {deal.location}</span>}
                </div>
            </div>

            {/* Negotiation input drawer */}
            {counterMode && (
                <div className="deal-counter-box animate-fade-in">
                    <label className="counter-label">Counter-Offer Amount (₦):</label>
                    <div className="counter-input-row">
                        <input
                            type="number"
                            className="counter-input"
                            value={counterAmount}
                            onChange={(e) => setCounterAmount(e.target.value)}
                            placeholder="e.g. 25000"
                            min={500}
                        />
                        <button type="button" className="btn-confirm-counter" onClick={handleCounterOffer} disabled={actionLoading}>
                            Send
                        </button>
                        <button type="button" className="btn-cancel-counter" onClick={() => setCounterMode(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Dispute input drawer */}
            {disputeMode && (
                <div className="deal-dispute-box animate-fade-in">
                    <label className="dispute-label">Explain dispute reason for moderation review:</label>
                    <textarea
                        rows={2}
                        className="dispute-textarea"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Detail the issue with service delivery or agreement..."
                    />
                    <div className="dispute-action-row">
                        <button type="button" className="btn-confirm-dispute" onClick={handleDispute} disabled={actionLoading}>
                            Submit Dispute
                        </button>
                        <button type="button" className="btn-cancel-dispute" onClick={() => setDisputeMode(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Action Buttons according to state and role */}
            <div className="deal-action-buttons">
                {(deal.status === 'proposed' || deal.status === 'negotiating') && (
                    <>
                        {!isLastOfferedByMe && (
                            <button type="button" className="btn-deal-action accept" onClick={handleAccept} disabled={actionLoading}>
                                Accept ₦{Number(deal.amount).toLocaleString()}
                            </button>
                        )}
                        <button type="button" className="btn-deal-action counter" onClick={() => setCounterMode(!counterMode)} disabled={actionLoading}>
                            Negotiate / Counter
                        </button>
                        <button type="button" className="btn-deal-action cancel" onClick={handleCancel} disabled={actionLoading}>
                            Decline
                        </button>
                    </>
                )}

                {deal.status === 'accepted' && (
                    <>
                        {isClient ? (
                            <button type="button" className="btn-deal-action fund" onClick={handleFund} disabled={actionLoading}>
                                Fund Deal (₦{Number(deal.amount).toLocaleString()})
                            </button>
                        ) : (
                            <div className="awaiting-funding-pill">Awaiting client funding...</div>
                        )}
                        <button type="button" className="btn-deal-action cancel" onClick={handleCancel} disabled={actionLoading}>
                            Cancel Deal
                        </button>
                    </>
                )}

                {deal.status === 'funded' && (
                    <>
                        {isProvider && (
                            <button type="button" className="btn-deal-action complete" onClick={handleMarkComplete} disabled={actionLoading}>
                                Mark Service Done
                            </button>
                        )}
                        {isClient && (
                            <button type="button" className="btn-deal-action release" onClick={handleConfirmRelease} disabled={actionLoading}>
                                Confirm & Release Escrow
                            </button>
                        )}
                        <button type="button" className="btn-deal-action dispute-btn" onClick={() => setDisputeMode(!disputeMode)} disabled={actionLoading}>
                            Dispute
                        </button>
                    </>
                )}

                {deal.status === 'completed_by_provider' && (
                    <>
                        {isClient ? (
                            <button type="button" className="btn-deal-action release" onClick={handleConfirmRelease} disabled={actionLoading}>
                                Confirm Completion & Release ₦{Number(deal.held_amount).toLocaleString()}
                            </button>
                        ) : (
                            <div className="awaiting-funding-pill">Client review pending...</div>
                        )}
                        <button type="button" className="btn-deal-action dispute-btn" onClick={() => setDisputeMode(!disputeMode)} disabled={actionLoading}>
                            Dispute
                        </button>
                    </>
                )}

                {deal.status === 'disputed' && (
                    <div className="deal-notice-bar dispute">
                        ⚠️ Deal disputed ({deal.dispute_reason}). Our campus safety and operations team is reviewing this agreement.
                    </div>
                )}

                {deal.status === 'released' && (
                    <div className="deal-notice-bar success">
                        ✅ Escrow successfully released to provider!
                    </div>
                )}

                {deal.status === 'refunded' && (
                    <div className="deal-notice-bar refunded">
                        ↩️ Deal cancelled and held escrow refunded to client wallet.
                    </div>
                )}
            </div>
        </div>
    );
}
