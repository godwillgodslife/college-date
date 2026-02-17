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
            <header className="premium-header">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="premium-badge-large"
                >
                    💎
                </motion.div>
                <h1>{isPremium ? 'You are Premium' : 'Upgrade to Premium'}</h1>
                <p>Unlock the full power of College Date</p>
            </header>

            {/* ── Swipe Types Comparison ── */}
            <div className="comparison-section">
                <h2>💡 How Swiping Works</h2>
                <p className="comparison-subtitle">Every right-swipe sends a connection request. Choose the power behind yours.</p>
                <div className="comparison-grid">
                    <motion.div className="comparison-card" whileHover={{ y: -4 }}>
                        <div className="comparison-tier">Standard</div>
                        <div className="comparison-price">₦500<span>/swipe</span></div>
                        <ul className="comparison-perks">
                            <li>✅ Send connection request</li>
                            <li>✅ They see you in their requests</li>
                            <li>❌ No notification sent</li>
                            <li>❌ Normal queue position</li>
                        </ul>
                    </motion.div>
                    <motion.div className="comparison-card comparison-popular" whileHover={{ y: -4 }}>
                        <div className="comparison-ribbon">MOST IMPACTFUL</div>
                        <div className="comparison-tier">Premium Swipe</div>
                        <div className="comparison-price">₦5,000<span>/swipe</span></div>
                        <ul className="comparison-perks">
                            <li>✅ Send connection request</li>
                            <li>✅ Attach a personal note</li>
                            <li>✅ Higher visibility in queue</li>
                            <li>✅ They see your note first</li>
                        </ul>
                    </motion.div>
                    <motion.div className="comparison-card comparison-star" whileHover={{ y: -4 }}>
                        <div className="comparison-tier">Super Swipe</div>
                        <div className="comparison-price">₦500<span>/credit</span></div>
                        <ul className="comparison-perks">
                            <li>✅ Send connection request</li>
                            <li>✅ <strong>Instant notification</strong></li>
                            <li>✅ Priority flag in their queue</li>
                            <li>✅ Buy credits, use anytime</li>
                        </ul>
                    </motion.div>
                </div>
            </div>

            {/* ── Premium Subscription ── */}
            <div className="premium-grid">
                <div className="premium-card">
                    <h3>Premium Subscription</h3>
                    <ul className="feature-list">
                        {premiumFeatures.map((f) => (
                            <li key={f.id} onClick={() => toggleFeature(f.id)} className={`feature-row ${expandedFeature === f.id ? 'expanded' : ''}`}>
                                <div className="feature-header">
                                    <span className="feature-icon-text">{f.icon}</span>
                                    <div className="feature-text">
                                        <strong>{f.title}</strong> — {f.short}
                                    </div>
                                    <span className="feature-chevron">{expandedFeature === f.id ? '▲' : '▼'}</span>
                                </div>
                                <AnimatePresence>
                                    {expandedFeature === f.id && (
                                        <motion.div
                                            className="feature-detail"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            {f.detail}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </li>
                        ))}
                    </ul>

                    {isPremium ? (
                        <div className="active-subscription">
                            <p>Your subscription is active until:</p>
                            <p className="expiry-date">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
                            <button className="btn btn-secondary" disabled>Premium Active</button>
                        </div>
                    ) : (
                        <div className="pricing-box">
                            <div className="price">
                                <span className="currency">₦</span>
                                <span className="amount">2,900</span>
                                <span className="period">/month</span>
                            </div>
                            <button
                                className="btn btn-primary btn-upgrade"
                                onClick={handleSubscribe}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Processing...' : 'Upgrade Now'}
                            </button>

                            {wallet?.available_balance >= 2900 && (
                                <button
                                    className="btn btn-outline btn-wallet-pay"
                                    onClick={handlePayWithWallet}
                                    disabled={isProcessing}
                                    style={{ marginTop: '0.75rem', width: '100%' }}
                                >
                                    {isProcessing ? 'Processing...' : `Pay with Wallet (₦${wallet.available_balance.toLocaleString()})`}
                                </button>
                            )}

                            <p className="secure-text">🔒 Secure payment via Paystack</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── One-Time Boosts ── */}
            <div className="microtransactions">
                <h2>⚡ One-Time Boosts</h2>
                <p className="boost-subtitle">No subscription needed. Buy once, use immediately. Deducted from your wallet balance.</p>
                <div className="boost-grid">
                    <div className={`boost-item ${boostData.hasBoosted ? 'boost-active' : ''}`}>
                        <span className="boost-icon">🚀</span>
                        <h4>24h Boost</h4>
                        <p className="boost-desc">Your profile gets <strong>2× visibility</strong> for 24 hours. Appear at the top of everyone's Discover feed on campus.</p>
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
                                {processingBoost === '24h_boost' ? 'Purchasing...' : '₦1,000'}
                            </button>
                        )}
                    </div>
                    <div className="boost-item">
                        <span className="boost-icon">⭐</span>
                        <h4>Super Swipe</h4>
                        <p className="boost-desc">They get an <strong>instant notification</strong> that someone wants to connect. Your swipe jumps to the top of their queue.</p>
                        {boostData.superSwipeCount > 0 && (
                            <div className="super-swipe-count">
                                {boostData.superSwipeCount} credit{boostData.superSwipeCount !== 1 ? 's' : ''} available
                            </div>
                        )}
                        <button
                            className="btn btn-outline btn-boost"
                            onClick={() => handlePurchaseBoost('super_swipe')}
                            disabled={processingBoost === 'super_swipe'}
                        >
                            {processingBoost === 'super_swipe' ? 'Purchasing...' : '₦500 / credit'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
