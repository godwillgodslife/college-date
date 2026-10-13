import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
    PAYSTACK_PRODUCTS,
    getRevenueCatPackages,
    purchaseRevenueCatPackage,
    startPaystackPayment,
    openHostedPaystackCheckout,
    isNative
} from '../services/paymentService';
import {
    checkTrialEligibility,
    recordTrialOfferImpression,
    recordTrialOfferDismissed,
    claimPremiumTrial
} from '../services/trialService';
import confetti from 'canvas-confetti';
import './ContextualPaywallSheet.css';

const TOUCHPOINT_COPY = {
    viewers_list: {
        pill: '👀 SECRET ADMIRERS',
        title: 'See Who Checked You Out',
        subtitle: 'Don\'t miss out on campus crushes. Unlock full photos of students who liked you and match instantly without swiping.',
        icon: '👀'
    },
    swipe_wall: {
        pill: '⚡ UNLIMITED CAMPUS SWIPES',
        title: 'Keep Meeting Students',
        subtitle: 'You\'ve hit your 20-swipe daily limit. Remove all restrictions and keep discovering attractive students across your faculty.',
        icon: '⚡'
    },
    video_upload: {
        pill: '🎬 10S-30S LIVE VIDEO',
        title: 'Showcase Your Real Vibe',
        subtitle: 'Static photos only show half the story. Add a 10s video moment (or 30s with Elite Ultra) to triple your response and match rate.',
        icon: '🎬'
    },
    photo_slots: {
        pill: '📸 UNLOCK 6 PROFILE PHOTOS',
        title: 'Expand Your Campus Gallery',
        subtitle: 'Free accounts are capped at 4 photos. Upgrade to Elite to unlock all 6 photo slots and get 3x more campus matches.',
        icon: '📸'
    },
    general: {
        pill: '👑 COLLEGE DATE ELITE',
        title: 'Unlock Your Full Dating Edge',
        subtitle: 'Get top 10% placement in your university feed, unlimited swipes, and see who likes you before swiping.',
        icon: '👑'
    }
};

const SUBSCRIPTION_PLANS = [
    {
        id: 'premium_3month',
        productId: PAYSTACK_PRODUCTS.premium3Month,
        name: '3 Months',
        rate: '₦2,400',
        perPeriod: '/ mo',
        totalLabel: '₦7,200 quarterly',
        tag: '🔥 Save ₦1,500',
        savings: 1500,
        isPopular: true
    },
    {
        id: 'premium_monthly',
        productId: PAYSTACK_PRODUCTS.premiumMonthly,
        name: '1 Month',
        rate: '₦2,900',
        perPeriod: '/ mo',
        totalLabel: '₦2,900 monthly',
        tag: null,
        savings: 0
    }
];

