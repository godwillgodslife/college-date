import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PAYSTACK_PRODUCTS, getSubscription, getWallet, payWithWallet, purchaseBoost, getActiveBoosts, getRevenueCatPackages, purchaseRevenueCatPackage, startPaystackPayment, openHostedPaystackCheckout } from '../services/paymentService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { hasActivePremium } from '../utils/premium';
import { ContextualTip, AppGuideModal } from '../components/ContextualGuide';
import './PremiumUpgrade.css';

const isNative = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor !== undefined &&
        window.Capacitor.isNativePlatform();
};

const SUBSCRIPTION_TIERS = [
    {
        id: 'premium_monthly',
        productId: PAYSTACK_PRODUCTS.premiumMonthly,
        name: '1 Month',
        price: 2900,
        rateLabel: '₦2,900 / mo',
        totalLabel: '₦2,900 billed monthly',
        durationDays: 30,
        tag: null,
        savings: 0
    },
    {
        id: 'premium_3month',
        productId: PAYSTACK_PRODUCTS.premium3Month,
        name: '3 Months',
        price: 7200,
        rateLabel: '₦2,400 / mo',
        totalLabel: '₦7,200 billed quarterly',
        durationDays: 90,
        tag: '🔥 Most Popular',
        savings: 1500
    },
    {
        id: 'premium_annual',
        productId: PAYSTACK_PRODUCTS.premiumAnnual,
        name: '12 Months',
        price: 31800,
        rateLabel: '₦2,650 / mo',
        totalLabel: '₦31,800 billed yearly',
        durationDays: 365,
        tag: '👑 Best Value',
        savings: 3000
    }
];

