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
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic, triggerWarningHaptic } from '../services/haptics';
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
        return (
            <div className="service-deal-card loading">
                <span className="deal-card-spinner" />
                <span>Loading Service Deal...</span>
            </div>
        );
    }

    if (!deal) {
        return <div className="service-deal-card error">Service Deal not found</div>;
    }

    const isClient = currentUserId === deal.client_id;
    const isProvider = currentUserId === deal.provider_id;
    const isLastOfferedByMe = currentUserId === deal.last_offered_by;

    const getEscrowStep = (status) => {
        switch (status) {
            case 'proposed':
            case 'negotiating':
                return 1;
            case 'accepted':
                return 1;
            case 'funded':
                return 2;
            case 'completed_by_provider':
                return 3;
            case 'released':
                return 4;
            default:
                return 1;
        }
    };

    const currentStepIndex = getEscrowStep(deal.status);

    const handleCounterOffer = async () => {
        if (!counterAmount || Number(counterAmount) < 500) {
            triggerWarningHaptic();
            addToast('Minimum counter-offer is ₦500', 'error');
            return;
        }
        setActionLoading(true);
        triggerMediumHaptic();
        try {
            const res = await counterOfferDeal(deal.id, counterAmount);
            if (!res.success) throw new Error(res.error);
            triggerSuccessHaptic();
            addToast(`Counter-offered at ₦${Number(counterAmount).toLocaleString()}`, 'success');
            setCounterMode(false);
            loadDeal();
        } catch (err) {
            triggerWarningHaptic();
            addToast(err.message || 'Failed to submit counter-offer', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAccept = async () => {
        setActionLoading(true);
        triggerMediumHaptic();
        try {
            const res = await acceptDeal(deal.id);
            if (!res.success) throw new Error(res.error);
            triggerSuccessHaptic();
            addToast('🤝 Deal accepted! Awaiting funding.', 'success');
            loadDeal();
        } catch (err) {
            triggerWarningHaptic();
            addToast(err.message || 'Failed to accept deal', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleFund = async () => {
        setActionLoading(true);
        triggerMediumHaptic();
        try {
            const res = await fundDealFromWallet(deal.id);
            if (!res.success) throw new Error(res.error);
            triggerSuccessHaptic();
            addToast('🔒 Funds secured in Escrow! Provider notified to begin service.', 'success');
            loadDeal();
        } catch (err) {
            triggerWarningHaptic();
            addToast(err.message || 'Failed to fund deal from wallet', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkComplete = async () => {
        setActionLoading(true);
        triggerMediumHaptic();
        try {
            const res = await markServiceCompleted(deal.id);
            if (!res.success) throw new Error(res.error);
            triggerSuccessHaptic();
            addToast('✅ Service marked complete! Awaiting client release confirmation.', 'success');
            loadDeal();
        } catch (err) {
            triggerWarningHaptic();
            addToast(err.message || 'Failed to mark service complete', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmRelease = async () => {
        setActionLoading(true);
        triggerMediumHaptic();
        try {
            const res = await confirmServiceRelease(deal.id);
            if (!res.success) throw new Error(res.error);
            triggerSuccessHaptic();
            addToast(`🎉 Escrow released! ₦${res.payoutAmount?.toLocaleString()} transferred to provider.`, 'success');
            loadDeal();
        } catch (err) {
            triggerWarningHaptic();
            addToast(err.message || 'Failed to release escrow funds', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDispute = async () => {
        if (!disputeReason.trim()) {
            triggerWarningHaptic();
            addToast('Please provide a reason for the dispute', 'error');
            return;
        }
        setActionLoading(true);
        triggerWarningHaptic();
        try {
            const res = await disputeDeal(deal.id, disputeReason.trim());
            if (!res.success) throw new Error(res.error);
            triggerWarningHaptic();
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
        triggerWarningHaptic();
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
                return <span className="deal-status-pill negotiating">🟠 Counter-Offer</span>;
            case 'accepted':
                return <span className="deal-status-pill accepted">🔵 Accepted • Fund Needed</span>;
            case 'funded':
                return <span className="deal-status-pill funded">🔒 In Escrow Vault</span>;
            case 'completed_by_provider':
                return <span className="deal-status-pill review">⏳ Delivered • Approve</span>;
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
            {/* Header with Brand & Status */}
            <div className="card-top-header">
                <div className="deal-brand-label">
                    <span className="deal-handshake-icon">🤝</span>
                    <strong>Campus Deal</strong>
                </div>
                {getStatusBadge()}
            </div>

            {/* Role & Protection Banner */}
            <div className="deal-user-role-strip">
                <span className="deal-role-text">
                    {isClient ? '💳 You are the Client (Payer)' : isProvider ? '🛠️ You are the Provider' : '🤝 Campus Deal'}
                </span>
                <span className="deal-escrow-shield">🛡️ Escrow Protected</span>
            </div>

            {/* Escrow 4-Stage Stepper */}
            {deal.status !== 'cancelled' && deal.status !== 'refunded' && (
                <div className="escrow-stepper-wrap">
                    <div className="escrow-stepper">
                        <div className={`stepper-node ${currentStepIndex >= 1 ? 'completed' : ''} ${currentStepIndex === 1 ? 'current' : ''}`}>
                            <div className="stepper-dot">
                                {currentStepIndex > 1 ? '✓' : '1'}
                            </div>
                            <span className="stepper-label">Agreed</span>
                        </div>
                        <div className={`stepper-line ${currentStepIndex >= 2 ? 'filled' : ''}`} />
                        <div className={`stepper-node ${currentStepIndex >= 2 ? 'completed' : ''} ${currentStepIndex === 2 ? 'current' : ''}`}>
                            <div className="stepper-dot">
                                {currentStepIndex > 2 ? '✓' : '2'}
                            </div>
                            <span className="stepper-label">Escrowed</span>
                        </div>
                        <div className={`stepper-line ${currentStepIndex >= 3 ? 'filled' : ''}`} />
                        <div className={`stepper-node ${currentStepIndex >= 3 ? 'completed' : ''} ${currentStepIndex === 3 ? 'current' : ''}`}>
                            <div className="stepper-dot">
                                {currentStepIndex > 3 ? '✓' : '3'}
                            </div>
                            <span className="stepper-label">Delivered</span>
                        </div>
                        <div className={`stepper-line ${currentStepIndex >= 4 ? 'filled' : ''}`} />
                        <div className={`stepper-node ${currentStepIndex >= 4 ? 'completed' : ''} ${currentStepIndex === 4 ? 'current' : ''}`}>
                            <div className="stepper-dot">
                                {currentStepIndex >= 4 ? '✓' : '4'}
                            </div>
                            <span className="stepper-label">Paid</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Contract Amount Banner */}
            <div className="deal-amount-banner">
                <div className="deal-amount-left">
                    <span className="deal-amount-label">Contract Amount</span>
                    <span className="deal-escrow-note">
                        {deal.held_amount > 0 ? '🔒 Held in College Date vault' : '⚡ No funds charged yet'}
                    </span>
                </div>
                <span className="deal-amount-val">₦{Number(deal.amount).toLocaleString()}</span>
            </div>

            {/* Details Section */}
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

            {/* Negotiation Drawer */}
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
                            Send Counter
                        </button>
                        <button type="button" className="btn-cancel-counter" onClick={() => setCounterMode(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Dispute Drawer */}
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
                        <button type="button" className="btn-deal-action counter" onClick={() => { setCounterMode(!counterMode); triggerLightHaptic(); }} disabled={actionLoading}>
                            {counterMode ? 'Close Counter' : 'Negotiate / Counter'}
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
                                🔒 Deposit ₦{Number(deal.amount).toLocaleString()} into Escrow
                            </button>
                        ) : (
                            <div className="awaiting-funding-pill">
                                ⏳ Waiting for client to lock funds into Escrow...
                            </div>
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
                                ✅ Mark Service Delivered
                            </button>
                        )}
                        {isClient && (
                            <button type="button" className="btn-deal-action release" onClick={handleConfirmRelease} disabled={actionLoading}>
                                Confirm & Release Escrow
                            </button>
                        )}
                        <button type="button" className="btn-deal-action dispute-btn" onClick={() => { setDisputeMode(!disputeMode); triggerLightHaptic(); }} disabled={actionLoading}>
                            Dispute
                        </button>
                    </>
                )}

                {deal.status === 'completed_by_provider' && (
                    <>
                        {isClient ? (
                            <button type="button" className="btn-deal-action release" onClick={handleConfirmRelease} disabled={actionLoading}>
                                🎉 Confirm Completion & Release ₦{Number(deal.held_amount || deal.amount).toLocaleString()}
                            </button>
                        ) : (
                            <div className="awaiting-funding-pill">
                                ⏳ Service delivered! Waiting for client approval...
                            </div>
                        )}
                        <button type="button" className="btn-deal-action dispute-btn" onClick={() => { setDisputeMode(!disputeMode); triggerLightHaptic(); }} disabled={actionLoading}>
                            Dispute
                        </button>
                    </>
                )}

                {deal.status === 'disputed' && (
                    <div className="deal-notice-bar dispute">
                        ⚠️ Deal disputed ({deal.dispute_reason || 'Pending review'}). Our campus trust team is mediating.
                    </div>
                )}

                {deal.status === 'released' && (
                    <div className="deal-notice-bar success">
                        ✅ Escrow successfully released to provider! Thank you for using College Date Escrow.
                    </div>
                )}

                {deal.status === 'refunded' && (
                    <div className="deal-notice-bar refunded">
                        ↩️ Deal cancelled. Held escrow funds refunded to client wallet.
                    </div>
                )}
            </div>
        </div>
    );
}