export default function ContextualPaywallSheet({
    isOpen,
    onClose,
    triggerSource = 'general',
    customTitle,
    customSubtitle,
    onSuccess
}) {
    const { currentUser, fetchProfile } = useAuth();
    const { addToast } = useToast();
    const [isEligibleForTrial, setIsEligibleForTrial] = useState(false);
    const [checkingEligibility, setCheckingEligibility] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState('premium_3month');
    const [isProcessing, setIsProcessing] = useState(false);
    const [rcPackages, setRcPackages] = useState([]);

    const copy = TOUCHPOINT_COPY[triggerSource] || TOUCHPOINT_COPY.general;
    const activeTitle = customTitle || copy.title;
    const activeSubtitle = customSubtitle || copy.subtitle;
    const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[0];

    useEffect(() => {
        if (!isOpen || !currentUser) return;

        recordTrialOfferImpression(triggerSource);

        async function evaluateTrial() {
            setCheckingEligibility(true);
            try {
                const result = await checkTrialEligibility(currentUser.id);
                setIsEligibleForTrial(result?.eligible === true);

                if (isNative()) {
                    const pkgs = await getRevenueCatPackages();
                    if (pkgs && pkgs.length > 0) setRcPackages(pkgs);
                }
            } catch (err) {
                console.warn('[ContextualPaywallSheet] Eligibility check error:', err);
                setIsEligibleForTrial(false);
            } finally {
                setCheckingEligibility(false);
            }
        }

        evaluateTrial();
    }, [isOpen, currentUser, triggerSource]);

    const handleDismiss = () => {
        recordTrialOfferDismissed(triggerSource);
        onClose();
    };

    const handleClaimTrial = async () => {
        setIsProcessing(true);
        try {
            const rcPackage = rcPackages.find(p => {
                const id = (p.identifier || '').toLowerCase();
                return id.includes('3month') || id.includes('quarterly') || id.includes('$rc_three_month');
            }) || rcPackages[0] || null;

            await claimPremiumTrial({
                userId: currentUser.id,
                triggerSource,
                rcPackage
            });

            addToast('3-Day Free Trial Activated! Enjoy College Date Elite 🎉', 'success');
            try {
                confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
            } catch {
                // Confetti fallback
            }

            await fetchProfile(currentUser.id);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            if (!err.userCancelled) {
                console.error('[ContextualPaywallSheet] Trial activation failed:', err);
                addToast(err.message || 'Could not activate trial. Try regular upgrade.', 'error');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStandardUpgrade = async () => {
        setIsProcessing(true);
        try {
            if (isNative() && rcPackages.length > 0) {
                const pkgToBuy = rcPackages.find(p => {
                    const id = (p.identifier || '').toLowerCase();
                    if (selectedPlan.id === 'premium_monthly') return id.includes('monthly');
                    return id.includes('3month') || id.includes('quarterly');
                }) || rcPackages[0];

                const { success, error } = await purchaseRevenueCatPackage(pkgToBuy, {
                    requiredEntitlement: 'Premium'
                });

                if (success) {
                    addToast('Welcome to College Date Elite! 🎉', 'success');
                    await fetchProfile(currentUser.id);
                    if (onSuccess) onSuccess();
                    onClose();
                    return;
                }
            }

            // Web or Native fallback: Paystack
            const { data: payment, error } = await startPaystackPayment(selectedPlan.productId);
            if (error) throw new Error(error);
            openHostedPaystackCheckout(payment);
            onClose();
        } catch (err) {
            console.error('[ContextualPaywallSheet] Upgrade error:', err);
            addToast(err.message || 'Upgrade failed', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="paywall-sheet-portal">
                    {/* Backdrop */}
                    <motion.div
                        className="paywall-sheet-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleDismiss}
                    />

                    {/* Bottom Sheet Drawer */}
                    <motion.div
                        className="paywall-sheet-container"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) handleDismiss();
                        }}
                    >
                        {/* Pull handle */}
                        <div className="sheet-pull-handle">
                            <span className="pull-bar"></span>
                        </div>

                        <div className="sheet-body">
                            {/* Contextual Header Tag */}
                            <div className="sheet-touchpoint-pill">
                                <span>{copy.pill}</span>
                            </div>

                            <h2 className="sheet-title">{activeTitle}</h2>
                            <p className="sheet-subtitle">{activeSubtitle}</p>

                            {/* ── CASE A: 3-DAY FREE TRIAL OFFER (When Eligible) ── */}
                            {isEligibleForTrial ? (
                                <div className="sheet-trial-card">
                                    <div className="trial-badge-row">
                                        <span className="trial-gift-badge">🎁 SPECIAL STUDENT OFFER</span>
                                        <span className="trial-cost-tag">₦0.00 TODAY</span>
                                    </div>

                                    <h3 className="trial-headline">Try College Date Elite Free for 3 Days</h3>

                                    {/* Timeline visual */}
                                    <div className="trial-timeline">
                                        <div className="timeline-step">
                                            <div className="step-dot active">✓</div>
                                            <div className="step-info">
                                                <span className="step-title">Today (Day 1)</span>
                                                <span className="step-desc">Full Elite unlocked for ₦0.00</span>
                                            </div>
                                        </div>
                                        <div className="timeline-step">
                                            <div className="step-dot reminder">🔔</div>
                                            <div className="step-info">
                                                <span className="step-title">Day 2 (T+48h)</span>
                                                <span className="step-desc">Friendly reminder before trial ends</span>
                                            </div>
                                        </div>
                                        <div className="timeline-step">
                                            <div className="step-dot bill">💳</div>
                                            <div className="step-info">
                                                <span className="step-title">Day 3 (T+72h)</span>
                                                <span className="step-desc">Renews at ₦2,400/mo (₦7,200 quarterly)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="trial-cancel-guarantee">
                                        <span>🛡️ Cancel anytime with 1 tap in Google Play / Settings. No surprises.</span>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-sheet-primary-trial"
                                        onClick={handleClaimTrial}
                                        disabled={isProcessing}
                                    >
                                        <span className="btn-main-txt">
                                            {isProcessing ? 'Unlocking Trial...' : 'Start 3-Day Free Trial'}
                                        </span>
                                        <span className="btn-sub-txt">
                                            ₦0.00 for 3 days • Then ₦2,400/mo
                                        </span>
                                    </button>
                                </div>
                            ) : (
                                /* ── CASE B: STANDARD CONTEXTUAL UPGRADE ── */
                                <div className="sheet-standard-upgrade">
                                    <div className="sheet-plans-grid">
                                        {SUBSCRIPTION_PLANS.map((plan) => {
                                            const isSelected = selectedPlanId === plan.id;
                                            return (
                                                <button
                                                    key={plan.id}
                                                    type="button"
                                                    className={`sheet-plan-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => setSelectedPlanId(plan.id)}
                                                >
                                                    {plan.tag && <span className="sheet-plan-badge">{plan.tag}</span>}
                                                    <span className="sheet-plan-name">{plan.name}</span>
                                                    <div className="sheet-plan-price">
                                                        <span className="rate-num">{plan.rate}</span>
                                                        <span className="rate-period">{plan.perPeriod}</span>
                                                    </div>
                                                    <span className="sheet-plan-total">{plan.totalLabel}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-sheet-primary-trial"
                                        onClick={handleStandardUpgrade}
                                        disabled={isProcessing}
                                    >
                                        <span className="btn-main-txt">
                                            {isProcessing ? 'Processing...' : `Upgrade to Elite — ${selectedPlan.rate} ${selectedPlan.perPeriod}`}
                                        </span>
                                        <span className="btn-sub-txt">
                                            Pay {selectedPlan.totalLabel} • Cancel anytime
                                        </span>
                                    </button>
                                </div>
                            )}

                            {/* Dismiss action */}
                            <button
                                type="button"
                                className="btn-sheet-dismiss"
                                onClick={handleDismiss}
                            >
                                No thanks, continue free
                            </button>

                            {/* Trust micro-strip */}
                            <div className="sheet-trust-strip">
                                <span>🔒 256-bit SSL</span>
                                <span>•</span>
                                <span>🛡️ Verified CBN / Google Play</span>
                                <span>•</span>
                                <span>⚡ 1-Tap Cancel</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