export default function PremiumUpgrade() {
    const { currentUser, userProfile, fetchProfile } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [wallet, setWallet] = useState(null);
    const [boostData, setBoostData] = useState({ hasBoosted: false, activeBoost: null, superSwipeCount: 0 });
    const [processingBoost, setProcessingBoost] = useState(null);
    const [expandedFeature, setExpandedFeature] = useState(null);
    const [rcPackages, setRcPackages] = useState([]);
    const [selectedTierId, setSelectedTierId] = useState('premium_3month');

    const currentTier = SUBSCRIPTION_TIERS.find(t => t.id === selectedTierId) || SUBSCRIPTION_TIERS[1];

    useEffect(() => {
        if (!currentUser) return;

        async function initPageData() {
            setLoading(true);
            try {
                const promises = [
                    loadSubscription(false),
                    loadWallet(),
                    loadBoosts()
                ];
                if (isNative()) {
                    promises.push(loadRevenueCatOfferings());
                }
                await Promise.all(promises);
            } catch (err) {
                console.error('Error loading premium page metadata:', err);
            } finally {
                setLoading(false);
            }
        }

        initPageData();
    }, [currentUser]);

    async function loadRevenueCatOfferings() {
        const pkgs = await getRevenueCatPackages();
        if (pkgs && pkgs.length > 0) {
            setRcPackages(pkgs);
        }
    }

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

    async function loadSubscription(shouldSetLoadingState = true) {
        if (shouldSetLoadingState) setLoading(true);
        try {
            const { data, error } = await getSubscription(currentUser.id);
            if (error && error.code !== 'PGRST116') throw error;
            setSubscription(data);
        } catch (err) {
            console.error('Error loading subscription:', err);
        } finally {
            if (shouldSetLoadingState) setLoading(false);
        }
    }

    const handleSubscribe = async () => {
        if (isNative()) {
            await handleNativeSubscribe(currentTier);
        } else {
            await handleWebSubscribe(currentTier);
        }
    };

    const handleNativeSubscribe = async (tier = currentTier) => {
        if (rcPackages.length === 0) {
            console.warn('[PremiumUpgrade] No RevenueCat packages found, falling back to Paystack card checkout');
            await handleWebSubscribe(tier);
            return;
        }

        setIsProcessing(true);
        try {
            const pkgToBuy = rcPackages.find((pkg) => {
                const id = (pkg.identifier || '').toLowerCase();
                const prodId = (pkg.product?.identifier || '').toLowerCase();
                if (tier.id === 'premium_monthly') {
                    return id === '$rc_monthly' || id.includes('monthly') || prodId.includes('monthly');
                }
                if (tier.id === 'premium_3month') {
                    return id === '$rc_three_month' || id.includes('3month') || id.includes('quarterly') || prodId.includes('3month');
                }
                if (tier.id === 'premium_annual') {
                    return id === '$rc_annual' || id.includes('annual') || id.includes('yearly') || prodId.includes('annual');
                }
                return false;
            });

            if (!pkgToBuy) {
                console.warn('[PremiumUpgrade] No matching RevenueCat package found, falling back to Paystack card checkout');
                await handleWebSubscribe(tier);
                return;
            }

            const { success, error } = await purchaseRevenueCatPackage(pkgToBuy, {
                requiredEntitlement: 'Premium'
            });
            
            if (success) {
                addToast('Welcome to Premium! Your features are now unlocked.', 'success');
                loadSubscription();
                fetchProfile(currentUser.id);
            } else {
                console.warn('[PremiumUpgrade] Native purchase fallback:', error);
                addToast('Redirecting to secure card checkout...', 'info');
                await handleWebSubscribe(tier);
            }
        } catch (err) {
            console.warn('[PremiumUpgrade] Native purchase exception, falling back to Paystack:', err);
            if (!err.userCancelled) {
                addToast('Opening secure card checkout...', 'info');
                await handleWebSubscribe(tier);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleWebSubscribe = async (tier = currentTier) => {
        setIsProcessing(true);
        try {
            const { data: payment, error } = await startPaystackPayment(tier.productId);
            if (error) throw new Error(error);
            openHostedPaystackCheckout(payment);
        } catch (err) {
            console.error('Subscription error:', err);
            addToast(err.message, 'error');
            setIsProcessing(false);
        }
    };

    const handlePayWithWallet = async () => {
        const tier = currentTier;
        if (!wallet || wallet.available_balance < tier.price) {
            addToast(`Insufficient wallet balance. Required: ₦${tier.price.toLocaleString()}`, 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const { error } = await payWithWallet(
                currentUser.id,
                tier.price,
                'subscription',
                `College Date Premium (${tier.name})`,
                tier.productId
            );

            if (error) throw error;

            addToast(`Welcome to Premium! Paid ₦${tier.price.toLocaleString()} via wallet balance.`, 'success');
            loadSubscription();
            fetchProfile(currentUser.id);
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
        const productId = boostType === '24h_boost' ? PAYSTACK_PRODUCTS.boost24h : PAYSTACK_PRODUCTS.superSwipe;

        if (boostType === '24h_boost' && boostData.hasBoosted) {
            addToast('You already have an active 24h Boost!', 'warning');
            return;
        }

        setProcessingBoost(boostType);
        
        try {
            if (wallet && wallet.available_balance >= cost) {
                const { error } = await purchaseBoost(currentUser.id, boostType);
                if (error) {
                    addToast(error, 'error');
                    return;
                }
                addToast(`${label} purchased from wallet balance! 🎉`, 'success');
                loadWallet();
                loadBoosts();
                return;
            }

            addToast(`Opening checkout for ${label}...`, 'info');
            const { data: payment, error: initError } = await startPaystackPayment(productId);
            if (initError || !payment) {
                throw new Error(initError || 'Could not initiate payment.');
            }

            await openHostedPaystackCheckout(payment, {
                onClose: () => {
                    loadWallet();
                    loadBoosts();
                }
            });
        } catch (err) {
            if (!err.userCancelled) {
                console.error(`Error purchasing ${label}:`, err);
                addToast(err.message || 'Purchase failed', 'error');
            }
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

    const isPremium = hasActivePremium(userProfile) || hasActivePremium(subscription);
    const boostTimeRemaining = getBoostTimeRemaining();

    const premiumFeatures = [
        {
            id: 'unlimited',
            icon: '✨',
            title: 'Unlimited Swipes',
            short: 'No daily limits',
            detail: 'Free users get 20 free swipes per day. Premium removes all limits — swipe as much as you want, anytime.'
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
            icon: '👑',
            title: 'Premium Crown Badge',
            short: 'Stand out on campus',
            detail: 'A verified premium crown badge on your profile. Shows you\'re serious about connecting. Proven to increase match rate by 3x.'
        },
        {
            id: 'video_profile',
            icon: '🎬',
            title: '10s Video Profile',
            short: 'Dynamic video showcase',
            detail: 'Upload an authentic 10-second live video showcase on your profile. Attract students with your real voice, smile, and energy.'
        },
        {
            id: 'chat_video',
            icon: '📹',
            title: '10s Daily Chat Video',
            short: 'Real moments in DM',
            detail: 'Share 10-second video clips directly in chat once per day. Build immediate trust without leaving the platform.'
        },
        {
            id: 'incognito',
            icon: '🕵️',
            title: 'Incognito Ghost Mode',
            short: 'Private campus browsing',
            detail: 'Browse student profiles completely invisible. Check out campus crushes without showing up in their view history.'
        },
        {
            id: 'chat_vibes',
            icon: '⚡',
            title: 'Direct Chat Vibes',
            short: 'Skip the match queue',
            detail: 'Send instant Paid Chat Vibes to start conversations right away, even before mutual match confirmation.'
        },
        {
            id: 'hd_calls',
            icon: '📞',
            title: 'Unlimited HD Calling',
            short: 'Voice & Video calls',
            detail: 'Enjoy unlimited crystal-clear Agora RTC voice and video calls with verified students across any Nigerian campus.'
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
                <ContextualTip
                    featureId="premium_benefits"
                    onLearnMore={() => setGuideModalOpen(true)}
                />
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
                        <div className="col-feature">Unlimited Swipes</div>
                        <div className="col-free">❌ <span>(20/day)</span></div>
                        <div className="col-premium">✅ <span>Unlimited</span></div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">See who viewed you</div>
                        <div className="col-free">❌ <span>(Blurred)</span></div>
                        <div className="col-premium">✅ <span>Full Clarity</span></div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">Priority Discovery Queue</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅ <span>(Top 10%)</span></div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">Advanced Filters (Dept, Level)</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅</div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">Free Weekly Boost (₦1,000 value)</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅ <span>(Every 7d)</span></div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">👑 Premium Crown Badge</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅ <span>(+3x Matches)</span></div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">🎬 10s Profile Video Showcase</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅ <span>Live Video</span></div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">📹 10s Daily Chat Video Moments</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅ <span>1 Video/Day</span></div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">🕵️ Incognito Ghost Browsing</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅ <span>Invisible</span></div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">⚡ Direct Paid Chat Vibes</div>
                        <div className="col-free">❌</div>
                        <div className="col-premium">✅ <span>Skip Queue</span></div>
                    </div>
                    <div className="comparison-row">
                        <div className="col-feature">📞 Unlimited HD Audio/Video Calls</div>
                        <div className="col-free">❌ <span>(5m limit)</span></div>
                        <div className="col-premium">✅ <span>Unlimited</span></div>
                    </div>
                </div>
            </div>

            {/* ── Premium Subscription Pricing ── */}
            <div className="premium-pricing-container">
                {isPremium && (
                    <div className="active-subscription">
                        <div className="active-icon">🎉</div>
                        <h3>You are a Premium Member</h3>
                        <p>Your subscription is active{subscription?.current_period_end ? ` until: ${new Date(subscription.current_period_end).toLocaleDateString()}` : '.'}</p>
                        <p className="extend-sub-note" style={{ fontSize: '0.85rem', color: '#a78bfa', marginTop: '0.5rem' }}>
                            Extend or renew your membership below with student savings:
                        </p>
                    </div>
                )}
                <div className="pricing-box glass-panel">
                    {currentTier.tag && <div className="ribbon-popular">{currentTier.tag}</div>}
                    
                    {/* ── 3-Duration Subscription Switcher ── */}
                    <div className="subscription-tiers-grid">
                        {SUBSCRIPTION_TIERS.map((tier) => {
                            const isSelected = selectedTierId === tier.id;
                            return (
                                <button
                                    key={tier.id}
                                    type="button"
                                    className={`tier-card-selector ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedTierId(tier.id)}
                                >
                                    {tier.savings > 0 && (
                                        <span className="tier-savings-badge">
                                            Save ₦{tier.savings.toLocaleString()}
                                        </span>
                                    )}
                                    <span className="tier-duration-title">{tier.name}</span>
                                    <span className="tier-rate-tag">{tier.rateLabel}</span>
                                    <span className="tier-total-sub">{tier.totalLabel}</span>
                                    <span className="tier-radio-icon">{isSelected ? '◉' : '○'}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="pricing-header" style={{ marginTop: '1.5rem' }}>
                        <h3>{currentTier.name} Elite Plan</h3>
                        <p className="value-anchor">
                            {currentTier.savings > 0 
                                ? `Save ₦${currentTier.savings.toLocaleString()} on this plan!` 
                                : 'Less than ₦100 a day. Cheaper than lunch.'}
                        </p>
                    </div>

                    <div className="price">
                        <span className="currency">₦</span>
                        <span className="amount">{currentTier.price.toLocaleString()}</span>
                        <span className="period">/{currentTier.name.toLowerCase()}</span>
                    </div>
                    <p className="billing-info">{currentTier.totalLabel}. Cancel anytime.</p>

                    <button
                        className="btn btn-primary btn-upgrade glow-effect"
                        onClick={handleSubscribe}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Activating...' : isPremium ? `Extend for ₦${currentTier.price.toLocaleString()}` : `Upgrade for ₦${currentTier.price.toLocaleString()}`}
                    </button>

                        {wallet?.available_balance >= currentTier.price ? (
                            <button
                                className="btn btn-wallet-pay"
                                onClick={handlePayWithWallet}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Processing...' : `Pay ₦${currentTier.price.toLocaleString()} from Wallet (Bal: ₦${wallet.available_balance.toLocaleString()})`}
                            </button>
                        ) : (
                            <p className="wallet-balance-note" style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                                Wallet Balance: ₦{wallet?.available_balance?.toLocaleString() || 0} (Fund wallet to pay with balance)
                            </p>
                        )}

                        <div className="trust-badges">
                            <span className="shield">🛡️ Secure Payment via Paystack / Google Play</span>
                        </div>
                    </div>
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

            <AppGuideModal
                isOpen={guideModalOpen}
                onClose={() => setGuideModalOpen(false)}
                initialFeatureId="premium_benefits"
            />
        </div>
    );
}
