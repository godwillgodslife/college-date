import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initializePaystack, createTransaction, completeTransaction, getSubscription, getWallet, payWithWallet, purchaseBoost, getActiveBoosts } from '../services/paymentService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import './PremiumUpgrade.css';

export default function PremiumUpgrade() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [wallet, setWallet] = useState(null);
    const [boostData, setBoostData] = useState({ hasBoosted: false, activeBoost: null, superSwipeCount: 0 });
    const [processingBoost, setProcessingBoost] = useState(null);
    const [expandedFeature, setExpandedFeature] = useState(null);

    useEffect(() => {
        if (currentUser) {
            loadSubscription();
            loadWallet();
            loadBoosts();
        }
    }, [currentUser]);

    async function loadWallet() {
        try {
            const { data } = await getWallet(currentUser.id);
            setWallet(data);
        } catch (err) {
            console.error('Error loading wallet:', err);
        }
    }

    async function loadBoosts() {
        try {
            const { data } = await getActiveBoosts(currentUser.id);
            setBoostData(data);
        } catch (err) {
            console.error('Error loading boosts:', err);
        }
    }

    async function loadSubscription() {
        setLoading(true);
        try {
            const { data, error } = await getSubscription(currentUser.id);
            if (error && error.code !== 'PGRST116') throw error;
            setSubscription(data);
        } catch (err) {
            console.error('Error loading subscription:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleSubscribe = async () => {
        setIsProcessing(true);
        try {
            const { data: tx, error: txError } = await createTransaction({
                user_id: currentUser.id,
                type: 'subscription',
                amount: 2900,
                status: 'pending',
                description: 'College Date Premium Subscription'
            });

            if (txError) throw txError;

            initializePaystack({
                public_key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                reference: `CD-SUB-${tx.id}`,
                amount: 2900,
                email: currentUser.email,
                metadata: {
                    user_id: currentUser.id,
                    transaction_id: tx.id,
                    type: 'subscription'
                },
                callback: async (response) => {
                    const { error: completeError } = await completeTransaction(
                        tx.id,
                        'success',
                        response.reference,
                        response
                    );

                    if (completeError) {
                        addToast('Payment successful but activation failed. Contact support.', 'error');
                    } else {
                        addToast('Welcome to Premium! Your features are now unlocked.', 'success');
                        loadSubscription();
                    }
                    setIsProcessing(false);
                },
                onClose: () => {
                    setIsProcessing(false);
                }
            });

        } catch (err) {
            console.error('Subscription error:', err);
            addToast(err.message, 'error');
            setIsProcessing(false);
        }
    };

    const handlePayWithWallet = async () => {
        if (!wallet || wallet.available_balance < 2900) {
            addToast('Insufficient wallet balance', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const { error } = await payWithWallet(
                currentUser.id,
                2900,
                'subscription',
                'College Date Premium Subscription'
            );

            if (error) throw error;

            addToast('Welcome to Premium! Paid via wallet balance.', 'success');
            loadSubscription();
            loadWallet();
        } catch (err) {
            console.error('Wallet payment error:', err);
            addToast(err.message || 'Payment failed', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePurchaseBoost = async (boostType) => {
        const label = boostType === '24h_boost' ? '24h Boost' : 'Super Swipe';
        const cost = boostType === '24h_boost' ? 1000 : 500;

        if (boostType === '24h_boost' && boostData.hasBoosted) {
            addToast('You already have an active 24h Boost!', 'warning');
            return;
        }

        setProcessingBoost(boostType);
        try {
            const { data, error } = await purchaseBoost(currentUser.id, boostType);

            if (error) {
                addToast(error, 'error');
                return;
            }

            addToast(`${label} purchased for ₦${cost.toLocaleString()}! 🎉`, 'success');
            loadWallet();
            loadBoosts();
        } catch (err) {
            console.error(`Error purchasing ${label}:`, err);
            addToast(err.message || 'Purchase failed', 'error');
        } finally {
            setProcessingBoost(null);
        }
    };

    function getBoostTimeRemaining() {
        if (!boostData.activeBoost) return null;
        const expiresAt = new Date(boostData.activeBoost.expires_at);
        const now = new Date();
        const diffMs = expiresAt - now;
        if (diffMs <= 0) return null;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    const toggleFeature = (id) => {
        setExpandedFeature(expandedFeature === id ? null : id);
    };

    if (loading) return <LoadingSpinner fullScreen />;

    const isPremium = subscription?.plan_type === 'Premium' && subscription?.status === 'active';
    const boostTimeRemaining = getBoostTimeRemaining();

    const premiumFeatures = [
        {
            id: 'unlimited',
            icon: '✨',
            title: 'Unlimited Swipes',
            short: 'No daily limits',
            detail: 'Free users get 10 swipes per day. Premium removes all limits — swipe as much as you want, anytime.'
        },
        {
            id: 'viewed',
            icon: '👀',
            title: 'Who Viewed Me',
            short: 'See your admirers',
            detail: 'See exactly who checked out your profile. Know who\'s interested before they even swipe — give yourself the advantage.'
        },
        {
            id: 'priority',
            icon: '🚀',
            title: 'Priority Discovery',
            short: 'Be seen first',
            detail: 'Your profile appears at the top of the stack for other users. More visibility = more matches. Simple.'
        },
        {
            id: 'filters',
            icon: '🎓',
            title: 'Advanced Filters',
            short: 'School, Course, Level',
            detail: 'Filter by specific university, department, and year level. Find exactly who you\'re looking for on campus.'
        },
        {
            id: 'weekly',
            icon: '⚡',
            title: 'Weekly Boost',
            short: '1 free boost every week',
            detail: 'Get a free 24h visibility boost every week — worth ₦1,000 each time. That\'s ₦4,000+ saved monthly.'
        },
        {
            id: 'badge',
            icon: '🛡️',
            title: 'Premium Badge',
            short: 'Stand out on campus',
            detail: 'A verified premium badge on your profile. Shows you\'re serious about connecting. Proven to increase match rate by 3x.'
        }
    ];

    return (
        <div className="premium-page animate-fade-in">
            {/* ── Social Proof Banner ── */}
            <div className="social-proof-banner">
                <span className="pulse-dot"></span>
                <p><strong>2,500+ students</strong> upgraded to Premium this week.</p>
            </div>

            <header className="premium-header">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="premium-badge-large"
                >
                    💎
                </motion.div>
                <h1>{isPremium ? 'You have the Elite Edge' : 'Unlock Your Full Potential'}</h1>
                <p className="premium-subtitle">Stop guessing. Start matching. Take control of your dating life on campus.</p>
            </header>

            {/* ── Premium vs Free Checklist (Loss Aversion) ── */}
            <div className="premium-comparison-box">
                <div className="comparison-header-row">
                    <div className="col-feature">Features</div>
                    <div className="col-free">Free</div>
                    <div className="col-premium">Premium</div>
                </div>
                <div className="comparison-body">
                    <div className="comparison-row">
                        <div className="col-feature">See who viewed you</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅</div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">Unlimited Swipes</div>
                        <div className="col-free">❌ <span>(10/day)</span></div>
                        <div className="col-premium">✅</div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">Priority Discovery Queue</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅ <span>(Top 10%)</span></div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">Advanced Filters (Course, Level)</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅</div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">Free Weekly Boost (₦1,000 value)</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅</div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">Premium Profile Badge</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅ <span>(+3x Matches)</span></div>
                    </div>
                </div>
            </div>

            {/* ── Premium Subscription Pricing ── */}
            <div className="premium-pricing-container">
                {isPremium ? (
                    <div className="active-subscription">
                        <div className="active-icon">🎉</div>
                        <h3>You are a Premium Member</h3>
                        <p>Your subscription is active until:</p>
                        <p className="expiry-date">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
                    </div>
                ) : (
                    <div className="pricing-box glass-panel">
                        <div className="ribbon-popular">Most Popular</div>
                        <div className="pricing-header">
                            <h3>Elite Plan</h3>
                            <p className="value-anchor">Less than ₦100 a day. Cheaper than lunch.</p>
                        </div>
                        <div className="price">
                            <span className="currency">₦</span>
                            <span className="amount">2,900</span>
                            <span className="period">/month</span>
                        </div>
                        <p className="billing-info">Billed monthly. Cancel anytime.</p>

                        <button
                            className="btn btn-primary btn-upgrade glow-effect"
                            onClick={handleSubscribe}
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Activating...' : 'Upgrade instantly via Card'}
                        </button>

                        {wallet?.available_balance >= 2900 && (
                            <button
                                className="btn btn-wallet-pay"
                                onClick={handlePayWithWallet}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Processing...' : `Pay from Wallet (Bal: ₦${wallet.available_balance.toLocaleString()})`}
                            </button>
                        )}

                        <div className="trust-badges">
                            <span className="shield">🛡️ Secure Payment via Paystack</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── One-Time Boosts ── */}
            <div className="microtransactions">
                <h2>⚡ Power-Ups</h2>
                <p className="boost-subtitle">Instant results. No subscription needed.</p>
                <div className="boost-grid">
                    <div className={`boost-item ${boostData.hasBoosted ? 'boost-active' : ''}`}>
                        <span className="boost-icon">🚀</span>
                        <h4>24h Visibility Boost</h4>
                        <p className="boost-desc">Jump to the top of everyone's feed for 24 hours.</p>
                        {boostData.hasBoosted && boostTimeRemaining ? (
                            <div className="boost-active-badge">
                                <span className="boost-pulse"></span>
                                Active — {boostTimeRemaining} left
                            </div>
                        ) : (
                            <button
                                className="btn btn-outline btn-boost"
                                onClick={() => handlePurchaseBoost('24h_boost')}
                                disabled={processingBoost === '24h_boost'}
                            >
                                {processingBoost === '24h_boost' ? 'Purchasing...' : 'Get Boost - ₦1,000'}
                            </button>
                        )}
                    </div>
                    <div className="boost-item">
                        <span className="boost-icon">⭐</span>
                        <h4>Super Swipe</h4>
                        <p className="boost-desc">Send an instant push notification that you like them.</p>
                        {boostData.superSwipeCount > 0 && (
                            <div className="super-swipe-count">
                                {boostData.superSwipeCount} remaining
                            </div>
                        )}
                        <button
                            className="btn btn-outline btn-boost"
                            onClick={() => handlePurchaseBoost('super_swipe')}
                            disabled={processingBoost === 'super_swipe'}
                        >
                            {processingBoost === 'super_swipe' ? 'Purchasing...' : 'Get 1 Credit - ₦500'}
                        </button>
                    </div>
                </div>
            </div>

            <footer className="support-footer">
                <p>Questions? <a href="https://wa.me/2349160264415?text=Hi%20👋%20I%20have%20a%20question%20about%20CollegeDate%20Premium" target="_blank" rel="noopener noreferrer">Chat with us</a></p>
            </footer>
        </div>
    );
}
